const C='zipo-v10',SHELL=['/','/index.html','/manifest.json','/icon-192.png','/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!='GET'||new URL(r.url).origin!=location.origin)return;
e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{});return res}).catch(()=>caches.match(r).then(m=>m||caches.match('/index.html'))))});

/* Push: показываем уведомление, только если приложение сейчас не на экране */
self.addEventListener('push',e=>{
  let d={};try{d=e.data.json()}catch{}
  e.waitUntil((async()=>{
    const cl=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    if(cl.some(c=>c.visibilityState=='visible'&&c.focused))return;
    const call=d.k=='call';
    await self.registration.showNotification(d.t||'Zipo',{
      body:d.b||'',icon:'/icon-192.png',badge:'/icon-192.png',
      tag:(d.k=='msg'?'m':'c')+(d.u||''),renotify:true,requireInteraction:call,
      vibrate:call?[500,200,500,200,500,200,500]:[200,100,200],
      data:{u:d.u,k:d.k}
    });
  })());
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const u=e.notification.data&&e.notification.data.u;
  e.waitUntil((async()=>{
    const cl=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    if(cl.length){const c=cl[0];try{await c.focus()}catch{}u&&c.postMessage({open:u});return}
    await self.clients.openWindow(u?'/#chat='+u:'/');
  })());
});
