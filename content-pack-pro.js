(()=>{'use strict';
const $=id=>document.getElementById(id),app=window.EntelaqtakApp,view=$('view-studio');
if(!app||!view||!$('studioOutput'))return;
const outputMarkup=[
'<section id="cp-assets" class="panel cp-panel">',
'<div class="cp-head"><div><span class="cp-kicker">CONTENT MULTIPLIER</span><h3>مشتقات الحزمة — محتوى من نفس الفكرة</h3><p>ثلاث نسخ قصيرة ومنشور مجتمع وتعليق مثبت، مع ملاحظات إنتاج ومراجعة للادعاءات.</p></div><span class="cp-mark">✦</span></div>',
'<div class="cp-assets-grid">',
'<label class="cp-output"><span>3 نسخ قصيرة — Shorts / Reels</span><textarea id="studioShorts" rows="11" placeholder="اضغط «حسّن الحزمة بالذكاء الاصطناعي» لإنشاء 3 نسخ قصيرة مختلفة..."></textarea><button type="button" data-cp-copy="studioShorts">نسخ النسخ القصيرة</button></label>',
'<label class="cp-output"><span>منشور مجتمع YouTube</span><textarea id="studioCommunityPost" rows="7" placeholder="منشور يفتح نقاشًا مرتبطًا بالفيديو..."></textarea><button type="button" data-cp-copy="studioCommunityPost">نسخ المنشور</button></label>',
'<label class="cp-output"><span>التعليق المثبّت</span><textarea id="studioPinnedComment" rows="5" placeholder="سؤال أو دعوة نقاش أسفل الفيديو..."></textarea><button type="button" data-cp-copy="studioPinnedComment">نسخ التعليق</button></label>',
'<label class="cp-output"><span>دعوة التفاعل (CTA)</span><textarea id="studioCTAOutput" rows="4" placeholder="دعوة طبيعية مرتبطة بهدف المحتوى..."></textarea><button type="button" data-cp-copy="studioCTAOutput">نسخ الدعوة</button></label>',
'<label class="cp-output"><span>ملاحظات المونتاج والإيقاع</span><textarea id="studioEditorNotes" rows="6" placeholder="إيقاع مقترح، نقاط تحتاج إبرازًا، وأماكن دعم بصري..."></textarea><button type="button" data-cp-copy="studioEditorNotes">نسخ الملاحظات</button></label>',
'<label class="cp-output cp-warning"><span>مراجعة الادعاءات وما يحتاج مصدرًا</span><textarea id="studioFactWarnings" rows="6" placeholder="نقاط تحتاج تحققًا أو مصدرًا قبل التسجيل..."></textarea><button type="button" data-cp-copy="studioFactWarnings">نسخ نقاط التحقق</button></label>',
'</div><div class="cp-foot"><span>المخرجات مسودات تحريرية وليست ضمانًا للوصول أو المشاهدات.</span><button type="button" id="cpDownloadMarkdown">تحميل الحزمة بصيغة Markdown</button></div></section>'
].join('');
$('studioOutput').insertAdjacentHTML('afterend',outputMarkup);
const titleBox=$('studioTitles'),scriptBox=$('studioScript');
if(titleBox)titleBox.insertAdjacentHTML('afterend','<div id="cp-title-audit" class="cp-audit" aria-live="polite"><b>مراجعة تحريرية للعناوين</b><p>سيظهر تقييم إرشادي بعد إنشاء العناوين.</p></div>');
if(scriptBox)scriptBox.insertAdjacentHTML('afterend','<div id="cp-script-stats" class="cp-script-stats"><span>0 كلمة</span><span>0 دقيقة تقريبًا</span><span>السكريبت لم يبدأ بعد</span></div>');
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function words(v){return String(v||'').trim().split(/\s+/).filter(Boolean).length;}
function titleScore(t,topic){
const s=String(t||'').trim(),n=s.length;let score=25,why=[];
if(n>=24&&n<=68){score+=20;why.push('طول متوازن');}else if(n>0){score+=8;why.push(n<24?'يحتاج تفاصيل أكثر':'يفضل اختصاره');}
if(topic&&s.toLowerCase().includes(String(topic).toLowerCase().slice(0,Math.min(12,topic.length)))){score+=18;why.push('الموضوع واضح');}
if(/\d|واحد|اثنين|ثلاث|أربع|خمس|أول|أفضل/.test(s)){score+=10;why.push('فيه تحديد');}
if(/[؟:]/.test(s)||/كيف|لماذا|ليه|إزاي|هل|دليل|قصة|أسباب/.test(s)){score+=12;why.push('زاوية تشد الفضول');}
if(/مضمون|مستحيل|لن تصدق|صدمة|سر خطير|الأفضل في التاريخ|100%/.test(s)){score-=18;why.push('راجع صياغة الوعد حتى لا تكون مضللة');}
if((s.match(/!/g)||[]).length>1){score-=5;why.push('قلّل علامات التعجب');}
return{score:Math.max(0,Math.min(100,score)),why:why.length?why.join(' · '):'اجعل الفائدة المحددة أوضح'};
}
function auditTitles(){
const box=$('cp-title-audit'),raw=titleBox?.textContent||'';if(!box)return;
const topic=$('studioTopic')?.value||'',items=raw.split(/\n/).map(x=>x.replace(/^\s*\d+[.)\-]\s*/,'').trim()).filter(Boolean);
if(!items.length){box.innerHTML='<b>مراجعة تحريرية للعناوين</b><p>سيظهر تقييم إرشادي بعد إنشاء العناوين.</p>';return;}
box.innerHTML='<b>مراجعة تحريرية — ليست توقعًا للمشاهدات أو CTR</b>'+items.slice(0,7).map(t=>{const r=titleScore(t,topic);return '<div class="cp-score-row"><span>'+esc(t)+'</span><strong>'+r.score+'/100</strong><small>'+esc(r.why)+'</small></div>';}).join('');
}
function updateScriptStats(){
const text=scriptBox?.value||'',count=words(text),minutes=count/125,duration=$('studioDuration')?.value||'',stat=$('cp-script-stats');if(!stat)return;
const timeLabel=minutes<1?Math.max(1,Math.round(minutes*60))+' ثانية':minutes.toFixed(1)+' دقيقة تقريبًا';
const match=duration.match(/(\d+)\s*[–-]\s*(\d+)/),target=match?(duration.includes('ثانية')?'المدة المستهدفة: '+match[1]+'–'+match[2]+' ثانية':'المدة المستهدفة: '+match[1]+'–'+match[2]+' دقائق'):'تقدير على سرعة 125 كلمة/دقيقة';
stat.innerHTML='<span>'+count.toLocaleString('ar-EG')+' كلمة</span><span>'+timeLabel+'</span><span>'+esc(target)+'</span>';
}
function val(id){return $(id)?.value||'';}
function buildMarkdown(){
const topic=val('studioTopic')||'حزمة محتوى',titles=(titleBox?.textContent||'').trim();
return '# '+topic+'\n\n**المجال:** '+val('studioNiche')+'  \n**المنصة:** '+val('studioPlatform')+'  \n**الجمهور:** '+val('studioAudience')+'  \n**الهدف:** '+val('studioGoal')+'\n\n## القيمة المقدمة\n'+val('studioPromise')+'\n\n## الخطاف\n'+($('studioHook')?.textContent||'')+'\n\n## العناوين\n'+titles+'\n\n## السكريبت\n'+val('studioScript')+'\n\n## الوصف\n'+val('studioDescription')+'\n\n## الكلمات المفتاحية والهاشتاجات\n'+($('studioKeywords')?.textContent||'')+'\n\n## الصورة المصغّرة\n'+($('studioThumbnail')?.textContent||'')+'\n\n## قائمة اللقطات\n'+($('studioShots')?.textContent||'')+'\n\n## النسخ القصيرة\n'+val('studioShorts')+'\n\n## منشور المجتمع\n'+val('studioCommunityPost')+'\n\n## التعليق المثبت\n'+val('studioPinnedComment')+'\n\n## دعوة التفاعل\n'+val('studioCTAOutput')+'\n\n## ملاحظات المونتاج\n'+val('studioEditorNotes')+'\n\n## نقاط تحقق قبل النشر\n'+val('studioFactWarnings')+'\n';
}
async function copyText(text){
try{await navigator.clipboard.writeText(text);app.toast('تم النسخ.');}
catch(e){const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');app.toast('تم النسخ.');}catch(_){app.toast('تعذر النسخ تلقائيًا؛ حدّد النص وانسخه.');}t.remove();}
}
function downloadMarkdown(){const blob=new Blob([buildMarkdown()],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='entelaqtak-content-pack.md';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function fillExtras(p){
if(!p)return;
[['studioShorts','shortsText'],['studioCommunityPost','communityPost'],['studioPinnedComment','pinnedComment'],['studioCTAOutput','ctaOutput'],['studioEditorNotes','editorNotes'],['studioFactWarnings','factWarnings']].forEach(([id,key])=>{if($(id))$(id).value=p[key]||'';});
auditTitles();updateScriptStats();
}
function saveExtras(){
const id=$('studioOutput')?.dataset.packId;if(!id)return;
const current=app.getState(),extra={shortsText:val('studioShorts'),communityPost:val('studioCommunityPost'),pinnedComment:val('studioPinnedComment'),ctaOutput:val('studioCTAOutput'),editorNotes:val('studioEditorNotes'),factWarnings:val('studioFactWarnings'),promise:val('studioPromise'),goal:val('studioGoal'),avoid:val('studioAvoid')};
const at=current.packs.findIndex(p=>String(p.id)===String(id));if(at<0)return;
current.packs[at]={...current.packs[at],...extra};app.save();
}
document.addEventListener('input',e=>{if(e.target?.id==='studioScript')updateScriptStats();if(e.target?.id==='studioTitles')auditTitles();});
const observer=new MutationObserver(auditTitles);if(titleBox)observer.observe(titleBox,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',e=>{
const copy=e.target.closest('[data-cp-copy]');if(copy){copyText(val(copy.getAttribute('data-cp-copy')));return;}
if(e.target.closest('#cpDownloadMarkdown')){downloadMarkdown();return;}
if(e.target.closest('#generateStudio')){
const topic=val('studioTopic');
if(topic){
$('studioShorts').value='لم تُنشأ النسخ القصيرة بعد. اضغط «حسّن الحزمة بالذكاء الاصطناعي» لتوليد 3 نصوص مختلفة من نفس الفكرة.';
$('studioCommunityPost').value='سؤال للنقاش حول '+topic+': إيه أكتر نقطة حابب تعرف عنها؟';
$('studioPinnedComment').value='اكتب سؤالك أو تجربتك حول '+topic+'، وهنراجع الأسئلة لاختيار موضوعات قادمة.';
$('studioCTAOutput').value='شاركنا رأيك أو تجربتك في التعليقات، واشترك لمتابعة الموضوعات المرتبطة.';
$('studioEditorNotes').value='ابدأ بإيقاع سريع في المقدمة، ثم بدّل بين التعليق الصوتي واللقطات التوضيحية. احذف أي تكرار لا يضيف معلومة.';
$('studioFactWarnings').value='راجع الأسماء والأرقام والتواريخ من مصادر أصلية قبل التسجيل. لا تعتمد على المسودة باعتبارها تحققًا من الحقائق.';
auditTitles();updateScriptStats();
}
return;
}
if(e.target.closest('#saveStudio')){saveExtras();return;}
const load=e.target.closest('[data-loadpack]');
if(load){const p=app.getState().packs.find(x=>String(x.id)===String(load.getAttribute('data-loadpack')));if(p){fillExtras(p);if(p.promise&&$('studioPromise'))$('studioPromise').value=p.promise;if(p.goal&&$('studioGoal'))$('studioGoal').value=p.goal;if(p.avoid&&$('studioAvoid'))$('studioAvoid').value=p.avoid;}return;}
});
document.addEventListener('entelaqtak:content-pack-updated',()=>{auditTitles();updateScriptStats();});
setTimeout(()=>{auditTitles();updateScriptStats();},0);
})();