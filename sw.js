// اسم ذاكرة التخزين المؤقت - يتم تغييره عند تحديث التطبيق لتحديث الكاش تلقائياً
const CACHE_NAME = 'almenu-cache-v2';

// الملفات الثابتة المراد تخزينها للعمل بدون إنترنت أو لتسريع التصفح
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './cashier.html',
  './dashboard.html',
  './app.js',
  './manifest.json',
  './logo.png'
];

// 1. حدث التثبيت: حفظ الملفات الأساسية في الذاكرة المؤقتة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] جاري حفظ الملفات الثابتة في الكاش...');
      return cache.addAll(ASSETS);
    })
  );
  // إجبار الـ Service Worker الجديد على التنشيط فوراً دون انتظار إغلاق التبويبات القديمة
  self.skipWaiting();
});

// 2. حدث التفعيل: تنظيف وحذف أي كاش قديم لتجنب تضارب الملفات
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log(`[Service Worker] جاري حذف الكاش القديم: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // جعل الـ Service Worker يتحكم في الصفحة فوراً
  self.clients.claim();
});

// 3. حدث جلب البيانات: إدارة الطلبات الذكية (الشبكة أولاً للملفات الحيوية)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // حماية: استثناء روابط Firebase والطلبات الخارجية الحية من الكاش تماماً لضمان وصول الطلبات فوراً
  if (requestUrl.origin.includes('firebaseio.com') || event.request.method !== 'GET') {
    return; // اترك المتصفح يجلبها مباشرة من الشبكة دون تدخل
  }

  // استراتيجية Network-First للملفات النصية وصفحات الويب لضمان تحديث المنيو والطلبات
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // إذا نجحت الشبكة، قم بتحديث الكاش بالنسخة الجديدة وأعد الاستجابة
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // في حال انقطاع الإنترنت التام، يتم القراءة من الكاش كملاذ أخير
        return caches.match(event.request);
      })
  );
});
