(()=>{'use strict';
const STORAGE_KEY='entelaqtak-theme-v1';
const root=document.documentElement;
const $=id=>document.getElementById(id);
const palettes={
 aurora:{label:'البنفسجي',primary:'#9b8cff',secondary:'#62e0c5'},
 ocean:{label:'المحيطي',primary:'#5aa9ff',secondary:'#4de0d0'},
 sunset:{label:'الغروب',primary:'#ff9b72',secondary:'#ffd166'},
 emerald:{label:'الزمردي',primary:'#56c998',secondary:'#c1df73'},
 rose:{label:'الوردي',primary:'#e78ab8',secondary:'#93a7ff'},
 sapphire:{label:'الياقوتي',primary:'#688cff',secondary:'#62d8ed'}
};
const toggle=$('themeToggle'),panel=$('themePanel'),close=$('themeClose');
const primaryInput=$('themePrimary'),secondaryInput=$('themeSecondary');
const status=$('themeStatus');
if(!toggle||!panel||!primaryInput||!secondaryInput)return;
const hexToRgb=value=>{
 const hex=String(value||'').replace('#','');
 if(!/^[0-9a-f]{6}$/i.test(hex))return '155,140,255';
 return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).join(',');
};
const safeColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?value:fallback;
function applyTheme(name,primary,secondary,save=true){
 const preset=palettes[name]||palettes.aurora;
 primary=safeColor(primary,preset.primary);
 secondary=safeColor(secondary,preset.secondary);
 root.dataset.theme=name;
 root.style.setProperty('--theme-primary',primary);
 root.style.setProperty('--theme-secondary',secondary);
 root.style.setProperty('--theme-primary-rgb',hexToRgb(primary));
 root.style.setProperty('--theme-secondary-rgb',hexToRgb(secondary));
 root.style.setProperty('--accent',primary);
 root.style.setProperty('--accent2',secondary);
 root.style.setProperty('--workspace-violet',primary);
 root.style.setProperty('--workspace-mint',secondary);
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
   if(name==='custom')return {name,primary:safeColor(saved.primary,'#9b8cff'),secondary:safeColor(saved.secondary,'#62e0c5')};
   const p=palettes[saved.name];
   if(p)return {name:saved.name,primary:safeColor(saved.primary,p.primary),secondary:safeColor(saved.secondary,p.secondary)};
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