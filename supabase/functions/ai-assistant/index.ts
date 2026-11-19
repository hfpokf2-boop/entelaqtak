import { createClient } from "npm:@supabase/supabase-js@2";

const allowedTools = new Set(["ideas", "script", "content_pack", "titles", "seo", "repurpose"]);
const allowedOrigins = new Set(["https://sasa-antilaqatuk.github.io", "https://hfpokf2-boop.github.io"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const instructions: Record<string, string> = {
  ideas: "اقترح أفكارًا مبتكرة ومتنوعة تناسب المجال والمنصة والجمهور. لكل فكرة اكتب عنوانًا وزاوية تناول وخطافًا. تجنب تكرار الفكرة نفسها.",
  script: "اكتب مسودة سكريبت عربية طبيعية فيها خطاف افتتاحي وتمهيد ومحاور واضحة وأمثلة قابلة للتحقق وخاتمة مع سؤال للجمهور. لا تخترع حقائق.",
  content_pack: "أنشئ حزمة محتوى: الفكرة والخطاف و5 عناوين صادقة وسكريبت ووصف وكلمات مفتاحية وهاشتاجات وفكرة صورة مصغرة وقائمة لقطات. نظّم الإجابة بعناوين.",
  titles: "اقترح عناوين جذابة وواضحة وغير مضللة، ثم وصفًا لتصميم صورة مصغرة يعبر فعلًا عن المحتوى.",
  seo: "اكتب وصفًا طبيعيًا وكلمات مفتاحية مرتبطة فعلًا بالموضوع وهاشتاجات محدودة. لا تدّعِ أنها ترند أو ذات حجم بحث مثبت.",
  repurpose: "حوّل المادة إلى الصيغة والمنصة المطلوبة مع الحفاظ على الحقائق والمعنى. لا تضف ادعاءات غير موجودة في المصدر.",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply({ error: "يلزم تسجيل الدخول." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-6-luna";

  if (!supabaseUrl || !publishableKey) return reply({ error: "إعدادات Supabase غير مكتملة على الخادم." }, 503);
  if (!openAiKey) return reply({ error: "لم يتم إعداد مفتاح الذكاء الاصطناعي على الخادم بعد." }, 503);

  try {
    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return reply({ error: "انتهت جلسة الدخول. سجّل الدخول مرة أخرى." }, 401);

    const body = await req.json();
    const tool = typeof body?.tool === "string" ? body.tool : "";
    const payload = body?.payload;

    if (!allowedTools.has(tool)) return reply({ error: "الأداة المطلوبة غير مدعومة." }, 400);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return reply({ error: "بيانات الطلب غير صحيحة." }, 400);
    }

    const serialized = JSON.stringify(payload);
    if (serialized.length < 2 || serialized.length > 12000) {
      return reply({ error: "حجم النص يجب أن يكون بين 1 و12,000 حرف/رمز JSON." }, 400);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id)
      .gte("created_at", since);

    if (countError) {
      console.error("AI usage count error", countError);
      return reply({ error: "تعذر التحقق من حد الاستخدام. حاول لاحقًا." }, 503);
    }
    if ((count ?? 0) >= 60) return reply({ error: "وصلت إلى حد 60 طلبًا يوميًا لهذا الحساب." }, 429);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
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

    const result = await response.json();
    if (!response.ok) {
      console.error("OpenAI API error", response.status, result?.error?.type ?? "unknown");
      return reply({ error: "تعذر توليد المحتوى. راجع مفتاح API والنموذج وإعدادات الفوترة." }, 502);
    }

    const text = typeof result.output_text === "string"
      ? result.output_text
      : (result.output ?? [])
          .flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
          .filter((part: any) => part.type === "output_text" && typeof part.text === "string")
          .map((part: any) => part.text)
          .join("\n")
          .trim();

    if (!text) return reply({ error: "لم يصل نص من خدمة الذكاء الاصطناعي." }, 502);

    const { error: insertError } = await supabase.from("ai_usage").insert({
      user_id: userData.user.id,
      tool,
      input_chars: serialized.length,
    });
    if (insertError) console.error("AI usage insert error", insertError);

    return reply({ text, model });
  } catch (error) {
    console.error("ai-assistant failed", error);
    return reply({ error: "حدث خطأ غير متوقع أثناء توليد المحتوى." }, 500);
  }
});
