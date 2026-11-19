# انطلاقتك — استوديو صُنّاع المحتوى

الموقع العربي: https://hfpokf2-boop.github.io/entelaqtak/

## الواجهة الحالية
- تصميم RTL متجاوب وهوية خضراء/ذهبية.
- مولّد أفكار، استوديو محتوى، إعادة تدوير المحتوى، سكريبت، عناوين، SEO.
- تقويم نشر، متابعة أداء، وتحدي 30 يوم.
- في الوضع الحالي، التخزين محلي عبر localStorage وبعض الأدوات تعمل بقوالب محلية.

## بنية الخادم المجهزة
- Supabase Auth لحسابات البريد وكلمة المرور.
- Supabase Postgres: profiles وuser_workspaces وai_usage مع Row Level Security.
- Supabase Edge Function: ai-assistant (تتطلب مستخدمًا مسجل الدخول).
- OpenAI Responses API للمحتوى الذكي، عبر مفتاح محفوظ في Supabase Secrets وليس في المتصفح.

## إعداد Supabase
1. أنشئ مشروعًا في Supabase، ثم طبّق ملف SQL: `supabase/migrations/202611190001_initial_schema.sql`.
2. اضبط أسرار Edge Function: `OPENAI_API_KEY` (من حساب OpenAI Platform) ويمكن تعديل `OPENAI_MODEL`، والقيمة الافتراضية `gpt-6-luna`.
3. انشر وظيفة `supabase/functions/ai-assistant/index.ts` باستخدام Supabase Edge Functions.
4. انسخ `supabase-config.example.js` إلى `supabase-config.js` وضع Project URL وPublishable/anon key فقط.
5. فعّل تسجيل البريد الإلكتروني وأضف عنوان GitHub Pages إلى قائمة Redirect URLs.
6. بعد اكتمال الربط، تُفعّل واجهة تسجيل الدخول والمزامنة السحابية داخل الموقع.

## الأمان والتكلفة
- سياسات RLS تقصر بيانات مساحة العمل على مالك الحساب.
- وظيفة الذكاء الاصطناعي تتطلب JWT لمستخدم مسجل؛ وتضع حدًا تجريبيًا قدره 60 طلبًا لكل مستخدم خلال 24 ساعة.
- لا تضع service_role / secret key أو OPENAI_API_KEY في ملفات GitHub العامة.
- استخدام OpenAI API له فوترة مستقلة عن اشتراك ChatGPT وقد ينتج عنه تكلفة حسب استخدام الرموز والنموذج.
