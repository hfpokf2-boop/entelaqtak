/* Entelaqtak navigation organizer — groups all registered workspace tools. */
(() => {
  'use strict';
  const nav = document.getElementById('nav');
  if (!nav) return;

  const sections = [
    { title: 'الرئيسية', items: [
      ['home','الرئيسية','⌂']
    ]},
    { title: 'الأفكار والبحث', items: [
      ['ideas','أفكار المحتوى','✧'],
      ['trends','رادار الموضوعات','↗'],
      ['brain','عقل المحتوى الذكي','✦']
    ]},
    { title: 'صناعة المحتوى', items: [
      ['production','استوديو الإنتاج','▶'],
      ['studio','استوديو المحتوى','✍'],
      ['script','كاتب السكريبت','▤'],
      ['repurpose','إعادة تدوير المحتوى','♻']
    ]},
    { title: 'التصميم والتحسين', items: [
      ['titles','العناوين والصورة','▣'],
      ['thumbnail','مصمم الصور المصغّرة','▧'],
      ['seo','مساعد SEO','⌕'],
      ['video','مصنع الفيديوهات','▷'],
      ['brand','هوية المحتوى','◈'],
      ['lab','مختبر العناوين','⚗']
    ]},
    { title: 'النشر والمتابعة', items: [
      ['calendar','تقويم النشر','▦'],
      ['analytics','متابعة الأداء','▥']
    ]},
    { title: 'التعلّم والتطوير', items: [
      ['guide','دليل الاستخدام','؟'],
      ['challenge','تحدي 30 يوم','♜'],
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
      let icon = button.querySelector('i');
      if (!icon) {
        icon = document.createElement('i');
        button.prepend(icon);
      }
      icon.textContent = glyph;
      icon.setAttribute('aria-hidden', 'true');
      button.dataset.navLabel = label;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.replaceChildren(icon, document.createTextNode(label));
      button.classList.add('nav-item-organized');
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

  // Keep the selected destination visible in the horizontal mobile navigation.
  document.addEventListener('click', event => {
    if (!event.target.closest('#nav button[data-view]')) return;
    const active = nav.querySelector('button[data-view].active');
    if (active && window.matchMedia('(max-width: 760px)').matches) {
      requestAnimationFrame(() => active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }));
    }
  });
})();