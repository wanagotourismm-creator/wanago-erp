// FCM background-message handler — separate from sw.js (which only does
// static-asset caching) because Firebase's compat SDK needs to run inside
// the service worker itself to show a notification while the app isn't
// open/focused. This file lives in /public untouched by Next's build, so
// it can't read process.env — FcmTokenRegister.tsx passes the public
// (safe-to-expose) Firebase config as query params on registration instead,
// read here via self.location.search.
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
  apiKey:            params.get("apiKey"),
  authDomain:        params.get("authDomain"),
  projectId:         params.get("projectId"),
  storageBucket:      params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId:             params.get("appId"),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Wanago ERP";
  const body  = payload.notification?.body  || payload.data?.body  || "";
  const link  = payload.fcmOptions?.link || payload.data?.link || "/";

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(link) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
