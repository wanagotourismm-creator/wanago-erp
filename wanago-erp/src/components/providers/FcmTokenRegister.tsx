"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, getFcmMessaging } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth.store";
import { playNotificationSound } from "@/lib/notification-sound";

const FIREBASE_CONFIG_PARAMS = new URLSearchParams({
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
}).toString();

// Requests browser push permission and registers this device's token onto
// the signed-in user's own profile — best-effort and entirely silent on
// failure (declined permission, unsupported browser, missing VAPID key all
// just mean this device won't get push; every notification still lands in
// the in-app bell regardless, see lib/notify.ts).
export function FcmTokenRegister() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.uid) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const messaging = await getFcmMessaging();
        if (!messaging || cancelled) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        // Explicit non-root scope — sw.js (the PWA caching worker) also
        // registers at "/", and two service workers fighting over the same
        // scope makes the browser perpetually think there's a pending
        // update (ServiceWorkerRegister's "Update available" banner never
        // clears, even after a refresh). Giving this one its own scope
        // stops the collision; getToken() below still works fine pointed
        // at a non-root-scoped registration.
        const registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?${FIREBASE_CONFIG_PARAMS}`,
          { scope: "/firebase-cloud-messaging-push-scope" }
        );

        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        if (!token || cancelled) return;

        await updateDoc(doc(db, "users", user.uid), { fcmTokens: arrayUnion(token) });

        unsubscribe = onMessage(messaging, (payload) => {
          if (Notification.permission !== "granted") return;
          const title = payload.notification?.title || "Wanago ERP";
          const body  = payload.notification?.body  || "";
          new Notification(title, { body, icon: "/icons/icon-192.png" });
          // The OS-level Notification above is silent/inconsistent across
          // browsers (the Notification API's `sound` option isn't
          // supported anywhere) — play the same loud in-app chime the bell
          // uses so a foreground push is actually audible.
          playNotificationSound();
        });
      } catch {
        // Best-effort — push is an enhancement, never a requirement.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.uid]);

  return null;
}
