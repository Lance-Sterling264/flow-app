/* Joyl service worker: offline shell + font cache + notification click. Bump VER to force an update. */
const VER = 'joyl-v2', SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  /* page loads: network first (so updates arrive), cache when offline */
  if (r.mode === 'navigate' && u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put('./index.html', cp)); return res; })
      .catch(() => caches.match('./index.html').then(m => m || caches.match('./'))));
    return;
  }
  /* own static files + fonts: stale-while-revalidate. Google APIs / sign-in are never touched. */
  if (u.origin === location.origin || FONT_HOSTS.includes(u.hostname)) {
    e.respondWith(caches.open(VER).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cl => {
    for (const c of cl) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./index.html?tab=day');
  }));
});
