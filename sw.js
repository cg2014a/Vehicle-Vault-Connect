const CACHE_NAME = 'vehicle-vault-v44';
const ROOT = new URL('./', self.registration.scope).href;
const APP_SHELL = [ROOT, './index.html', './style.css', './app.js', './manifest.webmanifest', './assets/hero-suv.png', './assets/vehicle-vault-icon.png', './assets/default-vehicle-card-v2.png'].map(path => new URL(path, self.registration.scope).href);
const APP_SHELL_URLS = new Set(APP_SHELL);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const fallback = request.mode === 'navigate' ? await cache.match(ROOT) : null;
    return (await cache.match(request)) || fallback || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const appShellRequest = url.origin === self.location.origin && (request.mode === 'navigate' || APP_SHELL_URLS.has(url.href));

  // Fresh document, JavaScript, and CSS are always preferred; cached files are the offline fallback.
  if (appShellRequest) return event.respondWith(networkFirst(request));

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (url.origin === self.location.origin && response.ok) cache.put(request, response.clone());
    return response;
  })());
});
