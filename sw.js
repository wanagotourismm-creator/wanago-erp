// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Service Worker
//  Caches static assets for offline capability.
//  Strategy: cache-first for assets, network-first for HTML.
//  Firebase SDK and external CDN requests are never intercepted.
//  Also handles FCM background push notifications.
// ═══════════════════════════════════════════════════════════════

/* ── FCM Background Push ── */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
  if (!self.firebase.apps.length) {
    self.firebase.initializeApp({
      apiKey:            'AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU',
      authDomain:        'wanago-erp.firebaseapp.com',
      projectId:         'wanago-erp',
      messagingSenderId: '445920648182',
      appId:             '1:445920648182:web:2ef6f9110767bc9f36c5d7'
    });
  }
  const _fcmMessaging = self.firebase.messaging();
  _fcmMessaging.onBackgroundMessage(function(payload) {
    const n = payload.notification || {};
    return self.registration.showNotification(n.title || 'Wanago ERP', {
      body:  n.body  || '',
      icon:  n.icon  || '/assets/logo.jpeg',
      badge: '/assets/logo.jpeg',
      tag:   'wanago-push',
      data:  { url: (payload.data && payload.data.url) || '/pages/dashboard.html' }
    });
  });
} catch (e) { /* FCM not available in this context */ }

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/pages/dashboard.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        if ('focus' in cls[i]) { cls[i].navigate && cls[i].navigate(url); return cls[i].focus(); }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : null;
    })
  );
});

const CACHE_NAME   = 'wanago-v3';
const OFFLINE_PAGE = '/index.html';

// Static assets to pre-cache on install
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/styles/login.css',
  '/assets/logo-white.png',
  '/assets/logo-transparent.png',
  '/assets/logo.jpeg',
  '/js/sidebar.js',
  '/js/utils.js',
  '/js/db.js',
  '/js/ai.js',
  '/js/automation.js',
  '/pages/dashboard.html',
  '/pages/leads.html',
  '/pages/bookings.html',
  '/pages/customers.html',
  '/pages/payments.html',
  '/pages/invoices.html',
  '/pages/expenses.html',
];

// Hostnames to NEVER intercept (Firebase, CDNs)
const BYPASS_HOSTS = [
  'firebaseapp.com',
  'googleapis.com',
  'gstatic.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'graph.facebook.com',
  'gmail.googleapis.com',
];

function shouldBypass(url) {
  try {
    const u = new URL(url);
    return BYPASS_HOSTS.some(h => u.hostname.endsWith(h));
  } catch (e) { return false; }
}

/* ── Install: pre-cache static assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Use individual adds so one failure doesn't break install
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

/* ── Activate: clean up old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: smart caching strategy ── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip Firebase and external CDN requests
  if (shouldBypass(request.url)) return;

  const url = new URL(request.url);

  // HTML pages: network-first (always serve latest version)
  if (request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_PAGE)))
    );
    return;
  }

  // JS/CSS: network-first so deployed fixes are picked up immediately.
  if (['script','style'].includes(request.destination)) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images/fonts: cache-first is fine for heavy static assets.
  if (['image','font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }
});
