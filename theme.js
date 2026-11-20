(()=>{'use strict';
const STORAGE_KEY='entelaqtak-theme-v2';
const root=document.documentElement;
const $=id=>document.getElementById(id);
const palettes={
 aurora:{label:'وردي ولافندر',primary:'#8065C4',secondary:'#98527F'},
 ocean:{label:'لافندر هادئ',primary:'#7057B1',secondary:'#88486F'},
 sunset:{label:'وردي غامق',primary:'#98527F',secondary:'#7057B1'},
 emerald:{label:'موف ملكي',primary:'#735BAF',secondary:'#98527F'},
 rose:{label:'وردي فاتح',primary:'#98527F',secondary:'#8065C4'},
 sapphire:{label:'ليلي عميق',primary:'#66569A',secondary:'#98527F'}
};
const toggle=$('themeToggle'),panel=$('themePanel'),close=$('themeClose');
const primaryInput=$('themePrimary'),secondaryInput=$('themeSecondary');
const status=$('themeStatus');
if(!toggle||!panel||!primaryInput||!secondaryInput)return;
const hexToRgb=value=>{
 const hex=String(value||'').replace('#','');
 if(!/^[0-9a-f]{6}$/i.test(hex))return '183,154,247';
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
   if(name==='custom')return {name,primary:safeColor(saved.primary,'#98527F'),secondary:safeColor(saved.secondary,'#88486F')};
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