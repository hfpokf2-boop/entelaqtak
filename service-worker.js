'use strict';
const CACHE_NAME='entelaqtak-shell-v23';
const APP_FILES=['./','./index.html','./workspace.html','./ui-polish.css','./design-system.css','./theme.js','./creator-suite.js','./enhancements.js','./platform-hub.js','./production-studio.js','./sidebar-organizer.js','./content-pack-pro.js','./visitor-tracker.js','./manifest.webmanifest','./app-icon.svg','./favicon.svg','./legal.html','./advertise.html'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await Promise.all(APP_FILES.map(async file=>{
   try{await cache.add(new Request(file,{cache:'reload'}));}
   catch(error){console.warn('Optional app-shell cache failed:',file);}
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('entelaqtak-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const fresh=await fetch(request);
    if(fresh&&fresh.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,fresh.clone());}
    return fresh;
   }catch(error){
    return (await caches.match(request))||(await caches.match('./workspace.html'))||(await caches.match('./index.html'))||Response.error();
   }
  })());
  return;
 }
 if(url.pathname.includes('/entelaqtak/')||url.pathname===self.location.pathname.replace(/service-worker\.js$/,'')){
  event.respondWith((async()=>{
   const cached=await caches.match(request);
   const refresh=fetch(request).then(async response=>{
    if(response&&response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());}
    return response;
   }).catch(()=>null);
   return cached||(await refresh)||Response.error();
  })());
 }
});