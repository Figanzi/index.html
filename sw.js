const CACHE = 'figanzi-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // No cachear llamadas a Supabase
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => 
        new Response(JSON.stringify({error:'offline'}), { 
          headers: { 'Content-Type': 'application/json' } 
        })
      )
    );
    return;
  }
  
  // Cache First para fuentes de Google
  if (e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        return caches.open(CACHE).then(c => { c.put(e.request, res.clone()); return res; });
      }))
    );
    return;
  }
  
  // Network First para el resto
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const cloned = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cloned));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
