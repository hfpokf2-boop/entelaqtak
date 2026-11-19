import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedTools = new Set(["ideas", "script", "content_pack", "titles", "seo", "repurpose", "assistant"]);
const allowedOrigins = new Set([
  "https://sasa-antilaqatuk.github.io",
  "https://hfpokf2-boop.github.io",
]);
const WINDOW_MS = 15 * 60 * 1000;
const REQUEST_LIMIT = 5;
const requestHits = new Map<string, { count: number; resetAt: number }>();
const trackedTools = new Set(["ideas", "script", "content_pack", "titles", "seo", "repurpose"]);

const instructions: Record<string, string> = {
  ideas: "اقترح أفكارًا مبتكرة ومتنوعة تناسب المجال والمنصة والجمهور. لكل فكرة اكتب عنوانًا وزاوية تناول وخطافًا. تجنب تكرار الفكرة نفسها.",
  script: "اكتب مسودة سكريبت عربية طبيعية فيها خطاف افتتاحي وتمهيد ومحاور واضحة وأمثلة قابلة للتحقق وخاتمة مع سؤال للجمهور. لا تخترع حقائق.",
  content_pack: "أنشئ حزمة محتوى: الفكرة والخطاف و5 عناوين صادقة وسكريبت ووصف وكلمات مفتاحية وهاشتاجات وفكرة صورة مصغرة وقائمة لقطات. نظّم الإجابة بعناوين.",
  titles: "اقترح عناوين جذابة وواضحة وغير مضللة، ثم وصفًا لتصميم صورة مصغرة يعبر فعلًا عن المحتوى.",
  seo: "اكتب وصفًا طبيعيًا وكلمات مفتاحية مرتبطة فعلًا بالموضوع وهاشتاجات محدودة. لا تدّعِ أنها ترند أو ذات حجم بحث مثبت.",
  repurpose: "حوّل المادة إلى الصيغة والمنصة المطلوبة مع الحفاظ على الحقائق والمعنى. لا تضف ادعاءات غير موجودة في المصدر.",
  assistant: "حلّل ملف صانع المحتوى والأفكار والحزم ومؤشرات الأداء المقدمة. أعطِ توصيات عملية مرتبة حسب الأولوية، واشرح سبب كل توصية بالاستناد إلى البيانات المتاحة. لا تخترع أرقامًا أو نتائج أو ترندات.",
};

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

