/* Entelaqtak Navigation Organizer v3 — grouped desktop menu + compact mobile tools drawer. */
(() => {
  'use strict';
  const nav = document.getElementById('nav');
  if (!nav || nav.dataset.organizedV3 === 'true') return;
  nav.dataset.organizedV3 = 'true';

  const sections = [
    { id:'discover', title:'الأفكار والبحث', items:[
      ['ideas','أفكار المحتوى','✧'],['trends','رادار الموضوعات','↗'],['brain','عقل المحتوى الذكي','✦']
    ]},
    { id:'create', title:'صناعة المحتوى', items:[
      ['production','استوديو الإنتاج','▶'],['studio','استوديو المحتوى','✍'],['script','كاتب السكريبت','▤'],['repurpose','إعادة تدوير المحتوى','♻']
    ]},
    { id:'design', title:'التصميم والتحسين', items:[
      ['titles','العناوين والصورة','▣'],['thumbnail','مصمم الصور المصغّرة','▧'],['seo','مساعد SEO','⌕'],
      ['video','مصنع الفيديوهات','▷'],['brand','هوية المحتوى','◈'],['lab','مختبر العناوين','⚗']
    ]},
    { id:'publish', title:'النشر وقياس الأداء', items:[
      ['calendar','تقويم النشر','▦'],['analytics','متابعة الأداء','▥']
    ]},
    { id:'learn', title:'التعلّم والتطوير', items:[
      ['guide','دليل الاستخدام','؟'],['challenge','تحدي 30 يوم','♜'],['academy','أكاديمية انطلاقتك','★']
    ]},
    { id:'account', title:'الحساب والمساعدة', items:[
      ['connections','ربط المنصات','◉'],['support','الدعم والمساعدة','?'],['settings','الإعدادات والبيانات','⚙']
    ]}
  ];
  const primaryIds = ['home','ideas','production','calendar','analytics'];
  const primaryLabels = {
    home:['الرئيسية','⌂'], ideas:['أفكار المحتوى','✧'], production:['استوديو الإنتاج','▶'],
    calendar:['تقويم النشر','▦'], analytics:['متابعة الأداء','▥']
  };
  const buttons = new Map(
    Array.from(nav.querySelectorAll('button[data-view]')).map(button => [button.dataset.view,button])
  );
  if (!buttons.size) return;

  const known = new Set(sections.flatMap(section => section.items.map(item => item[0])).concat(['home']));
  const extras = Array.from(buttons.values()).filter(button => !known.has(button.dataset.view));
  if (extras.length) sections.push({id:'extra',title:'أدوات إضافية',items:extras.map(button=>[
    button.dataset.view,
    button.dataset.navLabel || button.textContent.trim(),
    (button.querySelector('i') || {}).textContent || '✦'
  ])});

  function decorate(button,label,glyph) {
    let icon = button.querySelector('i');
    if (!icon) { icon=document.createElement('i'); button.prepend(icon); }
    icon.textContent = glyph;
    icon.setAttribute('aria-hidden','true');
    button.dataset.navLabel = label;
    button.setAttribute('aria-label',label);
    button.title = label;
    button.replaceChildren(icon,document.createTextNode(label));
    button.classList.add('nav-item-organized');
  }
  for (const section of sections) {
    section.items = section.items.filter(([id]) => buttons.has(id));
    section.items.forEach(([id,label,glyph])=>decorate(buttons.get(id),label,glyph));
  }
  if (buttons.has('home')) decorate(buttons.get('home'),'الرئيسية','⌂');

  const sidebar = nav.closest('.sidebar') || nav.parentElement;
  let panel = sidebar.querySelector('.nav-mobile-panel');
  let backdrop = sidebar.querySelector('.nav-mobile-backdrop');
  if (!panel) {
    panel=document.createElement('div');
    panel.className='nav-mobile-panel';
    panel.hidden=true;
    panel.setAttribute('aria-label','كل أدوات انطلاقتك');
    sidebar.appendChild(panel);
  }
  if (!backdrop) {
    backdrop=document.createElement('button');
    backdrop.type='button';
    backdrop.className='nav-mobile-backdrop';
    backdrop.hidden=true;
    backdrop.setAttribute('aria-label','إغلاق قائمة الأدوات');
    sidebar.appendChild(backdrop);
  }

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  let mobileOpen = false;
  let currentMode = '';
  function setPanel(open) {
    mobileOpen=!!open;
    panel.hidden=!mobileOpen;
    backdrop.hidden=!mobileOpen;
    const toggle=nav.querySelector('[data-nav-more]');
    if(toggle) toggle.setAttribute('aria-expanded',String(mobileOpen));
    document.body.classList.toggle('nav-tools-open',mobileOpen);
  }
  function buildDesktop() {
    nav.className='nav nav-organized-desktop';
    const fragment=document.createDocumentFragment();
    const active = nav.querySelector('button[data-view].active')?.dataset.view || panel.querySelector('button[data-view].active')?.dataset.view || 'home';
    for (const section of sections) {
      const available=section.items.filter(([id])=>buttons.has(id));
      if (!available.length) continue;
      const group=document.createElement('details');
      group.className='nav-section';
      group.dataset.navSection=section.id;
      group.open=available.some(([id])=>id===active) || (active==='home' && section.id==='create');
      const summary=document.createElement('summary');
      summary.className='nav-section-title';
      const title=document.createElement('span');
      title.textContent=section.title;
      const count=document.createElement('small');
      count.textContent=String(available.length);
      summary.append(title,count);
      group.appendChild(summary);
      const items=document.createElement('div');
      items.className='nav-section-items';
      available.forEach(([id])=>items.appendChild(buttons.get(id)));
      group.appendChild(items);
      fragment.appendChild(group);
    }
    if (buttons.has('home')) {
      const homeGroup=document.createElement('details');
      homeGroup.className='nav-section nav-home-section';
      homeGroup.open=active==='home';
      homeGroup.dataset.navSection='home';
      const summary=document.createElement('summary');
      summary.className='nav-section-title';
      summary.innerHTML='<span>الرئيسية</span><small>1</small>';
      const items=document.createElement('div');
      items.className='nav-section-items';
      items.appendChild(buttons.get('home'));
      homeGroup.append(summary,items);
      fragment.insertBefore(homeGroup,fragment.firstChild);
    }
    nav.replaceChildren(fragment);
    panel.replaceChildren();
    setPanel(false);
  }
  function buildMobile() {
    nav.className='nav nav-organized-mobile';
    const fragment=document.createDocumentFragment();
    const shortcuts=document.createElement('div');
    shortcuts.className='nav-mobile-shortcuts';
    primaryIds.filter(id=>buttons.has(id)).forEach(id=>{
      const button=buttons.get(id);
      const [label,glyph]=primaryLabels[id] || [button.dataset.navLabel || id,'✦'];
      decorate(button,label,glyph);
      shortcuts.appendChild(button);
    });
    const more=document.createElement('button');
    more.type='button';
    more.className='nav-more-toggle';
    more.dataset.navMore='true';
    more.setAttribute('aria-expanded','false');
    more.innerHTML='<i aria-hidden="true">•••</i><span>الأدوات</span>';
    shortcuts.appendChild(more);
    fragment.appendChild(shortcuts);
    nav.replaceChildren(fragment);

    const drawer=document.createDocumentFragment();
    for (const section of sections) {
      const available=section.items.filter(([id])=>buttons.has(id) && !primaryIds.includes(id));
      if (!available.length) continue;
      const group=document.createElement('details');
      group.className='nav-mobile-section';
      group.dataset.navSection=section.id;
      const summary=document.createElement('summary');
      summary.className='nav-mobile-section-title';
      summary.textContent=section.title;
      const items=document.createElement('div');
      items.className='nav-mobile-section-items';
      available.forEach(([id])=>items.appendChild(buttons.get(id)));
      group.append(summary,items);
      drawer.appendChild(group);
    }
    panel.replaceChildren(drawer);
    if (panel.firstElementChild) panel.firstElementChild.open=true;
    setPanel(false);
  }
  function rebuild() {
    const nextMode=isMobile()?'mobile':'desktop';
    if (nextMode===currentMode) return;
    currentMode=nextMode;
    if (currentMode==='mobile') buildMobile();
    else buildDesktop();
  }
  nav.addEventListener('click',event=>{
    const more=event.target.closest('[data-nav-more]');
    if (more) { event.preventDefault(); setPanel(!mobileOpen); return; }
    const button=event.target.closest('button[data-view]');
    if (!button) return;
    if (isMobile()) setPanel(false);
    else {
      const group=button.closest('details.nav-section');
      if (group) {
        group.open=true;
        nav.querySelectorAll('details.nav-section').forEach(item=>{if(item!==group)item.open=false;});
      }
    }
  });
  panel.addEventListener('click',event=>{
    const button=event.target.closest('button[data-view]');
    if(button) setPanel(false);
  });
  backdrop.addEventListener('click',()=>setPanel(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobileOpen)setPanel(false);});
  window.addEventListener('resize',()=>{rebuild();}, {passive:true});
  document.addEventListener('click',event=>{
    const route=event.target.closest('[data-view].active');
    if(!route || isMobile()) return;
    const group=route.closest('details.nav-section');
    if(group) group.open=true;
  });
  rebuild();
})();