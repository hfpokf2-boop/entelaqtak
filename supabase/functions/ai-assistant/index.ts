import { withSupabase } from "npm:@supabase/server@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedTools = new Set([
  "ideas",
  "script",
  "content_pack",
  "titles",
  "seo",
  "repurpose",
]);

const toolBriefs: Record<string, string> = {
  ideas: "اقترح أفكار محتوى مبتكرة ومتنوعة تناسب المجال والمنصة والجمهور. أعطِ عنوانًا، زاوية تناول، وخطافًا لكل فكرة.",
  script: "اكتب مسودة سكريبت عربية طبيعية فيها خطاف افتتاحي، تمهيد، محاور واضحة، أمثلة مواضعها محددة، وخاتمة مع سؤال للجمهور. لا تخترع حقائق.",
  content_pack: "أنشئ حزمة محتوى متكاملة: الفكرة، الخطاف، 5 عناوين صادقة، سكريبت، وصف، كلمات مفتاحية وهاشتاجات، تصور للصورة المصغرة، وقائمة لقطات.",
  titles: "اقترح عناوين واضحة وجذابة وغير مضللة، ثم وصفًا لتصميم صورة مصغرة يعبر فعلًا عن المحتوى.",
  seo: "اكتب وصفًا طبيعيًا، كلمات مفتاحية مرتبطة فعلًا بالموضوع، وهاشتاجات محدودة وذات صلة. لا تدّعِ أنها كلمات رائجة أو ذات حجم بحث مثبت.",
  repurpose: "حوّل المادة إلى الصيغة والمنصة المطلوبة مع الحفاظ على الحقائق والمعنى. أنشئ خطافًا وبنية مناسبة للمنصة، ولا تضف ادعاءات غير موجودة في المصدر.",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: any) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      const body = await req.json();
      const tool = typeof body?.tool === "string" ? body.tool : "";
      const payload = body?.payload;

      if (!allowedTools.has(tool)) return json({ error: "الأداة المطلوبة غير مدعومة." }, 400);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json({ error: "بيانات الطلب غير صحيحة." }, 400);
      }

      const serialized = JSON.stringify(payload);
      if (serialized.length < 2 || serialized.length > 12000) {
        return json({ error: "حجم النص كبير جدًا أو فارغ. اختصر المحتوى وحاول مرة أخرى." }, 400);
      }

      const userId = ctx.userClaims?.sub;
      if (!userId) return json({ error: "يلزم تسجيل الدخول لاستخدام المساعد الذكي." }, 401);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: usageReadError } = await ctx.supabase
        .from("ai_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since);

      if (usageReadError) {
        console.error("usage read failed", usageReadError);
        return json({ error: "تعذر التحقق من حد الاستخدام. حاول لاحقًا." }, 503);
      }
      if ((count ?? 0) >= 60) {
        return json({ error: "وصلت إلى الحد التجريبي اليومي: 60 طلبًا. حاول غدًا." }, 429);
      }

      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) return json({ error: "لم يتم إعداد مفتاح الذكاء الاصطناعي على الخادم بعد." }, 503);
      const model = Deno.env.get("OPENAI_MODEL") || "gpt-6-luna";

      const aiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions: [
            "أنت مساعد متخصص لصناع المحتوى باللغة العربية.",
            "اكتب بلهجة عربية سهلة ومفهومة، وكن دقيقًا ولا تختلق معلومات أو أرقامًا أو مصادر.",
            "التزم ببيانات المستخدم ولا تضف وعودًا مضللة أو عناوين clickbait كاذبة.",
            toolBriefs[tool],
            "أخرج إجابة منظمة بعناوين واضحة ونص جاهز للتحرير. لا تذكر أنك نظام ذكاء اصطناعي إلا إذا سُئلت.",
          ].join("\n"),
          input: serialized,
          max_output_tokens: 1800,
        }),
      });

      const result = await aiResponse.json();
      if (!aiResponse.ok) {
        console.error("OpenAI request failed", aiResponse.status, result?.error?.type);
        return json({ error: "تعذر توليد المحتوى الآن. راجع إعدادات مزود الذكاء الاصطناعي وحاول لاحقًا." }, 502);
      }

      const text = typeof result.output_text === "string"
        ? result.output_text
        : (result.output ?? [])
            .flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
            .filter((part: any) => part.type === "output_text" && typeof part.text === "string")
            .map((part: any) => part.text)
            .join("\n")
            .trim();

      if (!text) return json({ error: "لم يصل نص من خدمة الذكاء الاصطناعي. حاول مرة أخرى." }, 502);

      const { error: usageInsertError } = await ctx.supabase.from("ai_usage").insert({
        user_id: userId,
        tool,
        input_chars: serialized.length,
      });
      if (usageInsertError) console.error("usage insert failed", usageInsertError);

      return json({ text, model });
    } catch (error) {
      console.error("ai-assistant error", error);
      return json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى." }, 500);
    }
  }),
};
