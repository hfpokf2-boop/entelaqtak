const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sasa-antilaqatuk.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_GENERATIONS_PER_WINDOW = 5;
const MAX_TEXT_LENGTH = 5000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function getUserIdFromValidatedJwt(req: Request): string | null {
  // The Supabase gateway validates the JWT before this handler runs.
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded));
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

function consumeGeneration(userId: string): boolean {
  const now = Date.now();
  const bucket = requestBuckets.get(userId);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_GENERATIONS_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin !== "https://sasa-antilaqatuk.github.io") return json({ error: "Origin not allowed" }, 403);

  const userId = getUserIdFromValidatedJwt(req);
  if (!userId) return json({ error: "سجّل الدخول أولًا لاستخدام استوديو الصوت." }, 401);

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return json({ error: "لم يتم إعداد مفتاح ElevenLabs على الخادم بعد. أضف ELEVENLABS_API_KEY في Supabase Secrets." }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بيانات الطلب غير صالحة." }, 400);
  }

  if (body.action === "voices") {
    try {
      const response = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100&include_total_count=true", {
        headers: { "xi-api-key": apiKey, "Accept": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data.detail;
        const message = typeof detail === "string" ? detail :
          typeof detail?.message === "string" ? detail.message :
          "تعذر تحميل الأصوات من حساب ElevenLabs.";
        return json({ error: message }, response.status === 401 ? 502 : response.status);
      }
      const voices = Array.isArray(data.voices) ? data.voices.map((voice: Record<string, unknown>) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        labels: voice.labels,
        preview_url: voice.preview_url,
      })).filter((voice: Record<string, unknown>) => typeof voice.voice_id === "string" && typeof voice.name === "string") : [];
      return json({ voices, has_more: !!data.has_more });
    } catch (error) {
      console.error("ElevenLabs voice list failed:", error);
      return json({ error: "تعذر الاتصال بخدمة ElevenLabs. حاول مرة أخرى." }, 502);
    }
  }

  if (body.action !== "generate") return json({ error: "الإجراء المطلوب غير مدعوم." }, 400);

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : "";
  if (!text) return json({ error: "اكتب النص المراد تحويله أولًا." }, 400);
  if (text.length > MAX_TEXT_LENGTH) return json({ error: "الحد الأقصى للنص هو 5000 حرف في الطلب الواحد." }, 413);
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(voiceId)) return json({ error: "Voice ID غير صالح." }, 400);
  if (!consumeGeneration(userId)) {
    return json({ error: "وصلت للحد المؤقت: 5 عمليات توليد كل 15 دقيقة لهذا الحساب. حاول لاحقًا." }, 429);
  }

  const supplied = (body.voice_settings && typeof body.voice_settings === "object" ? body.voice_settings : {}) as Record<string, unknown>;
  const voiceSettings = {
    stability: clamp(supplied.stability, 0.5, 0, 1),
    similarity_boost: clamp(supplied.similarity_boost, 0.75, 0, 1),
    style: clamp(supplied.style, 0, 0, 1),
    speed: clamp(supplied.speed, 1, 0.7, 1.2),
    use_speaker_boost: supplied.use_speaker_boost !== false,
  };

  try {
    const url = "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voiceId) + "/stream?output_format=mp3_44100_128";
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: voiceSettings }),
    });

    if (!upstream.ok) {
      const details = await upstream.json().catch(() => ({}));
      const detail = details.detail;
      const message = typeof detail === "string" ? detail :
        typeof detail?.message === "string" ? detail.message :
        typeof details.message === "string" ? details.message :
        "تعذر توليد الصوت. راجع صلاحيات API والرصيد والصوت المختار.";
      return json({ error: message }, upstream.status === 401 ? 502 : upstream.status);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
        "Content-Disposition": 'attachment; filename="entelaqtak-voice.mp3"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("ElevenLabs speech generation failed:", error);
    return json({ error: "حدث خطأ أثناء إنشاء الصوت. جرّب نصًا أقصر." }, 502);
  }
});
