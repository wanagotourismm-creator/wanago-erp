// ═══════════════════════════════════════════════════════════════
//  WANAGO — Notification Center
//  Bell icon injected into topbar · Activity feed · Smart alerts
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window._notifInit) return;
  window._notifInit = true;

  var READ_KEY = 'wg_notif_read_v1';

  /* ── Notification Sound ── */
  function playNotifSound(type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'alert') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Soft ding for normal notifications
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch(e) { /* audio not supported */ }
  }
  window.playNotifSound = playNotifSound;



  /* ── CSS ── */
  var css = `
    #notif-wrap{position:relative;flex-shrink:0}
    #notif-btn{
      width:36px;height:36px;border-radius:10px;
      background:#f4f8f6;border:1px solid #dce8e2;
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:background .15s;position:relative;
    }
    #notif-btn:hover{background:#e4f0e9}
    #notif-btn svg{width:17px;height:17px;color:#4a8c6a}
    #notif-badge{
      position:absolute;top:-5px;right:-5px;
      background:#e74c3c;color:#fff;
      font-size:9px;font-weight:800;
      min-width:17px;height:17px;border-radius:9px;
      display:flex;align-items:center;justify-content:center;
      padding:0 3px;border:2px solid #fff;pointer-events:none;
    }
    #notif-panel{
      display:none;position:absolute;top:calc(100% + 10px);right:0;
      width:340px;background:#fff;border-radius:14px;
      box-shadow:0 8px 40px rgba(0,0,0,.14),0 0 0 1px rgba(0,0,0,.06);
      z-index:5000;overflow:hidden;
    }
    #notif-panel.open{display:block;animation:npIn .15s ease}
    @keyframes npIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
    #np-head{
      display:flex;align-items:center;justify-content:space-between;
      padding:13px 16px 10px;border-bottom:1px solid #eef3ef;
    }
    #np-head-title{font-size:14px;font-weight:700;color:#1a1a1a}
    .np-tabs{display:flex;gap:4px}
    .np-tab{
      font-size:11px;padding:3px 10px;border-radius:20px;cursor:pointer;
      background:#f4f8f6;color:#7fa592;border:1px solid #dce8e2;
      font-family:inherit;transition:all .15s;
    }
    .np-tab.on{background:#2a7a4f;color:#fff;border-color:#2a7a4f}
    #np-mark-all{font-size:11px;color:#4a8c6a;background:none;border:none;cursor:pointer;padding:0;font-family:inherit;margin-left:6px}
    #np-scroll{max-height:320px;overflow-y:auto}
    .np-item{
      display:flex;align-items:flex-start;gap:10px;
      padding:11px 16px;border-bottom:1px solid #f4f8f6;
      cursor:pointer;transition:background .1s;
    }
    .np-item:last-child{border-bottom:none}
    .np-item:hover{background:#f9fbf9}
    .np-item.unread{background:#f0f7f3}
    .np-dot{width:8px;height:8px;border-radius:50%;background:#2a7a4f;flex-shrink:0;margin-top:5px}
    .np-dot.r{background:#d0ddd8}
    .np-dot.warning{background:#e67e22}
    .np-dot.error,.np-dot.danger{background:#e74c3c}
    .np-dot.success{background:#27ae60}
    .np-msg{font-size:12px;color:#1a1a1a;line-height:1.45;flex:1}
    .np-ts{font-size:10px;color:#9ab4a8;margin-top:3px}
    #np-empty{padding:40px 16px;text-align:center;color:#9ab4a8;font-size:13px}
    #np-foot{border-top:1px solid #eef3ef;padding:10px 16px;text-align:center}
    #np-foot a{font-size:12px;color:#2a7a4f;text-decoration:none;font-weight:500}
    #np-foot a:hover{text-decoration:underline}
    /* Alerts */
    .np-alert{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #f4f8f6;transition:background .1s}
    .np-alert:hover{background:#f9fbf9}
    .np-ai{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
    .np-ai.warn{background:#fff4e5}.np-ai.info{background:#e8f3fd}.np-ai.danger{background:#fdf0ef}.np-ai.ok{background:#eaf5ee}
    .np-al{font-size:12px;font-weight:600;color:#1a1a1a}
    .np-as{font-size:11px;color:#9ab4a8;margin-top:1px}
    .np-av{margin-left:auto;font-size:11px;color:#2a7a4f;background:none;border:1px solid #2a7a4f;border-radius:6px;padding:3px 8px;cursor:pointer;font-family:inherit;white-space:nowrap}
  `;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ── Build DOM ── */
  var wrap = document.createElement('div'); wrap.id = 'notif-wrap';
  wrap.innerHTML = `
    <div id="notif-btn" title="Notifications  (press N)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <div id="notif-badge" style="display:none">0</div>
    </div>
    <div id="notif-panel">
      <div id="np-head">
        <span id="np-head-title">Notifications</span>
        <div style="display:flex;align-items:center">
          <div class="np-tabs">
            <button class="np-tab on" onclick="npTab('activity',this)">Activity</button>
            <button class="np-tab"    onclick="npTab('alerts',this)">Alerts</button>
          </div>
          <button id="np-mark-all" onclick="npMarkAll()">Mark all read</button>
        </div>
      </div>
      <div id="np-scroll"></div>
      <div id="np-foot" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <a href="#" onclick="if(typeof goTo==='function')goTo('dashboard');npClose();return false">View all activity →</a>
        <button id="notif-push-btn" style="font-size:11px;color:var(--textd);background:none;border:1px solid var(--border);border-radius:6px;padding:3px 9px;cursor:pointer;font-family:inherit;flex-shrink:0">🔕 Push Off</button>
      </div>
    </div>`;

  /* ── Inject into topbar when ready ── */
  var _tab = 'activity';

  function _inject() {
    var ta = document.querySelector('.topbar-actions');
    if (!ta) return false;
    ta.insertBefore(wrap, ta.firstChild);
    return true;
  }

  if (!_inject()) {
    var obs = new MutationObserver(function() { if (_inject()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ── Helpers ── */
  function _rset() { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)||'[]')); } catch(e) { return new Set(); } }
  function _wsave(s) { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(s).slice(-600))); }
  function _db() { return window.DB || {}; }

  function _ago(ts) {
    if (!ts) return '';
    var m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (m <  1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function _e(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ── Smart alerts — use Automation Engine when loaded ── */
  function _alerts() {
    if (typeof window.WanagoAutomation !== 'undefined') {
      try { return window.WanagoAutomation.evaluate(); } catch(e) {}
    }
    var db = _db();
    var today = new Date();
    var list = [];

    // Overdue / unpaid invoices
    (db.invoices||[]).filter(function(inv){ return inv.status==='unpaid'||inv.status==='overdue'; }).slice(0,6).forEach(function(inv) {
      var due = inv.dueDate ? new Date(inv.dueDate) : null;
      var od  = due && due < today;
      list.push({
        icon: od ? '⚠️' : '🧾', cls: od ? 'danger' : 'warn',
        label: (od ? 'Overdue: ' : 'Payment due: ') + _e(inv.ref || 'Invoice'),
        sub: '₹' + Number(inv.total||inv.amount||0).toLocaleString('en-IN') + (due ? ' · Due ' + due.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''),
        page: 'invoices'
      });
    });

    // Bookings departing within 7 days
    (db.bookings||[]).forEach(function(bk) {
      if (!bk.travelDate) return;
      var diff = Math.ceil((new Date(bk.travelDate) - today) / 86400000);
      if (diff >= 0 && diff <= 7) {
        list.push({
          icon:'📅', cls:'info',
          label: 'Departure in ' + diff + ' day' + (diff===1?'':'s') + ': ' + _e(bk.customerName||'Customer'),
          sub: (bk.ref||'') + (bk.destination ? ' · ' + bk.destination : ''),
          page: 'bookings'
        });
      }
    });

    // Birthdays today / in 3 days
    var allPeople = (db.customers||[]).concat(db.leads||[]);
    allPeople.forEach(function(p) {
      var dob = p.dob || p.birthday; if (!dob) return;
      var bd = new Date(dob);
      var next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(today.getFullYear()+1);
      var diff = Math.ceil((next - today) / 86400000);
      if (diff === 0) list.push({icon:'🎂',cls:'ok',  label:'Birthday today: '+_e(p.name),sub:'Send a birthday wish!',page:'customers'});
      else if (diff <= 3) list.push({icon:'🎉',cls:'info',label:'Birthday in '+diff+'d: '+_e(p.name),sub:'Prepare a personalised message',page:'customers'});
    });

    // Anniversaries
    allPeople.forEach(function(p) {
      var ann = p.anniversary; if (!ann) return;
      var ad = new Date(ann);
      var next = new Date(today.getFullYear(), ad.getMonth(), ad.getDate());
      if (next < today) next.setFullYear(today.getFullYear()+1);
      var diff = Math.ceil((next - today) / 86400000);
      if (diff <= 3) list.push({icon:'💍',cls:'ok',label:(diff===0?'Anniversary today':'Anniversary in '+diff+'d')+': '+_e(p.name),sub:'Send an anniversary greeting',page:'customers'});
    });

    return list;
  }

  /* ── Render ── */
  function npRender() {
    var scroll = document.getElementById('np-scroll');
    var badge  = document.getElementById('notif-badge');
    if (!scroll) return;

    if (_tab === 'alerts') {
      var al = _alerts();
      if (!al.length) {
        scroll.innerHTML = '<div id="np-empty">✅ No alerts right now</div>';
      } else {
        scroll.innerHTML = al.map(function(a) {
          return '<div class="np-alert">'
            + '<div class="np-ai '+a.cls+'">'+a.icon+'</div>'
            + '<div><div class="np-al">'+a.label+'</div><div class="np-as">'+a.sub+'</div></div>'
            + (a.page ? '<button class="np-av" onclick="if(typeof goTo===\'function\')goTo(\''+a.page+'\');npClose()">View</button>' : '')
            + '</div>';
        }).join('');
      }
      return;
    }

    // Activity tab
    var db   = _db();
    var acts = (db.activities||[]).slice().reverse().slice(0, 50);
    var rs   = _rset();
    var unread = acts.filter(function(a){ return !rs.has(a.id); }).length;

    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.style.display = unread > 0 ? 'flex' : 'none';

    if (!acts.length) {
      scroll.innerHTML = '<div id="np-empty">No activity yet</div>';
      return;
    }

    scroll.innerHTML = acts.map(function(a) {
      var isRead = rs.has(a.id);
      var dotCls = isRead ? 'r' : (a.type||'');
      var ts     = a.timestamp || a.time || a.ts || '';
      return '<div class="np-item'+(isRead?'':' unread')+'" onclick="npRead(\''+a.id+'\')">'
        + '<div class="np-dot '+dotCls+'"></div>'
        + '<div><div class="np-msg">'+_e(a.message||a.msg||'')+'</div>'
        + '<div class="np-ts">'+_ago(ts)+'</div></div>'
        + '</div>';
    }).join('');
  }

  /* ── Public API ── */
  window.npTab = function(tab, el) {
    _tab = tab;
    wrap.querySelectorAll('.np-tab').forEach(function(t){ t.classList.toggle('on', t===el); });
    npRender();
  };

  window.npRead = function(id) {
    var s = _rset(); s.add(id); _wsave(s); npRender();
  };

  window.npMarkAll = function() {
    var db = _db(); var s = _rset();
    (db.activities||[]).forEach(function(a){ s.add(a.id); });
    _wsave(s); npRender();
  };

  window.npClose = function() {
    var p = document.getElementById('notif-panel');
    if (p) p.classList.remove('open');
  };

  function _toggle() {
    var p = document.getElementById('notif-panel');
    if (!p) return;
    if (p.classList.contains('open')) { p.classList.remove('open'); }
    else { p.classList.add('open'); npRender(); }
  }

  document.getElementById('notif-btn').addEventListener('click', function(e) {
    e.stopPropagation(); _toggle();
  });

  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) npClose();
  });

  // Press N to toggle
  document.addEventListener('keydown', function(e) {
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey
        && document.activeElement.tagName !== 'INPUT'
        && document.activeElement.tagName !== 'TEXTAREA'
        && document.activeElement.tagName !== 'SELECT') {
      _toggle();
    }
  });

  // Refresh badge every 60s
  setInterval(function() {
    var p = document.getElementById('notif-panel');
    if (p && !p.classList.contains('open')) npRender();
  }, 60000);

  /* ── Global push notification function ── */
  window.pushNotification = function(opts) {
    // opts: { title, message, type, sound }
    // type: 'info' | 'success' | 'warning' | 'alert'
    var type = opts.type || 'info';
    // Play sound
    if (opts.sound !== false && typeof playNotifSound === 'function') {
      playNotifSound(type === 'alert' || type === 'warning' ? 'alert' : 'ding');
    }
    // Show browser notification if allowed
    if (window.Notification && Notification.permission === 'granted') {
      try {
        new Notification(opts.title || 'Wanago', {
          body: opts.message || '',
          icon: '/favicon.ico'
        });
      } catch(e) {}
    }
    // Re-render notification panel
    npRender();
    // Update badge
    updateBadge();
  };

  /* ── Request browser notification permission ── */
  window.requestNotifPermission = function() {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };
  // Auto-request on load
  setTimeout(function() { window.requestNotifPermission && window.requestNotifPermission(); }, 2000);

  window.addEventListener('load', npRender);
})();
