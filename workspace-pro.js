/* Entelaqtak Workspace PRO — weekly execution planner + command palette */
(() => {
  'use strict';
  const app = window.EntelaqtakApp;
  const home = document.getElementById('view-home');
  if (!app || !home || window.__entelaqtakWorkspacePro) return;
  window.__entelaqtakWorkspacePro = true;

  const $ = (id, root=document) => root.querySelector('#' + id);
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const state = app.getState();
  const today = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  };
  const weekKey = () => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  };
  const uid = () => 'wp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  const normalizePlan = () => {
    let plan = state.workspacePlan;
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) plan = {};
    if (!Array.isArray(plan.tasks)) plan.tasks = [];
    if (!Array.isArray(plan.history)) plan.history = [];
    const currentWeek = weekKey();
    if (plan.weekKey && plan.weekKey !== currentWeek) {
      plan.history.unshift({
        weekKey: plan.weekKey,
        total: plan.tasks.length,
        done: plan.tasks.filter(task => task && task.done).length,
        tasks: plan.tasks.slice(0,25)
      });
      plan.history = plan.history.slice(0,8);
      plan.tasks = [];
    }
    plan.weekKey = currentWeek;
    plan.tasks = plan.tasks.filter(task => task && typeof task === 'object' && typeof task.title === 'string').slice(0,25);
    state.workspacePlan = plan;
    return plan;
  };
  const plan = normalizePlan();
  let selectedCommand = 0;
  let currentCommands = [];
  let paletteOpen = false;
  const RECENT_KEY = 'entelaqtak-recent-tools-v1';
  let recentTools = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    if (Array.isArray(parsed)) recentTools = parsed.filter(item => typeof item === 'string').slice(0,8);
  } catch (_) {}

  function go(id) {
    if (typeof app.go === 'function') app.go(id);
  }
  function save() {
    try { app.save(); } catch (error) { console.error('Workspace PRO save failed:', error); app.toast('تعذر حفظ التعديل. راجع مساحة التخزين.'); }
  }
  function stats() {
    const projects = Array.isArray(state.productionProjects) ? state.productionProjects.filter(item => item && item.kind === 'production_project') : [];
    const todayKey = today();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const endKey = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0,10);
    const upcoming = (Array.isArray(state.posts) ? state.posts : []).filter(item => item && item.date >= todayKey && item.date < endKey);
    const packs = Array.isArray(state.packs) ? state.packs.length : 0;
    const completed = plan.tasks.filter(item => item.done).length;
    return { projects:projects.length, upcoming:upcoming.length, packs, completed, total:plan.tasks.length, next:upcoming.sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0] || null };
  }
  function recommendedAction() {
    const pendingTask = plan.tasks.find(item => !item.done);
    if (pendingTask) return { title:pendingTask.title, detail:'أكمل أول أولوية في خطة الأسبوع', label:'افتح خطة الأسبوع', run:()=>document.getElementById('wpTaskInput')?.focus() };
    const projects = Array.isArray(state.productionProjects) ? state.productionProjects.filter(item => item && item.kind === 'production_project') : [];
    const active = projects.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).find(item => item.stage !== 'publish');
    if (active) return { title:active.topic || 'مشروع إنتاج مستمر', detail:'عندك مشروع محتوى لم يكتمل بعد', label:'كمّل المشروع', run:()=>{app.openProductionProject?.(String(active.id));go('production');} };
    const upcoming = stats().next;
    if (upcoming) return { title:upcoming.title || 'موعد نشر قادم', detail:'راجع تفاصيل المحتوى قبل موعد النشر', label:'افتح تقويم النشر', run:()=>go('calendar') };
    return { title:'ابدأ مشروع المحتوى القادم', detail:'حوّل فكرة واحدة إلى مشروع واضح قابل للتنفيذ', label:'ابدأ مشروعًا', run:()=>go('production') };
  }
  function renderPlan() {
    const host = $('workspaceProHome');
    if (!host) return;
    const data = stats();
    const next = recommendedAction();
    const tasks = plan.tasks.map(task =>
      '<li class="wp-task '+(task.done?'is-done':'')+'" data-task-row="'+safe(task.id)+'">'+
        '<label><input type="checkbox" data-task-toggle="'+safe(task.id)+'" '+(task.done?'checked':'')+'><span>'+safe(task.title)+'</span></label>'+
        '<button type="button" class="wp-task-delete" data-task-delete="'+safe(task.id)+'" aria-label="حذف المهمة" title="حذف المهمة">×</button>'+
      '</li>'
    ).join('');
    const percent = data.total ? Math.round(data.completed / data.total * 100) : 0;
    host.innerHTML =
      '<div class="wp-section-head"><div><span class="wp-eyebrow">CREATOR EXECUTION</span><h2>مركز التنفيذ الأسبوعي</h2><p>رتّب أولوياتك، وشوف حالة شغلك، وكمّل من آخر نقطة.</p></div><button type="button" class="wp-command-shortcut" data-wp-command-open><span>⌘</span> لوحة الأوامر <kbd>Ctrl K</kbd></button></div>'+
      '<div class="wp-execution-grid">'+
        '<section class="wp-plan-card" aria-labelledby="wpPlanTitle">'+
          '<div class="wp-card-head"><div><span class="wp-card-kicker">YOUR WEEKLY PLAN</span><h3 id="wpPlanTitle">أولويات الأسبوع</h3></div><span class="wp-week-badge">أسبوع يبدأ '+safe(plan.weekKey)+'</span></div>'+
          '<div class="wp-progress-meta"><span>'+data.completed+' من '+data.total+' مهام مكتملة</span><strong>'+percent+'%</strong></div>'+
          '<div class="wp-progress-track"><span style="width:'+percent+'%"></span></div>'+
          (plan.tasks.length?'<ul class="wp-task-list">'+tasks+'</ul>':'<div class="wp-empty-plan"><span>✦</span><strong>لسه ما حددتش أولويات الأسبوع</strong><small>اكتب 3 مهام واضحة، وابدأ بالأهم.</small></div>')+
          '<form class="wp-add-task" id="wpTaskForm"><input id="wpTaskInput" maxlength="140" autocomplete="off" placeholder="أضف مهمة جديدة للأسبوع..." aria-label="مهمة جديدة" required><button type="submit">＋ إضافة</button></form>'+
          '<div class="wp-plan-foot"><span>المهام محفوظة ضمن مساحة العمل ومتزامنة مع حسابك عند تسجيل الدخول.</span><button type="button" data-wp-plan-clear>مسح المكتملة</button></div>'+
        '</section>'+
        '<section class="wp-pulse-card" aria-labelledby="wpPulseTitle">'+
          '<div class="wp-card-head"><div><span class="wp-card-kicker">WORKSPACE PULSE</span><h3 id="wpPulseTitle">نبض مساحة العمل</h3></div><span class="wp-live-mark"><i></i> بياناتك الحالية</span></div>'+
          '<div class="wp-metrics-grid">'+
            '<div class="wp-metric"><span class="wp-metric-icon">🎬</span><strong>'+data.projects+'</strong><small>مشاريع إنتاج</small></div>'+
            '<div class="wp-metric"><span class="wp-metric-icon">▦</span><strong>'+data.upcoming+'</strong><small>مواعيد خلال 7 أيام</small></div>'+
            '<div class="wp-metric"><span class="wp-metric-icon">✍</span><strong>'+data.packs+'</strong><small>حزم محتوى محفوظة</small></div>'+
          '</div>'+
          '<div class="wp-next-action"><span class="wp-card-kicker">الخطوة المقترحة</span><strong>'+safe(next.title)+'</strong><p>'+safe(next.detail)+'</p><button type="button" id="wpRecommendedAction">'+safe(next.label)+' <span>←</span></button></div>'+
          '<div class="wp-recent-tools"><div><b>آخر أدوات استخدمتها</b><small>وصول سريع لآخر صفحات فتحتها</small></div><div class="wp-recent-list">'+renderRecentTools()+'</div></div>'+
        '</section>'+
      '</div>';
  }
  const routeNames = {
    home:'مركز التحكم',guide:'دليل الاستخدام',ideas:'أفكار المحتوى',studio:'استوديو المحتوى',
    production:'استوديو الإنتاج',repurpose:'إعادة تدوير المحتوى',script:'كاتب السكريبت',
    titles:'العناوين والصورة',seo:'مساعد SEO',calendar:'تقويم النشر',analytics:'متابعة الأداء',
    challenge:'تحدي 30 يوم',brain:'عقل المحتوى الذكي',trends:'رادار الموضوعات',video:'مصنع الفيديوهات',
    brand:'هوية المحتوى',lab:'مختبر العناوين',academy:'أكاديمية انطلاقتك',settings:'الإعدادات والبيانات',
    library:'مكتبتي والملفات',connections:'ربط المنصات',support:'الدعم والمساعدة',thumbnail:'مصمم الصور المصغرة'
  };
  function renderRecentTools() {
    const ids = recentTools.filter((id,index)=>recentTools.indexOf(id)===index).slice(0,4);
    if (!ids.length) return '<span class="wp-no-recent">الأدوات التي تستخدمها ستظهر هنا.</span>';
    return ids.map(id=>'<button type="button" data-wp-go="'+safe(id)+'">'+safe(routeNames[id]||id)+'</button>').join('');
  }
  function trackRoute(id) {
    if (!id || id === 'home') return;
    recentTools = [id,...recentTools.filter(item=>item!==id)].slice(0,8);
    try { localStorage.setItem(RECENT_KEY,JSON.stringify(recentTools)); } catch (_) {}
    const recentHost = document.querySelector('.wp-recent-list');
    if (recentHost) recentHost.innerHTML = renderRecentTools();
  }

  // Weekly plan interactions use event delegation so every re-render stays wired.
  home.addEventListener('submit', event => {
    if (event.target.id !== 'wpTaskForm') return;
    event.preventDefault();
    const input = $('wpTaskInput');
    const title = String(input?.value || '').trim();
    if (!title) return;
    if (plan.tasks.length >= 25) return app.toast('وصلت للحد الأقصى: 25 مهمة في خطة الأسبوع.');
    plan.tasks.push({id:uid(),title:title.slice(0,140),done:false,createdAt:new Date().toISOString()});
    save();
    renderPlan();
    app.toast('اتضافت المهمة لخطة الأسبوع.');
  });
  home.addEventListener('change', event => {
    const input = event.target.closest('[data-task-toggle]');
    if (!input) return;
    const task = plan.tasks.find(item=>String(item.id)===String(input.dataset.taskToggle));
    if (!task) return;
    task.done = input.checked;
    save();
    renderPlan();
  });
  home.addEventListener('click', event => {
    const remove = event.target.closest('[data-task-delete]');
    if (remove) {
      plan.tasks = plan.tasks.filter(item=>String(item.id)!==String(remove.dataset.taskDelete));
      save(); renderPlan(); return;
    }
    if (event.target.closest('[data-wp-plan-clear]')) {
      const count = plan.tasks.filter(item=>item.done).length;
      if (!count) return app.toast('مفيش مهام مكتملة لمسحها.');
      plan.tasks = plan.tasks.filter(item=>!item.done);
      save(); renderPlan(); app.toast('اتمسحت '+count+' مهمة مكتملة.');
      return;
    }
    const recent = event.target.closest('[data-wp-go]');
    if (recent) { go(recent.dataset.wpGo); return; }
    if (event.target.closest('[data-wp-command-open]')) { openPalette(); return; }
    if (event.target.closest('#wpRecommendedAction')) { recommendedAction().run(); }
  });

  function makeCommands(query) {
    const normalized = String(query||'').toLocaleLowerCase('ar').replace(/[أإآ]/g,'ا').trim();
    const commands = [];
    const add = item => {
      if (!normalized || (item.title+' '+(item.subtitle||'')+' '+(item.keywords||'')).toLocaleLowerCase('ar').replace(/[أإآ]/g,'ا').includes(normalized)) commands.push(item);
    };
    const navButtons = Array.from(document.querySelectorAll('#nav button[data-view]'));
    navButtons.forEach(button => {
      const id = button.dataset.view;
      const title = button.dataset.navLabel || routeNames[id] || button.textContent.trim();
      add({id:'route-'+id,type:'tool',title,subtitle:'فتح الأداة',icon:button.querySelector('i')?.textContent||'✦',keywords:id+' '+title,run:()=>go(id)});
    });
    [
      {id:'action-new-project',title:'ابدأ مشروع إنتاج جديد',subtitle:'افتح نموذج مشروع جديد',icon:'＋',keywords:'مشروع فيديو انتاج جديد',run:()=>{go('production');setTimeout(()=>{document.querySelector('#view-production [data-action="all-projects"]')?.click();setTimeout(()=>$('prodTopic')?.focus(),40);},80);}},
      {id:'action-new-post',title:'أضف موعد نشر',subtitle:'افتح نموذج تقويم النشر',icon:'▦',keywords:'موعد جدول منشور تقويم',run:()=>{go('calendar');setTimeout(()=>$('postTitle')?.focus(),80);}},
      {id:'action-new-idea',title:'اكتشف فكرة محتوى',subtitle:'افتح مولّد الأفكار',icon:'✧',keywords:'فكرة افكار محتوى',run:()=>go('ideas')},
      {id:'action-library',title:'افتح مكتبتي والملفات',subtitle:'استعرض كل أعمالك المحفوظة',icon:'▤',keywords:'مكتبة ملفات حفظ',run:()=>go('library')},
      {id:'action-backup',title:'صدّر نسخة احتياطية',subtitle:'نزّل نسخة JSON من مساحة العمل',icon:'⇩',keywords:'نسخة احتياطية تصدير بيانات backup',run:()=>{go('settings');setTimeout(()=>$('settingsExport')?.click(),80);}},
      {id:'action-health',title:'افحص صحة الموقع',subtitle:'اختبر ملفات النظام والتخزين',icon:'✓',keywords:'فحص تشخيص اخطاء صحة النظام',run:()=>{go('settings');setTimeout(()=>$('refreshHealth')?.click(),80);}},
      {id:'action-support',title:'الإبلاغ عن مشكلة',subtitle:'افتح مركز الدعم',icon:'?',keywords:'دعم مساعدة مشكلة بلاغ',run:()=>go('support')}
    ].forEach(add);
    const projects = Array.isArray(state.productionProjects) ? state.productionProjects.filter(item=>item&&item.kind==='production_project') : [];
    projects.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,30).forEach(item=>{
      add({id:'project-'+String(item.id),type:'project',title:item.topic||'مشروع بدون عنوان',subtitle:'مشروع إنتاج · '+(routeNames.production||'استوديو الإنتاج'),icon:'🎬',keywords:item.platform+' '+item.stage+' '+item.niche,run:()=>{app.openProductionProject?.(String(item.id));go('production');}});
    });
    const packs = Array.isArray(state.packs) ? state.packs : [];
    packs.slice().reverse().slice(0,30).forEach(item=>{
      add({id:'pack-'+String(item.id),type:'pack',title:item.topic||'حزمة بدون عنوان',subtitle:'حزمة محتوى محفوظة',icon:'✍',keywords:item.platform+' '+item.niche,run:()=>{
        go('studio');
        setTimeout(()=>{
          const button=Array.from(document.querySelectorAll('[data-loadpack]')).find(node=>String(node.dataset.loadpack)===String(item.id));
          if (button) button.click(); else app.toast('افتح سجل الحزم داخل استوديو المحتوى للعثور على الحزمة.');
        },80);
      }});
    });
    const ideas = Array.isArray(state.ideas) ? state.ideas : [];
    ideas.slice().reverse().slice(0,30).forEach(item=>{
      add({id:'idea-'+String(item.id),type:'idea',title:item.title||item.topic||'فكرة محفوظة',subtitle:'فكرة في مكتبتك',icon:'✧',keywords:item.niche+' '+item.detail,run:()=>{go('library');setTimeout(()=>{const input=$('librarySearch');if(input){input.value=item.title||item.topic||'';input.dispatchEvent(new Event('input',{bubbles:true}));}},80);}});
    });
    const posts = Array.isArray(state.posts) ? state.posts : [];
    posts.slice().reverse().slice(0,30).forEach(item=>{
      add({id:'post-'+String(item.id),type:'post',title:item.title||'منشور مجدول',subtitle:'موعد نشر · '+(item.date||''),icon:'▦',keywords:item.platform+' '+item.status,run:()=>go('calendar')});
    });
    const recent = recentTools.filter(id=>routeNames[id]).map(id=>({id:'recent-'+id,type:'recent',title:routeNames[id],subtitle:'آخر أداة استخدمتها',icon:'↻',keywords:id,run:()=>go(id)}));
    if (!normalized && recent.length) commands.unshift(...recent);
    return commands.slice(0,32);
  }
  function ensurePalette() {
    if ($('wpCommandOverlay')) return;
    const overlay=document.createElement('div');
    overlay.className='wp-command-overlay';
    overlay.id='wpCommandOverlay';
    overlay.hidden=true;
    overlay.innerHTML=
      '<div class="wp-command-dialog" role="dialog" aria-modal="true" aria-labelledby="wpCommandTitle">'+
        '<div class="wp-command-top"><div><span class="wp-eyebrow">ENTELAQTAK COMMAND CENTER</span><h2 id="wpCommandTitle">اعمل إيه دلوقتي؟</h2><p>ابحث في الأدوات والمشاريع والحزم المحفوظة أو نفّذ إجراء سريع.</p></div><button type="button" class="wp-command-close" data-wp-close aria-label="إغلاق لوحة الأوامر">×</button></div>'+
        '<label class="wp-command-search"><span>⌕</span><input id="wpCommandInput" type="search" placeholder="اكتب اسم أداة أو مشروع أو إجراء..." autocomplete="off"><kbd>ESC</kbd></label>'+
        '<div class="wp-command-meta"><span>نتائج ذكية من مساحة عملك</span><span>↑ ↓ للتنقل · Enter للفتح</span></div>'+
        '<div class="wp-command-results" id="wpCommandResults" role="listbox" aria-label="نتائج البحث"></div>'+
        '<div class="wp-command-footer"><span><kbd>Ctrl</kbd> + <kbd>K</kbd> فتح لوحة الأوامر</span><span>انطلاقتك · مركز التنفيذ</span></div>'+
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{
      if(event.target===overlay || event.target.closest('[data-wp-close]')) closePalette();
    });
    const input=$('wpCommandInput');
    input.addEventListener('input',()=>renderCommands(input.value));
    input.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'){event.preventDefault();moveSelection(1);}
      else if(event.key==='ArrowUp'){event.preventDefault();moveSelection(-1);}
      else if(event.key==='Enter'){event.preventDefault();runSelected();}
      else if(event.key==='Escape'){event.preventDefault();closePalette();}
    });
  }
  function renderCommands(query='') {
    const host=$('wpCommandResults');
    if(!host)return;
    currentCommands=makeCommands(query);
    selectedCommand=0;
    if(!currentCommands.length){
      host.innerHTML='<div class="wp-command-empty"><strong>مفيش نتيجة مطابقة</strong><span>جرّب اسم أداة أو جزء من عنوان المشروع.</span></div>';
      return;
    }
    const labels={tool:'أداة',project:'مشروع',pack:'حزمة',idea:'فكرة',post:'موعد',recent:'حديثًا'};
    host.innerHTML=currentCommands.map((item,index)=>
      '<button type="button" class="wp-command-item '+(index===0?'is-selected':'')+'" role="option" aria-selected="'+(index===0?'true':'false')+'" data-command-index="'+index+'">'+
        '<span class="wp-command-icon">'+safe(item.icon)+'</span><span class="wp-command-copy"><strong>'+safe(item.title)+'</strong><small>'+safe(labels[item.type]||'إجراء')+' · '+safe(item.subtitle)+'</small></span><span class="wp-command-enter">↵</span>'+
      '</button>'
    ).join('');
    host.querySelectorAll('[data-command-index]').forEach(button=>{
      button.addEventListener('mouseenter',()=>selectCommand(Number(button.dataset.commandIndex)));
      button.addEventListener('click',()=>runCommand(Number(button.dataset.commandIndex)));
    });
  }
  function selectCommand(index) {
    if(!currentCommands.length)return;
    selectedCommand=(index+currentCommands.length)%currentCommands.length;
    const host=$('wpCommandResults');
    host?.querySelectorAll('[data-command-index]').forEach((button,i)=>{
      const active=i===selectedCommand;
      button.classList.toggle('is-selected',active);
      button.setAttribute('aria-selected',String(active));
      if(active)button.scrollIntoView({block:'nearest'});
    });
  }
  function moveSelection(delta) { selectCommand(selectedCommand+delta); }
  function runCommand(index) {
    const command=currentCommands[index];
    if(!command)return;
    trackRoute(command.type==='tool'||command.type==='recent'?command.id.replace(/^route-/,'').replace(/^recent-/,''):'');
    closePalette();
    try { command.run(); } catch(error) { console.error('Command failed:',error);app.toast('تعذر تنفيذ الأمر.'); }
  }
  function runSelected() { runCommand(selectedCommand); }
  function openPalette(query='') {
    ensurePalette();
    const overlay=$('wpCommandOverlay');
    const input=$('wpCommandInput');
    if(!overlay||!input)return;
    paletteOpen=true;
    overlay.hidden=false;
    document.body.classList.add('wp-command-open');
    input.value=query;
    renderCommands(query);
    setTimeout(()=>input.focus(),0);
  }
  function closePalette() {
    const overlay=$('wpCommandOverlay');
    if(!overlay||overlay.hidden)return;
    overlay.hidden=true;
    paletteOpen=false;
    document.body.classList.remove('wp-command-open');
    $('toolSearch')?.blur();
  }
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
      event.preventDefault();
      openPalette();
      return;
    }
    if(event.key==='Escape'&&paletteOpen){closePalette();return;}
  });
  const toolSearch=$('toolSearch');
  if(toolSearch){
    toolSearch.setAttribute('aria-keyshortcuts','Control+K Meta+K');
    toolSearch.title='ابحث عن أداة — Ctrl + K للبحث الشامل';
    toolSearch.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown' && !paletteOpen){event.preventDefault();openPalette(toolSearch.value);}
    });
  }
  document.addEventListener('click',event=>{
    const routeButton=event.target.closest('#nav button[data-view]');
    const goButton=event.target.closest('[data-go]');
    if(routeButton)trackRoute(routeButton.dataset.view);
    else if(goButton)trackRoute(goButton.dataset.go);
  });

  // Inject the weekly plan after the existing quick actions without replacing existing UI.
  if (!$('workspaceProHome')) {
    const anchor=home.querySelector('.stats') || home.querySelector('.control-center-actions');
    if(anchor){
      const section=document.createElement('section');
      section.id='workspaceProHome';
      section.className='workspace-pro-home';
      anchor.insertAdjacentElement('afterend',section);
    }
  }
  ensurePalette();
  renderPlan();

  // Refresh live metrics after any existing tool saves to the shared workspace state.
  if(typeof app.save==='function'&&!app.__workspaceProSaveWrapped){
    const originalSave=app.save;
    app.save=function(){
      const result=originalSave.apply(this,arguments);
      if(document.visibilityState!=='hidden')renderPlan();
      return result;
    };
    app.__workspaceProSaveWrapped=true;
  }
  window.addEventListener('pageshow',renderPlan);
  window.addEventListener('storage',event=>{if(event.key==='entelaqtak-v1')renderPlan();});
})();