function reply(
  body: unknown,
  status = 200,
  origin = "https://sasa-antilaqatuk.github.io",
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

async function hashKey(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function cleanExpiredBuckets(now: number) {
  if (requestHits.size < 1000) return;
  for (const [key, value] of requestHits.entries()) {
    if (value.resetAt <= now) requestHits.delete(key);
  }
}

async function resolveUser(
  authorization: string | null,
  apiKey: string,
  origin: string,
): Promise<{ userId: string | null; error: Response | null }> {
  if (!authorization) return { userId: null, error: null };
  if (!authorization.startsWith("Bearer ")) {
    return { userId: null, error: reply({ error: "صيغة جلسة الحساب غير صحيحة." }, 401, origin) };
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  if (!projectUrl || !apiKey) {
    return { userId: null, error: reply({ error: "تعذر التحقق من جلسة الحساب حاليًا." }, 503, origin) };
  }

  try {
    const response = await fetch(projectUrl.replace(/\/$/, "") + "/auth/v1/user", {
      method: "GET",
      headers: { apikey: apiKey, Authorization: authorization },
    });
    const user = await response.json().catch(() => ({}));
    if (!response.ok || typeof user?.id !== "string") {
      return { userId: null, error: reply({ error: "انتهت جلسة الحساب. سجّل الدخول مرة أخرى ثم أعد المحاولة." }, 401, origin) };
    }
    return { userId: user.id, error: null };
  } catch {
    return { userId: null, error: reply({ error: "تعذر التحقق من جلسة الحساب بسبب مشكلة اتصال." }, 503, origin) };
  }
}

async function countRecentUsage(
  projectUrl: string | undefined,
  apiKey: string,
  authorization: string | null,
  userId: string | null,
): Promise<number | null> {
  if (!projectUrl || !authorization || !userId) return null;
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
  const url = projectUrl.replace(/\/$/, "") + "/rest/v1/ai_usage?select=id&user_id=eq." +
    encodeURIComponent(userId) + "&created_at=gte." + encodeURIComponent(cutoff) + "&limit=6";
  try {
    const response = await fetch(url, {
      headers: { apikey: apiKey, Authorization: authorization },
    });
    if (!response.ok) {
      console.warn("AI usage quota lookup failed", response.status);
      return null;
    }
    const rows = await response.json().catch(() => null);
    return Array.isArray(rows) ? rows.length : null;
  } catch {
    console.warn("AI usage quota lookup unavailable");
    return null;
  }
}

async function recordUsage(
  projectUrl: string | undefined,
  apiKey: string,
  authorization: string | null,
  userId: string | null,
  tool: string,
  inputChars: number,
) {
  if (!projectUrl || !authorization || !userId) return;
  try {
    const response = await fetch(projectUrl.replace(/\/$/, "") + "/rest/v1/ai_usage", {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: authorization,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ user_id: userId, tool, input_chars: inputChars }),
    });
    if (!response.ok) console.warn("AI usage logging failed", response.status);
  } catch {
    console.warn("AI usage logging unavailable");
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);

  const apiKey = req.headers.get("apikey") ?? "";
  const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeysRaw) {
    try {
      const keys = JSON.parse(publishableKeysRaw);
      if (apiKey !== keys.default) return reply({ error: "تعذر التحقق من إعداد الاتصال." }, 401, origin);
    } catch {
      return reply({ error: "إعدادات الاتصال بالخادم غير مكتملة." }, 503, origin);
    }
  }

  const authorization = req.headers.get("authorization");
  const auth = await resolveUser(authorization, apiKey, origin);
  if (auth.error) return auth.error;

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return reply({ error: "تعذر قراءة بيانات الطلب." }, 400, origin);
  }
  if (new TextEncoder().encode(rawBody).byteLength > 24000) {
    return reply({ error: "حجم الطلب أكبر من الحد المسموح." }, 413, origin);
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return reply({ error: "صيغة الطلب غير صحيحة." }, 400, origin);
  }

  const tool = typeof body?.tool === "string" ? body.tool : "";
  const payload = body?.payload;
  if (!allowedTools.has(tool)) return reply({ error: "الأداة المطلوبة غير مدعومة." }, 400, origin);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply({ error: "بيانات الطلب غير صحيحة." }, 400, origin);
  }

  const serialized = JSON.stringify(payload);
  const inputChars = serialized.length;
  if (inputChars < 2 || inputChars > 12000 || new TextEncoder().encode(serialized).byteLength > 24000) {
    return reply({ error: "حجم المدخلات يجب ألا يتجاوز 12,000 حرف." }, 400, origin);
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const persistedUsage = auth.userId && trackedTools.has(tool)
    ? await countRecentUsage(projectUrl, apiKey, authorization, auth.userId)
    : null;
  if (persistedUsage !== null && persistedUsage >= REQUEST_LIMIT) {
    return reply(
      { error: "وصلت للحد المؤقت من طلبات المساعد على حسابك. حاول بعد 15 دقيقة." },
      429,
      origin,
      { "Retry-After": "900", "X-RateLimit-Limit": String(REQUEST_LIMIT), "X-RateLimit-Remaining": "0" },
    );
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  const rateIdentity = auth.userId ? "user:" + auth.userId : "ip:" + ip;
  const rateKey = await hashKey(rateIdentity);
  const now = Date.now();
  cleanExpiredBuckets(now);
  const bucket = requestHits.get(rateKey);

  if (!bucket || bucket.resetAt <= now) {
    requestHits.set(rateKey, { count: 1, resetAt: now + WINDOW_MS });
  } else if (bucket.count >= REQUEST_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return reply(
      { error: "وصلت للحد المؤقت من الطلبات. حاول بعد 15 دقيقة." },
      429,
      origin,
      { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(REQUEST_LIMIT), "X-RateLimit-Remaining": "0" },
    );
  } else {
    bucket.count++;
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) return reply({ error: "الخدمة تحتاج إعداد مفتاح الذكاء الاصطناعي على الخادم." }, 503, origin);

  const model = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-6-luna";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openAiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        instructions: [
          "أنت مساعد متخصص لصناع المحتوى باللغة العربية.",
          "اكتب بلغة طبيعية واضحة، وكن دقيقًا ولا تختلق معلومات أو أرقامًا أو مصادر.",
          "التزم ببيانات المستخدم ولا تضف وعودًا مضللة أو عناوين كاذبة.",
          instructions[tool],
          "قدّم الإجابة في أقسام قصيرة وواضحة قابلة للتحرير.",
        ].join("\n"),
        input: serialized,
        max_output_tokens: 1800,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("OpenAI API error", response.status, result?.error?.type ?? "unknown");
      if (response.status === 429) {
        return reply({ error: "الخدمة مشغولة أو رصيد API غير كافٍ. حاول لاحقًا." }, 429, origin);
      }
      return reply(
        { error: response.status === 401 ? "تعذر التحقق من مفتاح الخدمة المحفوظ على الخادم." : "تعذر توليد المحتوى حاليًا. حاول مرة أخرى." },
        502,
        origin,
      );
    }

    const text = typeof result.output_text === "string"
      ? result.output_text.trim()
      : (result.output ?? [])
          .flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
          .filter((part: any) => part.type === "output_text" && typeof part.text === "string")
          .map((part: any) => part.text)
          .join("\n")
          .trim();

    if (!text) return reply({ error: "لم يصل نص من خدمة الذكاء الاصطناعي." }, 502, origin);

    await recordUsage(projectUrl, apiKey, authorization, auth.userId, tool, inputChars);

    const currentBucket = requestHits.get(rateKey);
    const remaining = currentBucket ? Math.max(0, REQUEST_LIMIT - currentBucket.count) : 0;
    return reply(
      { text, model: result.model ?? model },
      200,
      origin,
      { "X-RateLimit-Limit": String(REQUEST_LIMIT), "X-RateLimit-Remaining": String(remaining) },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return reply({ error: "استغرق التوليد وقتًا أطول من اللازم. حاول مرة أخرى." }, 504, origin);
    }
    console.error("ai-assistant failed", error instanceof Error ? error.message : "unknown");
    return reply({ error: "حدث خطأ غير متوقع أثناء توليد المحتوى." }, 500, origin);
  } finally {
    clearTimeout(timer);
  }
});