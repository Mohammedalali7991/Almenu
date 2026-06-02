const CACHE_NAME = 'almenu-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// تثبيت التطبيق وحفظ الملفات الأساسية
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// تشغيل التطبيق وجلب البيانات حتى لو كان الإنترنت ضعيفاً
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

