(()=>{'use strict';
const STORAGE_KEY='entelaqtak-theme-v3';
const root=document.documentElement;
const $=id=>document.getElementById(id);
const palettes={
 aurora:{label:'أزرق ملكي',primary:'#2563EB',secondary:'#38BDF8'},
 ocean:{label:'أزرق المحيط',primary:'#0EA5E9',secondary:'#2563EB'},
 sunset:{label:'نيلي هادئ',primary:'#4F46E5',secondary:'#60A5FA'},
 emerald:{label:'تركواز عميق',primary:'#0F766E',secondary:'#38BDF8'},
 rose:{label:'سماوي بنفسجي',primary:'#3B82F6',secondary:'#818CF8'},
 sapphire:{label:'ليلي سماوي',primary:'#1D4ED8',secondary:'#22D3EE'}
};
const toggle=$('themeToggle'),panel=$('themePanel'),close=$('themeClose');
const primaryInput=$('themePrimary'),secondaryInput=$('themeSecondary');
const status=$('themeStatus');
if(!toggle||!panel||!primaryInput||!secondaryInput)return;
const hexToRgb=value=>{
 const hex=String(value||'').replace('#','');
 if(!/^[0-9a-f]{6}$/i.test(hex))return '37,99,235';
 return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).join(',');
};
const safeColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?value:fallback;
function applyTheme(name,primary,secondary,save=true){
 const preset=palettes[name]||palettes.aurora;
 primary=safeColor(primary,preset.primary);
 secondary=safeColor(secondary,preset.secondary);
 root.dataset.theme=name;
 root.style.setProperty('--theme-primary',primary,'important');
 root.style.setProperty('--theme-secondary',secondary,'important');
 root.style.setProperty('--theme-primary-rgb',hexToRgb(primary),'important');
 root.style.setProperty('--theme-secondary-rgb',hexToRgb(secondary),'important');
 root.style.setProperty('--accent',primary,'important');
 root.style.setProperty('--accent2',secondary,'important');
 root.style.setProperty('--workspace-violet',primary,'important');
 root.style.setProperty('--workspace-mint',secondary,'important');
 primaryInput.value=primary;
 secondaryInput.value=secondary;
 document.querySelectorAll('[data-theme]').forEach(button=>{
  if(button.classList.contains('theme-preset'))button.setAttribute('aria-pressed',String(name===button.dataset.theme));
 });
 if(status)status.textContent=name==='custom'?'ألوانك المخصصة مفعّلة':'ثيم '+preset.label+' مفعّل';
 if(save){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({name,primary,secondary}));}catch(error){}}
}
function readSaved(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(saved&&typeof saved==='object'){
   const name=saved.name==='custom'?'custom':(palettes[saved.name]?saved.name:'aurora');
   if(name==='custom')return {name,primary:safeColor(saved.primary,'#2563EB'),secondary:safeColor(saved.secondary,'#38BDF8')};
   const p=palettes[saved.name];
   if(p)return {name:saved.name,primary:safeColor(saved.primary,p.primary),secondary:p.secondary};
  }
 }catch(error){}
 return {name:'aurora',primary:palettes.aurora.primary,secondary:palettes.aurora.secondary};
}
function openPanel(){
 panel.hidden=false;
 toggle.setAttribute('aria-expanded','true');
 const active=panel.querySelector('[aria-pressed="true"]');
 if(active)active.focus({preventScroll:true});
}
function closePanel(returnFocus=false){
 panel.hidden=true;
 toggle.setAttribute('aria-expanded','false');
 if(returnFocus)toggle.focus({preventScroll:true});
}
toggle.addEventListener('click',()=>panel.hidden?openPanel():closePanel());
if(close)close.addEventListener('click',()=>closePanel(true));
document.addEventListener('click',event=>{
 if(!panel.hidden&&!panel.contains(event.target)&&!toggle.contains(event.target))closePanel();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!panel.hidden){closePanel(true);}
});
panel.querySelectorAll('.theme-preset').forEach(button=>{
 button.addEventListener('click',()=>{
  const name=button.dataset.theme,preset=palettes[name];
  if(preset)applyTheme(name,preset.primary,preset.secondary);
 });
});
function applyCustom(){
 applyTheme('custom',primaryInput.value,secondaryInput.value);
}
primaryInput.addEventListener('input',applyCustom);
secondaryInput.addEventListener('input',applyCustom);
$('themeReset')?.addEventListener('click',()=>{
 const preset=palettes.aurora;
 applyTheme('aurora',preset.primary,preset.secondary);
});
const saved=readSaved();
applyTheme(saved.name,saved.primary,saved.secondary,false);
})();