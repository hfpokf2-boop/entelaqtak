/* Entelaqtak sidebar organizer — runs after all tool modules are registered. */
(() => {
  'use strict';
  const nav = document.getElementById('nav');
  if (!nav) return;

  const sections = [
    { title: 'مساحة العمل', items: [['home','الرئيسية','⌂']] },
    { title: 'صناعة المحتوى', items: [
      ['ideas','أفكار المحتوى','✧'],
      ['studio','استوديو المحتوى','✍'],
      ['production','استوديو الإنتاج','▶'],
      ['repurpose','إعادة تدوير المحتوى','♻'],
      ['script','كاتب السكريبت','▤'],
      ['titles','العناوين والصورة','▣'],
      ['seo','مساعد SEO','⌕'],
      ['calendar','تقويم النشر','▦']
    ]},
    { title: 'التخطيط وقياس الأداء', items: [
      ['thumbnail','مصمم الصور المصغّرة','▧'],
      ['analytics','متابعة الأداء','▥'],
      ['challenge','تحدي 30 يوم','♜']
    ]},
    { title: 'الإدارة والتطوير', items: [
      ['guide','دليل الاستخدام','؟'],
      ['brain','عقل المحتوى الذكي','✧'],
      ['trends','رادار الموضوعات','↗'],
      ['video','مصنع الفيديوهات','▶'],
      ['brand','هوية المحتوى','◈'],
      ['lab','مختبر العناوين','⚗'],
      ['academy','أكاديمية انطلاقتك','★']
    ]},
    { title: 'الحساب والخدمات', items: [
      ['settings','الإعدادات والبيانات','⚙'],
      ['connections','ربط المنصات','◉'],
      ['support','الدعم والمساعدة','?']
    ]}
  ];

  const existing = new Map(
    Array.from(nav.querySelectorAll('button[data-view]')).map(button => [button.dataset.view, button])
  );
  const known = new Set(sections.flatMap(section => section.items.map(item => item[0])));
  const fragment = document.createDocumentFragment();

  for (const section of sections) {
    const available = section.items.filter(([id]) => existing.has(id));
    if (!available.length) continue;
    const heading = document.createElement('div');
    heading.className = 'navlabel nav-group-label';
    heading.textContent = section.title;
    heading.setAttribute('role', 'separator');
    heading.setAttribute('aria-label', section.title);
    fragment.appendChild(heading);

    for (const [id, label, glyph] of available) {
      const button = existing.get(id);
      const icon = button.querySelector('i') || document.createElement('i');
      icon.textContent = glyph;
      icon.setAttribute('aria-hidden', 'true');
      if (!icon.parentNode) button.prepend(icon);
      button.dataset.navLabel = label;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.replaceChildren(icon, document.createTextNode(label));
      fragment.appendChild(button);
    }
  }

  const extras = Array.from(nav.querySelectorAll('button[data-view]'))
    .filter(button => !known.has(button.dataset.view));
  if (extras.length) {
    const heading = document.createElement('div');
    heading.className = 'navlabel nav-group-label';
    heading.textContent = 'أدوات إضافية';
    heading.setAttribute('role', 'separator');
    fragment.appendChild(heading);
    extras.forEach(button => fragment.appendChild(button));
  }

  nav.replaceChildren(fragment);
  nav.setAttribute('aria-label', 'التنقل بين أدوات انطلاقتك');
})();