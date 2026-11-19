(()=>{'use strict';
const app=window.EntelaqtakApp;
if(!app)return;
const $=id=>document.getElementById(id);
const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const notify=message=>app.toast(message);
const main=document.querySelector('main.main');
const footer=main&&main.querySelector('.footer');
const nav=$('nav');
const enhancementStyle=document.createElement('style');
enhancementStyle.textContent=".enhance-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:99px;padding:7px 10px;background:#ffffff08;color:var(--muted);font-size:10px;white-space:nowrap}.enhance-pill.offline{color:#ffd38a;border-color:#9b713b;background:#9b713b18}.enhance-pill.online{color:#8ce0bd;border-color:#3b8a6d;background:#3b8a6d18}.enhance-pill[hidden]{display:none}.enhance-card{background:var(--panel);border:1px solid var(--line);border-radius:17px;padding:17px;margin-top:14px;min-width:0}.enhance-card h3{font-size:14px;margin:0 0 6px}.enhance-muted{font-size:10px;color:var(--muted);line-height:1.8;margin:0 0 12px}.enhance-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.enhance-actions button,.enhance-actions a{border:1px solid var(--line);border-radius:9px;padding:8px 11px;background:#ffffff09;color:var(--text);font:inherit;font-size:10px;text-decoration:none}.enhance-actions button.primary{background:var(--accent);color:#111;border-color:transparent;font-weight:700}.enhance-actions button:disabled{opacity:.45;cursor:not-allowed}.snapshot-list{display:grid;gap:8px}.snapshot-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--line);border-radius:11px;background:#ffffff05}.snapshot-row strong{display:block;font-size:11px}.snapshot-row small{display:block;color:var(--muted);font-size:9px;margin-top:3px}.snapshot-row .enhance-actions{margin:0}.snapshot-row .enhance-actions button{padding:6px 8px}.health-list{display:grid;gap:7px}.health-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;font-size:10px}.health-row span:last-child{color:var(--muted);text-align:left}.thumbnail-layout{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.2fr);gap:14px}.thumbnail-preview{min-width:0;padding:10px;border:1px solid var(--line);border-radius:14px;background:#0a1222;align-self:start}.thumbnail-preview canvas{display:block;width:100%;height:auto;border-radius:8px;background:#121a2b}.thumbnail-meta{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:9px;margin-top:8px}.thumbnail-help{font-size:10px;color:var(--muted);line-height:1.8}.analytics-enhanced canvas{display:block;width:100%;height:250px}.analytics-top-posts{display:grid;gap:7px;margin-top:12px}.analytics-top-post{display:flex;justify-content:space-between;gap:10px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:10px}.analytics-top-post span:last-child{color:var(--accent2);white-space:nowrap}.seo-search-preview{max-width:720px;padding:15px;border-radius:12px;background:#fff;color:#202124;direction:rtl;text-align:right}.seo-search-preview strong{display:block;color:#1a0dab;font-size:18px;font-weight:500;line-height:1.5}.seo-search-preview small{display:block;color:#5f6368;font-size:11px;direction:ltr;text-align:left;overflow-wrap:anywhere}.seo-search-preview p{color:#4d5156;font-size:12px;line-height:1.7;margin:6px 0 0}@media(max-width:760px){.thumbnail-layout{grid-template-columns:1fr}.snapshot-row{align-items:flex-start;flex-direction:column}.snapshot-row .enhance-actions{width:100%}.snapshot-row .enhance-actions button{flex:1}.enhance-pill{font-size:9px}}";
document.head.appendChild(enhancementStyle);

// Network state and install prompt
const topActions=document.querySelector('.topactions');
const networkBadge=document.createElement('span');
networkBadge.id='networkStateBadge';
networkBadge.className='enhance-pill';
networkBadge.setAttribute('role','status');
networkBadge.setAttribute('aria-live','polite');
if(topActions)topActions.insertBefore(networkBadge,topActions.firstChild);
function renderNetwork(){
 const online=navigator.onLine!==false;
 networkBadge.className='enhance-pill '+(online?'online':'offline');
 networkBadge.textContent=online?'● متصل بالإنترنت':'● تعمل دون اتصال';
}
window.addEventListener('online',renderNetwork);
window.addEventListener('offline',renderNetwork);
renderNetwork();
let installEvent=null;
const installButton=document.createElement('button');
installButton.type='button';
installButton.className='enhance-pill';
installButton.textContent='تثبيت التطبيق';
installButton.hidden=true;
if(topActions)topActions.insertBefore(installButton,networkBadge.nextSibling);
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 installEvent=event;
 installButton.hidden=false;
});
installButton.addEventListener('click',async()=>{
 if(!installEvent)return;
 installEvent.prompt();
 try{
  const choice=await installEvent.userChoice;
  if(choice&&choice.outcome==='accepted')notify('تم بدء تثبيت انطلاقتك.');
 }catch(error){notify('تعذر فتح نافذة التثبيت من المتصفح.');}
 installEvent=null;
 installButton.hidden=true;
});
window.addEventListener('appinstalled',()=>{installButton.hidden=true;notify('تم تثبيت التطبيق على جهازك.');});
if(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)installButton.hidden=true;

