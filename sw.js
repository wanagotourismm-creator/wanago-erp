// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Service Worker v4 (Performance Optimized)
//
//  IMPROVEMENTS OVER v3:
//  1. Cache versioning tied to deploy — stale files auto-cleared
//  2. Core shell cached immediately on install
//  3. Network-first for HTML, cache-first for JS/CSS assets
//  4. Firebase SDK served from CDN cache — not intercepted
//  5. Offline fallback page
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
  const _fcmMsg = self.firebase.messaging();
  _fcmMsg.onBackgroundMessage(function(payload) {
    const n = payload.notification || {};
    return self.registration.showNotification(n.title || 'Wanago ERP', {
      body:  n.body  || '',
      icon:  '/assets/logo.jpeg',
      badge: '/assets/logo.jpeg',
      tag:   'wanago-push',
      data:  { url: (payload.data && payload.data.url) || '/pages/dashboard.html' },
    });
  });
} catch(e) {}

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/pages/dashboard.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        if ('focus' in cls[i]) { return cls[i].focus(); }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : null;
    })
  );
});

// ── Cache Strategy ────────────────────────────────────────────
// Version stamp — increment this to bust cache on every deploy
// This is automatically set by the deploy script
const CACHE_VER  = 'wanago-v4';
const CACHE_NAME = CACHE_VER;

// Core shell — cached immediately on install
const CORE_SHELL = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/design-system.css',
  '/js/config.js',
  '/js/constants.js',
  '/js/helpers.js',
  '/js/utils.js',
  '/js/services.js',
  '/js/store.js',
  '/js/firestore.js',
  '/js/db.js',
  '/js/sidebar.js',
  '/js/rbac.js',
  '/js/notify.js',
  '/assets/logo.jpeg',
];

// Page shells — cached on first visit
const PAGE_EXTENSIONS = ['.html', '.js', '.css'];

// Never cache — always fetch from network
const BYPASS_PATTERNS = [
  'firebasejs',         // Firebase CDN
  'googleapis.com',     // Google APIs
  'gstatic.com',        // Google static
  'fonts.googleapis',   // Google Fonts
  'firestore.googleapis',
  'identitytoolkit',
  'securetoken.google',
  'analytics',
];

function shouldBypass(url) {
  return BYPASS_PATTERNS.some(function(p) { return url.includes(p); });
}

function isAsset(url) {
  return PAGE_EXTENSIONS.some(function(ext) { return url.includes(ext); });
}

// ── Install — cache core shell ────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache what we can — ignore failures for individual assets
      return Promise.allSettled(
        CORE_SHELL.map(function(url) {
          return cache.add(url).catch(function() {
            console.warn('[SW] Failed to cache:', url);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting(); // activate immediately
    })
  );
});

// ── Activate — clear old caches ───────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME; // delete ALL old cache versions
        }).map(function(key) {
          console.log('[SW] Clearing old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim(); // take control immediately
    })
  );
});

// ── Fetch — smart caching strategy ───────────────────────────
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Always bypass Firebase/Google URLs
  if (shouldBypass(url)) return;

  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // HTML pages: network-first, fall back to cache
  if (url.includes('.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // JS/CSS assets: cache-first, fall back to network
  if (isAsset(url)) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(res) {
          if (res.ok) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
          }
          return res;
        });
      })
    );
    return;
  }
});

// ── Message handler ───────────────────────────────────────────
// Listen for cache bust message from app after deploy
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(function() {
      console.log('[SW] Cache cleared on request');
    });
  }
});
