// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — FCM Push Notifications
//  Registers FCM token, handles foreground messages,
//  exposes window.showPushNotification for local triggers.
// ═══════════════════════════════════════════════════════════════
import { getApps, initializeApp }          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getMessaging, getToken, onMessage, isSupported }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

const FCM_APP_CONFIG = {
  apiKey:            'AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU',
  authDomain:        'wanago-erp.firebaseapp.com',
  projectId:         'wanago-erp',
  messagingSenderId: '445920648182',
  appId:             '1:445920648182:web:2ef6f9110767bc9f36c5d7'
};

let _messaging = null;

async function _initFCM() {
  const vapidKey = window.DB && window.DB.settings && window.DB.settings.fcmVapidKey;
  if (!vapidKey) return null;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const swReg = await navigator.serviceWorker.ready;
  const app   = getApps().length ? getApps()[0] : initializeApp(FCM_APP_CONFIG);
  _messaging   = getMessaging(app);

  const token = await getToken(_messaging, { vapidKey, serviceWorkerRegistration: swReg })
    .catch(() => null);
  if (!token) return null;

  // Persist token in DB (deduplicated)
  if (!Array.isArray(window.DB.fcmTokens)) window.DB.fcmTokens = [];
  const session = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
  const existing = window.DB.fcmTokens.find(t => t.token === token);
  if (!existing) {
    window.DB.fcmTokens.push({
      token,
      userId:       session.uid   || session.email || 'unknown',
      userName:     session.name  || session.email || 'Unknown',
      device:       /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      registeredAt: new Date().toISOString()
    });
    if (typeof window.saveDB === 'function') window.saveDB();
  }

  // Foreground message handler
  onMessage(_messaging, function(payload) {
    const n = payload.notification || {};
    const title = n.title || 'Wanago ERP';
    const body  = n.body  || '';
    // Add to activity feed
    if (window.DB && Array.isArray(window.DB.activities)) {
      window.DB.activities.push({
        id:        'push_' + Date.now(),
        type:      'info',
        message:   title + (body ? ': ' + body : ''),
        timestamp: new Date().toISOString()
      });
    }
    // Toast
    if (typeof window.showToast === 'function') window.showToast(title + (body ? ' — ' + body : ''));
    // Show browser notification for foreground (user may not be watching)
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(function(sw) {
        sw.showNotification(title, {
          body:  body,
          icon:  n.icon || '/assets/logo.jpeg',
          badge: '/assets/logo.jpeg',
          data:  { url: (payload.data && payload.data.url) || '/pages/dashboard.html' }
        });
      });
    }
  });

  return token;
}

/* ── Public: show a local push notification (no server needed) ── */
window.showPushNotification = async function(title, body, url, icon) {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  var perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return;
  const sw = await navigator.serviceWorker.ready;
  return sw.showNotification(title || 'Wanago ERP', {
    body:  body  || '',
    icon:  icon  || '/assets/logo.jpeg',
    badge: '/assets/logo.jpeg',
    tag:   'wanago-local',
    data:  { url: url || '/pages/dashboard.html' }
  });
};

/* ── Public: request permission + register FCM ── */
window.enablePushNotifications = async function() {
  if (!('Notification' in window)) {
    if (typeof window.showToast === 'function') window.showToast('Push notifications not supported in this browser');
    return false;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    if (typeof window.showToast === 'function') window.showToast('Notification permission denied');
    return false;
  }
  localStorage.setItem('wg_push_enabled', '1');
  const token = await _initFCM();
  if (typeof window.showToast === 'function') {
    window.showToast(token ? 'Push notifications enabled' : 'Push enabled (VAPID key not configured — set in Admin → Integrations)');
  }
  _syncPushBtn();
  _syncAdminPushUI();
  return true;
};

window.disablePushNotifications = function() {
  localStorage.removeItem('wg_push_enabled');
  _syncPushBtn();
  if (typeof window.showToast === 'function') window.showToast('Push notifications disabled');
};

function _syncPushBtn() {
  var btn = document.getElementById('notif-push-btn');
  if (!btn) return;
  var on = localStorage.getItem('wg_push_enabled') === '1' && Notification.permission === 'granted';
  btn.textContent = on ? 'Push On' : 'Push Off';
  btn.style.color = on ? 'var(--g600)' : '';
  btn.onclick = on ? window.disablePushNotifications : window.enablePushNotifications;
}

function _syncAdminPushUI() {
  var tokens = (window.DB && window.DB.fcmTokens) || [];
  var list = document.getElementById('push-devices-list');
  if (!list) return;
  if (!tokens.length) {
    list.innerHTML = '<div style="font-size:12px;color:var(--textd);padding:10px 0">No devices registered yet. Team members must click "Enable Push" in the notification bell.</div>';
    return;
  }
  list.innerHTML = '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--textd);margin-bottom:8px">' + tokens.length + ' Registered Device' + (tokens.length > 1 ? 's' : '') + '</div>' +
    tokens.map(function(t) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">' +
        '<span style="font-size:11px;font-weight:600;color:var(--textd)">' + (t.device === 'mobile' ? 'Mobile' : 'Desktop') + '</span>' +
        '<div style="flex:1"><div style="font-size:13px;font-weight:600">' + (t.userName || 'Unknown') + '</div><div style="font-size:10px;color:var(--textd)">' + (t.registeredAt ? new Date(t.registeredAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '') + '</div></div>' +
        '<button style="font-size:10px;color:var(--red);background:none;border:none;cursor:pointer;padding:0" onclick="window._removeFCMToken(\'' + t.token.slice(-8) + '\')">✕</button>' +
      '</div>';
    }).join('');
  var pill = document.getElementById('push-integ-pill');
  if (pill) {
    pill.style.background = 'var(--g50)'; pill.style.color = 'var(--g700)';
    pill.style.border = '1px solid var(--g200)';
    pill.textContent = '● ' + tokens.length + ' Device' + (tokens.length > 1 ? 's' : '') + ' Active';
  }
}

window._syncAdminPushUI = _syncAdminPushUI;

window._removeFCMToken = function(tokenSuffix) {
  if (!window.DB || !window.DB.fcmTokens) return;
  window.DB.fcmTokens = window.DB.fcmTokens.filter(function(t) { return !t.token.endsWith(tokenSuffix); });
  if (typeof window.saveDB === 'function') window.saveDB();
  _syncAdminPushUI();
};

/* ── Auto-init on page load ── */
window.addEventListener('load', function() {
  _syncPushBtn();
  if (localStorage.getItem('wg_push_enabled') === '1' && Notification.permission === 'granted') {
    _initFCM().catch(function() {});
  }
  // Refresh admin UI if we're on the admin page
  setTimeout(_syncAdminPushUI, 800);
});
