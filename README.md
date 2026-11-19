# انطلاقتك — استوديو صُنّاع المحتوى

الموقع: https://hfpokf2-boop.github.io/entelaqtak/

## جاهز في المستودع
- واجهة عربية RTL متجاوبة مع صفحات الأدوات.
- GitHub Pages deployment عبر GitHub Actions.
- أداة إعادة تدوير المحتوى.
- مخطط قاعدة بيانات Supabase: `supabase/migrations/202611190001_initial_schema.sql`.
- Edge Function للذكاء الاصطناعي: `supabase/functions/ai-assistant/index.ts`.

## ما يزال يحتاج إلى إعداد مشروع Supabase
1. تطبيق migration على مشروع Supabase.
2. الحصول على Project URL وPublishable key وربطهما بالواجهة.
3. نشر Edge Function وإضافة السر `OPENAI_API_KEY` من Supabase Dashboard.
4. تفعيل Email Auth والسماح بعنوان الموقع في Redirect URLs.
5. الاختبار بحسابين للتأكد من عزل مساحة كل مستخدم.

النموذج الافتراضي للذكاء الاصطناعي هو `gpt-6-luna`، ويمكن تغييره من سر `OPENAI_MODEL`.
لا تضع مفتاح OpenAI أو مفتاح Supabase السري في مستودع GitHub.
