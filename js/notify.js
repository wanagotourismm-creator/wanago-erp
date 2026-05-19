// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Real-time Notification System
//  Listens to Firestore notifications collection
//  Plays sound, shows badge, shows toast
// ═══════════════════════════════════════════════════════════════

(function() {
  if (window._notifyInit) return;
  window._notifyInit = true;

  const FB_BASE = 'https://www.gstatic.com/firebasejs/10.12.0';
  const FB_CFG  = { apiKey:"AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU", authDomain:"wanago-erp.firebaseapp.com", projectId:"wanago-erp", storageBucket:"wanago-erp.firebasestorage.app", messagingSenderId:"445920648182", appId:"1:445920648182:web:2ef6f9110767bc9f36c5d7" };

  let _lastCheck = Date.now();
  let _unread = 0;
  let _offListener = null;

  // ── Sound Engine ──
  function playSound(type) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'alert') {
        // Urgent 3-beep
        [0, 0.15, 0.30].forEach(function(t) {
          osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        });
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.55);
      } else if (type === 'success') {
        // Happy ding-dong
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      } else {
        // Soft single ding
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.20, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.30);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.30);
      }
    } catch(e) {}
  }
  window.playNotifSound = playSound;

  // ── Badge updater ──
  function updateBadge(count) {
    _unread = count || 0;
    var badges = document.querySelectorAll('.notif-badge, #notif-count, .notification-count');
    badges.forEach(function(b) {
      b.textContent  = _unread > 0 ? (_unread > 99 ? '99+' : _unread) : '';
      b.style.display = _unread > 0 ? '' : 'none';
    });
    // Update page title
    if (_unread > 0) {
      document.title = '(' + _unread + ') ' + document.title.replace(/^\(\d+\)\s*/, '');
    } else {
      document.title = document.title.replace(/^\(\d+\)\s*/, '');
    }
  }

  // ── Toast notification ──
  function showNotifToast(notif) {
    var typeColors = { info:'#2196f3', success:'#4caf50', warning:'#ff9800', alert:'#f44336' };
    var typeIcons  = { info:'ℹ️', success:'✅', warning:'⚠️', alert:'🚨' };
    var type  = notif.type || 'info';
    var color = typeColors[type] || '#2196f3';
    var icon  = typeIcons[type]  || 'ℹ️';

    var toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:99999',
      'background:#fff', 'border-left:4px solid ' + color,
      'border-radius:10px', 'padding:14px 18px',
      'box-shadow:0 8px 32px rgba(0,0,0,.18)',
      'display:flex', 'align-items:flex-start', 'gap:12px',
      'max-width:360px', 'animation:slideInRight .3s ease',
      'font-family:system-ui,sans-serif',
    ].join(';');

    toast.innerHTML =
      '<div style="font-size:20px;flex-shrink:0;margin-top:1px">' + icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:3px">' + (notif.title || 'Notification') + '</div>' +
        '<div style="font-size:12px;color:#666;line-height:1.5">' + (notif.message || '') + '</div>' +
        '<div style="font-size:10.5px;color:#aaa;margin-top:4px">Just now</div>' +
      '</div>' +
      '<div onclick="this.parentNode.remove()" style="cursor:pointer;color:#aaa;font-size:18px;flex-shrink:0;line-height:1">×</div>';

    // Add animation CSS once
    if (!document.getElementById('notif-toast-css')) {
      var s = document.createElement('style');
      s.id  = 'notif-toast-css';
      s.textContent = '@keyframes slideInRight{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}';
      document.head.appendChild(s);
    }

    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.transition = 'opacity .4s,transform .4s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      setTimeout(function() { try { toast.remove(); } catch(e) {} }, 400);
    }, 5000);
  }

  // ── Browser push notification ──
  function sendBrowserNotif(notif) {
    if (!window.Notification || Notification.permission !== 'granted') return;
    try {
      new Notification(notif.title || 'Wanago ERP', {
        body:  notif.message || '',
        icon:  '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        tag:   notif.id || 'wanago',
      });
    } catch(e) {}
  }

  // ── Request browser permission ──
  function requestPermission() {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ── Listen to Firestore notifications ──
  async function startListening() {
    try {
      const [{ initializeApp, getApps }, { getFirestore, collection, query, where, orderBy, limit, onSnapshot }] = await Promise.all([
        import(FB_BASE + '/firebase-app.js'),
        import(FB_BASE + '/firebase-firestore.js')
      ]);

      const apps   = getApps();
      const app    = apps.length ? apps[0] : initializeApp(FB_CFG);
      const db     = getFirestore(app);
      const sess   = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
      const userId = sess.uid;
      if (!userId) return;

      // FIXED: use dynamic compId from firestore.js; fallback to hardcoded
      const _notifyCompId = (typeof window._fsCompId === 'function' ? window._fsCompId() : null) || 'wanago-erp';
      const col   = collection(db, \`companies/\${_notifyCompId}/notifications\`);
      const q     = query(col, orderBy('sentAt', 'desc'), limit(50));

      _offListener = onSnapshot(q, function(snap) {
        var newUnread = 0;
        snap.docChanges().forEach(function(change) {
          if (change.type === 'added') {
            const n = change.doc.data();
            const ts = n.sentAt?.toDate ? n.sentAt.toDate().getTime() : 0;
            // Only alert for notifications sent after we loaded the page
            if (ts > _lastCheck) {
              // Check if this notification targets us
              var isForMe = n.target === 'all' ||
                (n.target === 'specific' && n.targetMemberId === userId) ||
                (n.target === 'managers' && ['founder_ceo','admin','reporting_manager'].includes(window.currentUser?.systemRole)) ||
                (n.target === 'agents' && window.currentUser?.systemRole === 'employee');

              if (isForMe) {
                showNotifToast(n);
                playSound(n.type === 'alert' ? 'alert' : n.type === 'success' ? 'success' : 'ding');
                sendBrowserNotif(n);
              }
            }
            // Count unread
            if (!n.readBy || !n.readBy[userId]) newUnread++;
          }
        });
        updateBadge(newUnread);
      });
    } catch(e) {
      console.warn('[notify.js] Firestore listen failed:', e.message);
    }
  }

  // ── Global send notification ──
  window.sendNotification = async function(opts) {
    // opts: { title, message, type, target, targetMemberId }
    try {
      const [{ initializeApp, getApps }, { getFirestore, collection, addDoc, serverTimestamp }] = await Promise.all([
        import(FB_BASE + '/firebase-app.js'),
        import(FB_BASE + '/firebase-firestore.js')
      ]);
      const apps = getApps();
      const app  = apps.length ? apps[0] : initializeApp(FB_CFG);
      const db   = getFirestore(app);
      const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
      const _notifyCompId2 = (typeof window._fsCompId === 'function' ? window._fsCompId() : null) || 'wanago-erp';
      await addDoc(collection(db, \`companies/\${_notifyCompId2}/notifications\`), {
        title:          opts.title || 'Notification',
        message:        opts.message || '',
        type:           opts.type || 'info',
        target:         opts.target || 'all',
        targetMemberId: opts.targetMemberId || null,
        sentBy:         sess.name || 'System',
        sentById:       sess.uid  || 'system',
        sentAt:         serverTimestamp(),
        readBy:         {},
      });
    } catch(e) { console.warn('[notify.js] send failed:', e.message); }
  };

  // ── Auto-notify on key events ──
  window.notifyEvent = function(event, data) {
    var msgs = {
      'lead_created':       { title:'🎯 New Lead', message: (data.name||'A lead') + ' added by ' + (window.currentUser?.name||'team'), type:'info' },
      'booking_confirmed':  { title:'✅ Booking Confirmed', message: (data.ref||'Booking') + ' confirmed for ' + (data.customerName||'customer'), type:'success' },
      'payment_received':   { title:'💰 Payment Received', message: '₹' + (data.amount||0) + ' received for ' + (data.bookingRef||'booking'), type:'success' },
      'payment_overdue':    { title:'⚠️ Payment Overdue', message: (data.customerName||'Customer') + ' has overdue payment of ₹' + (data.amount||0), type:'alert' },
      'followup_due':       { title:'📞 Follow-up Due', message: 'Follow up with ' + (data.name||'lead') + ' today', type:'warning' },
      'visa_expiring':      { title:'🛂 Visa Expiring', message: (data.name||'Customer') + '\'s visa expires soon', type:'alert' },
      'departure_today':    { title:'✈️ Departure Today', message: (data.customerName||'Customer') + ' departs today — ' + (data.ref||''), type:'alert' },
    };
    var msg = msgs[event];
    if (!msg) return;
    window.sendNotification({ ...msg, target: 'all' });
  };

  // ── Start ──
  requestPermission();
  // Start listening after a short delay (let Firestore init first)
  setTimeout(startListening, 2000);

})();

console.log('[notify.js] Notification system loaded ✅');