// Offline application shell
if('serviceWorker' in navigator&&location.protocol==='https:'){
 navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).then(()=>{
  renderDiagnostics();
 }).catch(error=>{
  console.warn('Service worker registration failed',error);
  renderDiagnostics();
 });
}

// Local, capped recovery snapshots. These remain on this device only.
const SNAPSHOT_KEY='entelaqtak-snapshots-v1';
const MAX_SNAPSHOTS=3;
const MAX_SNAPSHOT_CHARS=260000;
const SNAPSHOT_INTERVAL=6*60*60*1000;
function readSnapshots(){
 try{
  const value=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'[]');
  return Array.isArray(value)?value.filter(item=>item&&item.data&&typeof item.data==='object'):[];
 }catch(error){return[];}
}
function writeSnapshots(items){
 try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(items.slice(0,MAX_SNAPSHOTS)));return true;}
 catch(error){console.warn('Snapshot storage full',error);return false;}
}
function storeSnapshot(reason,force){
 let current;
 try{current=JSON.stringify(app.getState());}catch(error){return false;}
 if(!current||current.length<30||current.length>MAX_SNAPSHOT_CHARS){
  if(force)notify('النسخة كبيرة جدًا للحفظ التلقائي؛ استخدم تصدير JSON.');
  return false;
 }
 const items=readSnapshots().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 if(items[0]&&JSON.stringify(items[0].data)===current)return false;
 const now=Date.now();
 if(!force&&items[0]&&now-(items[0].createdAt||0)<SNAPSHOT_INTERVAL)return false;
 const entry={id:'snap-'+now,createdAt:now,reason:String(reason||'نسخة تلقائية'),data:JSON.parse(current)};
 items.unshift(entry);
 const saved=writeSnapshots(items);
 if(saved)renderSnapshots();
 return saved;
}
function downloadFile(name,content,type){
 const blob=new Blob([content],{type:type||'application/octet-stream'});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement('a');
 anchor.href=url;anchor.download=name;anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function formatDate(timestamp){
 try{return new Date(timestamp).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'});}
 catch(error){return new Date(timestamp).toLocaleString();}
}
function renderSnapshots(){
 const host=$('snapshotList');
 if(!host)return;
 const items=readSnapshots().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 if(!items.length){host.className='snapshot-list';host.innerHTML='<div class="enhance-muted">لم تُنشأ نسخ تلقائية بعد. ستُحفظ نسخة عند وجود تغييرات مناسبة، وقبل الاستيراد أو المسح.</div>';return;}
 host.className='snapshot-list';
 host.innerHTML=items.map(item=>{
  const size=Math.max(1,Math.round(JSON.stringify(item.data).length/1024));
  return '<div class="snapshot-row"><div><strong>'+escapeHTML(item.reason)+'</strong><small>'+escapeHTML(formatDate(item.createdAt))+' · '+size+' KB</small></div><div class="enhance-actions"><button type="button" data-snapshot-export="'+escapeHTML(item.id)+'">تحميل</button><button type="button" data-snapshot-restore="'+escapeHTML(item.id)+'">استعادة</button><button type="button" data-snapshot-delete="'+escapeHTML(item.id)+'">حذف</button></div></div>';
 }).join('');
 all('[data-snapshot-export]',host).forEach(button=>button.addEventListener('click',()=>{
  const item=readSnapshots().find(x=>x.id===button.dataset.snapshotExport);
  if(item)downloadFile('entelaqtak-recovery-'+item.createdAt+'.json',JSON.stringify({app:'انطلاقتك',createdAt:new Date(item.createdAt).toISOString(),data:item.data},null,2),'application/json');
 }));
 all('[data-snapshot-restore]',host).forEach(button=>button.addEventListener('click',()=>{
  const item=readSnapshots().find(x=>x.id===button.dataset.snapshotRestore);
  if(!item)return;
  if(!confirm('سيتم استبدال بيانات العمل الحالية بهذه النسخة. أنشئ نسخة JSON من بياناتك الحالية أولًا عند الحاجة. متابعة؟'))return;
  try{localStorage.setItem('entelaqtak-v1',JSON.stringify(item.data));location.reload();}
  catch(error){notify('تعذرت استعادة النسخة بسبب مساحة التخزين.');}
 }));
 all('[data-snapshot-delete]',host).forEach(button=>button.addEventListener('click',()=>{
  if(!confirm('حذف النسخة الاحتياطية المحددة؟'))return;
  writeSnapshots(readSnapshots().filter(x=>x.id!==button.dataset.snapshotDelete));
  renderSnapshots();
 }));
}
function addSettingsCard(){
 const settings=$('view-settings');
 const grid=settings&&settings.querySelector('.grid2');
 if(!grid)return;
 if(!$('enhancedRecoveryCard')){
  const card=document.createElement('div');
  card.className='card';
  card.id='enhancedRecoveryCard';
  card.innerHTML='<h2>استعادة تلقائية</h2><p class="muted">نسخ احتياطية محلية محدودة على هذا الجهاز، مع نسخة قبل الاستيراد أو مسح البيانات. لا تغادر النسخ هذا المتصفح.</p><div id="snapshotList" class="snapshot-list"></div><div class="enhance-actions"><button type="button" class="primary" id="snapshotNow">إنشاء نسخة الآن</button></div>';
  grid.appendChild(card);
  $('snapshotNow').addEventListener('click',()=>{
   if(storeSnapshot('نسخة يدوية',true))notify('تم إنشاء النسخة الاحتياطية على هذا الجهاز.');
   else notify('لا توجد تغييرات جديدة أو تعذر حفظ النسخة.');
  });
  renderSnapshots();
 }
 if(!$('enhancedHealthCard')){
  const card=document.createElement('div');
  card.className='card';
  card.id='enhancedHealthCard';
  card.innerHTML='<h2>حالة النظام والتشخيص</h2><p class="muted">الفحص محلي ولا يرسل محتوى مشاريعك أو بياناتك الشخصية.</p><div id="enhancedHealthList" class="health-list"></div><div class="enhance-actions"><button type="button" id="refreshHealth">تحديث الفحص</button><button type="button" id="copyHealth" class="primary">نسخ تقرير فني</button><a href="https://github.com/sasa-antilaqatuk/entelaqtak/issues" target="_blank" rel="noopener noreferrer">الإبلاغ عن مشكلة</a></div>';
  grid.appendChild(card);
  $('refreshHealth').addEventListener('click',renderDiagnostics);
  $('copyHealth').addEventListener('click',copyDiagnostics);
  renderDiagnostics();
 }
}
function renderDiagnostics(){
 const host=$('enhancedHealthList');
 if(!host)return;
 let storageOK=false;
 try{
  const key='entelaqtak-health-check';
  localStorage.setItem(key,'ok');
  storageOK=localStorage.getItem(key)==='ok';
  localStorage.removeItem(key);
 }catch(error){storageOK=false;}
 const config=window.ENTELAQTAK_CONFIG||{};
 const checks=[
  ['الاتصال بالإنترنت',navigator.onLine===false?'غير متصل':'متصل'],
  ['الحفظ المحلي',storageOK?'يعمل':'تعذر الكتابة في المتصفح'],
  ['اتصال الذكاء الاصطناعي',config.url&&config.publishableKey?'إعداد الاتصال موجود — لم يُختبر طلب مدفوع':'إعداد الاتصال غير مكتمل'],
  ['التشغيل الآمن',window.isSecureContext?'HTTPS / سياق آمن':'غير آمن'],
  ['التشغيل دون إنترنت','serviceWorker' in navigator?'دعم المتصفح متاح':'غير مدعوم في هذا المتصفح'],
  ['المزامنة السحابية',$('accountSync')?$('accountSync').textContent:'غير متاحة']
 ];
 host.innerHTML=checks.map(row=>'<div class="health-row"><span>'+escapeHTML(row[0])+'</span><span>'+escapeHTML(row[1])+'</span></div>').join('');
}
function copyDiagnostics(){
 const config=window.ENTELAQTAK_CONFIG||{};
 const lines=[
  'انطلاقتك — تقرير فني مختصر',
  'التاريخ: '+new Date().toISOString(),
  'المتصفح: '+navigator.userAgent,
  'الاتصال: '+(navigator.onLine===false?'غير متصل':'متصل'),
  'سياق آمن: '+String(!!window.isSecureContext),
  'الحفظ المحلي: '+(function(){try{localStorage.setItem('__entelaqtak_test','1');const ok=localStorage.getItem('__entelaqtak_test')==='1';localStorage.removeItem('__entelaqtak_test');return ok?'يعمل':'تعذر';}catch(error){return'تعذر';}})(),
  'إعداد AI: '+(config.url&&config.publishableKey?'موجود':'غير مكتمل'),
  'نسخة الواجهة: 1.1.0'
 ];
 const text=lines.join('\n');
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>notify('تم نسخ التقرير الفني.')).catch(()=>notify('تعذر النسخ؛ استخدم زر التصدير من المتصفح.'));
 else notify('النسخ غير مدعوم في هذا المتصفح.');
}
addSettingsCard();
storeSnapshot('نسخة تلقائية',false);
document.addEventListener('click',event=>{
 const clear=event.target&&event.target.closest&&event.target.closest('#clearAllData');
 if(clear)storeSnapshot('قبل مسح البيانات',true);
},true);
document.addEventListener('change',event=>{
 const target=event.target;
 if(target&&(target.id==='settingsImportFile'||target.id==='importFile')&&target.files&&target.files.length)storeSnapshot('قبل استيراد نسخة',true);
},true);
window.addEventListener('pagehide',()=>storeSnapshot('نسخة تلقائية',false));
if(typeof app.save==='function'){
 const originalSave=app.save;
 app.save=function(){
  const result=originalSave.apply(this,arguments);
  storeSnapshot('نسخة تلقائية',false);
  if($('view-analytics')&&$('view-analytics').classList.contains('active'))renderAnalytics();
  return result;
 };
}

// Add a practical thumbnail designer. It creates the image on this device; no upload is made.
app.addViews&&app.addViews.add('thumbnail');
if(nav&&!nav.querySelector('[data-view="thumbnail"]')){
 const button=document.createElement('button');
 button.type='button';
 button.dataset.view='thumbnail';
 button.innerHTML='<i aria-hidden="true">▧</i>مصمم الصور المصغرة';
 const before=nav.querySelector('[data-view="analytics"]');
 if(before)nav.insertBefore(button,before);else nav.appendChild(button);
 button.addEventListener('click',()=>app.go('thumbnail'));
}
const thumbnailSection=document.createElement('section');
thumbnailSection.className='view';
thumbnailSection.id='view-thumbnail';
thumbnailSection.innerHTML='<div class="head"><div><span class="eyebrow">تصميم محلي — بدون رفع ملفاتك</span><h1>مصمم الصور المصغرة ▧</h1><p>أنشئ صورة 1280×720 قابلة للتعديل والتحميل. ارفع صورة من جهازك اختياريًا أو استخدم الخلفيات الجاهزة.</p></div></div><div class="thumbnail-layout"><div class="panel"><div class="field"><label for="thumbTitle">العنوان الرئيسي</label><textarea id="thumbTitle" maxlength="110" placeholder="اكتب عنوانًا قصيرًا وواضحًا"></textarea></div><div class="field"><label for="thumbSubtitle">عبارة مساعدة (اختياري)</label><input id="thumbSubtitle" maxlength="70" placeholder="مثال: للمبتدئين خطوة بخطوة"></div><div class="grid2"><div class="field"><label for="thumbAccent">لون الإبراز</label><select id="thumbAccent"><option value="#8b7cf6">بنفسجي</option><option value="#16b99a">أخضر فيروزي</option><option value="#f2a94b">برتقالي</option><option value="#e65b72">وردي</option><option value="#4a9de8">أزرق</option></select></div><div class="field"><label for="thumbLayout">توزيع التصميم</label><select id="thumbLayout"><option value="bold">عنوان كبير</option><option value="card">بطاقة جانبية</option><option value="minimal">بسيط</option></select></div></div><div class="field"><label for="thumbImage">إضافة صورة من جهازك (اختياري)</label><input id="thumbImage" type="file" accept="image/*"><p class="thumbnail-help">الصورة تظل داخل المتصفح ولا يتم رفعها إلى خادم. الحد الأقصى 8 ميجابايت.</p></div><div class="enhance-actions"><button type="button" class="primary" id="drawThumbnail">تحديث التصميم</button><button type="button" id="downloadThumbnail">تحميل PNG</button><button type="button" id="clearThumbnailImage">إزالة الصورة</button><button type="button" id="thumbFromTitles">استخدام أول عنوان من مولّد العناوين</button></div></div><div class="thumbnail-preview"><canvas id="thumbnailCanvas" width="1280" height="720" role="img" aria-label="معاينة صورة مصغرة بحجم 1280 في 720"></canvas><div class="thumbnail-meta"><span>1280 × 720 px</span><span>PNG · جاهز ليوتيوب</span></div></div></div><div class="note">هذه أداة تصميم بقوالب محلية وليست مولّد صور بالذكاء الاصطناعي. راجع حقوق الصور التي تستخدمها قبل النشر.</div>';
if(footer)footer.insertAdjacentElement('beforebegin',thumbnailSection);
const thumbCanvas=$('thumbnailCanvas');
const thumbCtx=thumbCanvas&&thumbCanvas.getContext('2d');
let thumbImage=null,thumbObjectUrl=null;
function wrapCanvasText(context,text,maxWidth,maxLines){
 const words=String(text||'').trim().split(/\s+/).filter(Boolean);
 const lines=[];let line='';
 words.forEach(word=>{
  const next=line?line+' '+word:word;
  if(context.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;
 });
 if(line)lines.push(line);
 if(lines.length>maxLines){
  const shortened=lines.slice(0,maxLines);
  shortened[maxLines-1]=shortened[maxLines-1].replace(/[،,؛;:.\s]+$/,'')+'…';
  return shortened;
 }
 return lines;
}
function drawThumbnail(){
 if(!thumbCtx)return;
 const ctx=thumbCtx,w=thumbCanvas.width,h=thumbCanvas.height;
 const accent=$('thumbAccent').value||'#8b7cf6';
 const layout=$('thumbLayout').value;
 ctx.clearRect(0,0,w,h);
 const gradient=ctx.createLinearGradient(0,0,w,h);
 gradient.addColorStop(0,'#25304d');gradient.addColorStop(.55,'#10182c');gradient.addColorStop(1,'#101f2d');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(thumbImage){
  const scale=Math.max(w/thumbImage.width,h/thumbImage.height);
  const dw=thumbImage.width*scale,dh=thumbImage.height*scale;
  ctx.save();ctx.globalAlpha=.32;ctx.drawImage(thumbImage,(w-dw)/2,(h-dh)/2,dw,dh);ctx.restore();
 }
 const glow=ctx.createRadialGradient(160,640,10,160,640,600);
 glow.addColorStop(0,accent+'66');glow.addColorStop(1,accent+'00');
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='rgba(3,8,20,.48)';ctx.fillRect(0,0,w,h);
 ctx.fillStyle=accent;
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(30,0);ctx.lineTo(0,720);ctx.closePath();ctx.fill();
 ctx.globalAlpha=.12;ctx.strokeStyle='#fff';ctx.lineWidth=3;
 for(let x=50;x<1280;x+=70){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke();}
 ctx.globalAlpha=1;
 ctx.fillStyle='rgba(255,255,255,.12)';
 ctx.beginPath();ctx.arc(1090,120,150,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=accent;ctx.beginPath();ctx.arc(1130,600,240,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.16;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
 const right=1140;
 ctx.direction='rtl';ctx.textAlign='right';
 ctx.fillStyle='#f5f6ff';ctx.font='bold 30px Tahoma, Arial, sans-serif';
 ctx.fillText('انطلاقتك  •  صناعة محتوى',right,116);
 const title=$('thumbTitle').value.trim()||'عنوان الفيديو هنا';
 const titleSize=layout==='minimal'?64:layout==='card'?72:88;
 ctx.font='bold '+titleSize+'px Tahoma, Arial, sans-serif';
 const titleLines=wrapCanvasText(ctx,title,920,3);
 const startY=layout==='minimal'?305:layout==='card'?300:320;
 if(layout==='card'){
  ctx.fillStyle='rgba(12,19,37,.72)';
  ctx.beginPath();ctx.roundRect(150,170,1040,390,28);ctx.fill();
  ctx.fillStyle=accent;ctx.fillRect(150,170,13,390);
 }
 titleLines.forEach((line,index)=>{
  ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillText(line,right+5,startY+index*(titleSize*1.2)+5);
  ctx.fillStyle='#ffffff';ctx.fillText(line,right,startY+index*(titleSize*1.2));
 });
 const subtitle=$('thumbSubtitle').value.trim();
 if(subtitle){
  ctx.font='bold 31px Tahoma, Arial, sans-serif';
  ctx.fillStyle=accent;
  ctx.fillText(subtitle,right,615);
 }
 ctx.textAlign='left';ctx.direction='ltr';ctx.font='bold 20px Arial, sans-serif';
 ctx.fillStyle='rgba(255,255,255,.78)';ctx.fillText('ENTELAQTAK',70,665);
}
if(thumbCanvas){
 ['thumbTitle','thumbSubtitle','thumbAccent','thumbLayout'].forEach(id=>$(id).addEventListener('input',drawThumbnail));
 $('drawThumbnail').addEventListener('click',drawThumbnail);
 $('thumbImage').addEventListener('change',event=>{
  const file=event.target.files&&event.target.files[0];
  if(!file)return;
  if(!file.type.startsWith('image/')){notify('اختر ملف صورة صالحًا.');event.target.value='';return;}
  if(file.size>8*1024*1024){notify('حجم الصورة يجب ألا يتجاوز 8 ميجابايت.');event.target.value='';return;}
  if(thumbObjectUrl)URL.revokeObjectURL(thumbObjectUrl);
  thumbObjectUrl=URL.createObjectURL(file);
  const image=new Image();
  image.onload=()=>{thumbImage=image;drawThumbnail();};
  image.onerror=()=>notify('تعذر قراءة الصورة المحددة.');
  image.src=thumbObjectUrl;
 });
 $('clearThumbnailImage').addEventListener('click',()=>{
  thumbImage=null;
  if(thumbObjectUrl)URL.revokeObjectURL(thumbObjectUrl);
  thumbObjectUrl=null;$('thumbImage').value='';drawThumbnail();
 });
 $('downloadThumbnail').addEventListener('click',()=>{
  drawThumbnail();
  thumbCanvas.toBlob(blob=>{
   if(!blob){notify('تعذر إنشاء ملف الصورة.');return;}
   const url=URL.createObjectURL(blob),anchor=document.createElement('a');
   anchor.href=url;anchor.download='entelaqtak-thumbnail.png';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   notify('تم تجهيز الصورة للتحميل.');
  },'image/png');
 });
 $('thumbFromTitles').addEventListener('click',()=>{
  const result=$('titlesResult');
  const text=result?result.textContent.trim():'';
  if(!text||text.includes('ستظهر')||text.includes('اكتب')){notify('ولّد العناوين أولًا من أداة العناوين.');return;}
  $('thumbTitle').value=text.split(/\n/).map(line=>line.replace(/^\s*(?:\d+[\).:-]?|[-•])\s*/,'').trim()).find(Boolean)||text.slice(0,100);
  app.go('thumbnail');drawThumbnail();
 });
 drawThumbnail();
}

// Analytics report: charts and CSV from the performance records the user entered.
const analyticsView=$('view-analytics');
if(analyticsView&&!$('enhancedAnalytics')){
 const card=document.createElement('div');
 card.className='enhance-card analytics-enhanced';
 card.id='enhancedAnalytics';
 card.innerHTML='<div class="sectionrow" style="margin-top:0"><div><h3>اتجاه المشاهدات المسجلة</h3><p class="enhance-muted">ملخص محلي من الأرقام التي أدخلتها يدويًا، وليس اتصالًا مباشرًا بمنصات التواصل.</p></div><button type="button" id="exportMetricsCsv" class="mini">تصدير CSV</button></div><canvas id="metricsChart" width="1000" height="300" role="img" aria-label="رسم بياني لتغير المشاهدات المسجلة"></canvas><div id="analyticsTopPosts" class="analytics-top-posts"></div>';
 const stats=analyticsView.querySelector('.stats');
 if(stats)stats.insertAdjacentElement('afterend',card);else analyticsView.appendChild(card);
 $('exportMetricsCsv').addEventListener('click',()=>{
  const metrics=(app.getState().metrics||[]);
  if(!metrics.length){notify('لا توجد سجلات لتصديرها.');return;}
  const columns=['title','date','views','likes','comments','shares'];
  const csv='\uFEFF'+[columns.join(','),...metrics.map(item=>columns.map(key=>'"'+String(item[key]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');
  downloadFile('entelaqtak-analytics.csv',csv,'text/csv;charset=utf-8');
 });
}
function renderAnalytics(){
 const canvas=$('metricsChart');
 if(!canvas)return;
 const metrics=(app.getState().metrics||[]).filter(item=>item&&item.date);
 const byDate=new Map();
 metrics.forEach(item=>{
  const key=item.date;
  byDate.set(key,(byDate.get(key)||0)+Math.max(0,Number(item.views)||0));
 });
 const values=Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
 const rect=canvas.getBoundingClientRect();
 const dpr=Math.min(window.devicePixelRatio||1,2);
 const width=Math.max(320,Math.round((rect.width||900)*dpr));
 const height=Math.round(250*dpr);
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,width,height);
 const pad={left:54*dpr,right:20*dpr,top:18*dpr,bottom:38*dpr};
 const plotW=width-pad.left-pad.right,plotH=height-pad.top-pad.bottom;
 const max=Math.max(1,...values.map(item=>item[1]));
 ctx.font=(10*dpr)+'px Tahoma, Arial';
 ctx.textAlign='right';ctx.direction='rtl';
 for(let i=0;i<=4;i++){
  const y=pad.top+plotH*i/4;
  ctx.strokeStyle='rgba(160,175,205,.18)';ctx.lineWidth=1*dpr;
  ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.stroke();
  ctx.fillStyle='#9eacc3';ctx.fillText(Math.round(max*(1-i/4)).toLocaleString('en-US'),pad.left-7*dpr,y+3*dpr);
 }
 if(!values.length){
  ctx.textAlign='center';ctx.fillStyle='#9eacc3';
  ctx.fillText('أضف نتائج منشور لعرض الرسم البياني',width/2,height/2);
 }else{
  const gap=values.length>1?plotW/(values.length-1):0;
  const points=values.map((item,index)=>({x:pad.left+(values.length>1?gap*index:plotW/2),y:pad.top+plotH-(item[1]/max)*plotH,label:item[0].slice(5)}));
  ctx.strokeStyle='#55d6c2';ctx.lineWidth=3*dpr;ctx.beginPath();
  points.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.stroke();
  points.forEach(point=>{
   ctx.fillStyle='#8b7cf6';ctx.beginPath();ctx.arc(point.x,point.y,4*dpr,0,Math.PI*2);ctx.fill();
  });
  const labelStep=Math.max(1,Math.ceil(points.length/7));
  ctx.fillStyle='#9eacc3';ctx.textAlign='center';ctx.direction='ltr';ctx.font=(9*dpr)+'px Arial';
  points.forEach((point,index)=>{if(index%labelStep===0||index===points.length-1)ctx.fillText(point.label,point.x,height-12*dpr);});
 }
 const top=metrics.slice().sort((a,b)=>(Number(b.views)||0)-(Number(a.views)||0)).slice(0,5);
 const host=$('analyticsTopPosts');
 if(host)host.innerHTML=top.length?'<h4 style="font-size:11px;margin:7px 0">أعلى المنشورات مشاهدة في سجلاتك</h4>'+top.map(item=>'<div class="analytics-top-post"><span>'+escapeHTML(item.title||'منشور بدون عنوان')+'</span><span>'+Math.max(0,Number(item.views)||0).toLocaleString('en-US')+' مشاهدة</span></div>').join(''):'<p class="enhance-muted">لا توجد سجلات أداء حتى الآن.</p>';
}
if(typeof app.go==='function'){
 const originalGo=app.go;
 app.go=function(id){
  const result=originalGo.apply(this,arguments);
  if(id==='analytics')renderAnalytics();
  if(id==='thumbnail')drawThumbnail();
  if(id==='settings'){renderSnapshots();renderDiagnostics();}
  return result;
 };
}
if($('addMetric'))$('addMetric').addEventListener('click',()=>setTimeout(renderAnalytics,0));
window.addEventListener('resize',()=>{if(analyticsView&&analyticsView.classList.contains('active'))renderAnalytics();});
if(analyticsView)renderAnalytics();

// Search-result preview for the SEO description already generated by the app.
const seoView=$('view-seo');
if(seoView&&!$('enhancedSeoPreview')){
 const panel=document.createElement('div');
 panel.className='enhance-card';
 panel.id='enhancedSeoPreview';
 panel.innerHTML='<h3>معاينة نتيجة البحث</h3><p class="enhance-muted">راجع شكل العنوان والوصف قبل نسخ البيانات إلى المنصة. هذه معاينة شكلية وليست ترتيبًا أو نتيجة بحث فعلية.</p><div class="seo-search-preview"><small>https://sasa-antilaqatuk.github.io/entelaqtak/</small><strong id="seoPreviewTitle">عنوان المحتوى سيظهر هنا</strong><p id="seoPreviewDescription">اكتب الموضوع والوصف لمعاينة النتيجة.</p></div><p id="seoPreviewCount" class="enhance-muted" style="margin-top:9px">0 / 160 حرفًا في الوصف</p>';
 seoView.appendChild(panel);
 const updatePreview=()=>{
  const title=$('seoTopic')?$('seoTopic').value.trim():'';
  const description=$('seoDescription')?$('seoDescription').value.trim():'';
  $('seoPreviewTitle').textContent=title||'عنوان المحتوى سيظهر هنا';
  $('seoPreviewDescription').textContent=description||'اكتب الموضوع والوصف لمعاينة النتيجة.';
  $('seoPreviewCount').textContent=description.length+' / 160 حرفًا في الوصف';
 };
 ['seoTopic','seoDescription'].forEach(id=>{if($(id))$(id).addEventListener('input',updatePreview);});
 updatePreview();
}
renderSnapshots();
})();