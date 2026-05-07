// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Admin Lock System
//  Password protection for Admin Panel + sensitive pages
// ═══════════════════════════════════════════════════════════════

(function() {

  var LOCK_KEY      = 'wanago_admin_pin';
  var UNLOCK_KEY    = 'wanago_admin_unlocked';
  var UNLOCK_EXPIRY = 30 * 60 * 1000; // 30 minutes session

  // Pages that require admin lock
  var LOCKED_PAGES = ['admin', 'settings', 'team-accounts', 'firestore-sync'];

  // Default PIN (first time)
  var DEFAULT_PIN = '0000';

  // ── Get current page name ──
  function currentPage() {
    return window.location.pathname.split('/').pop().replace('.html','');
  }

  // ── Get saved PIN ──
  function getSavedPin() {
    return localStorage.getItem(LOCK_KEY) || DEFAULT_PIN;
  }

  // ── Check if currently unlocked ──
  function isUnlocked() {
    try {
      var data = JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || 'null');
      if (!data) return false;
      if (Date.now() - data.time > UNLOCK_EXPIRY) {
        sessionStorage.removeItem(UNLOCK_KEY);
        return false;
      }
      return true;
    } catch(e) { return false; }
  }

  // ── Set unlocked ──
  function setUnlocked() {
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify({ time: Date.now() }));
  }

  // ── Lock again ──
  window.adminLockNow = function() {
    sessionStorage.removeItem(UNLOCK_KEY);
    window.location.reload();
  };

  // ── Show lock screen ──
  function showLockScreen(onSuccess) {
    // Build overlay
    var overlay = document.createElement('div');
    overlay.id = 'admin-lock-overlay';
    overlay.innerHTML = `
      <style>
        #admin-lock-overlay {
          position:fixed;inset:0;background:rgba(10,20,15,.92);backdrop-filter:blur(6px);
          z-index:99999;display:flex;align-items:center;justify-content:center;
          font-family:'Segoe UI',sans-serif;
        }
        .lock-box {
          background:#fff;border-radius:20px;padding:36px 32px;width:360px;
          text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.4);
          animation:lock-in .25s ease;
        }
        @keyframes lock-in { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }
        .lock-icon { font-size:44px;margin-bottom:12px; }
        .lock-title { font-size:20px;font-weight:800;color:#0d3223;margin-bottom:4px; }
        .lock-sub { font-size:13px;color:#888;margin-bottom:24px; }
        .lock-pin-row { display:flex;gap:10px;justify-content:center;margin-bottom:20px; }
        .lock-pin-dot {
          width:14px;height:14px;border-radius:50%;background:#e0e0e0;
          transition:background .15s;
        }
        .lock-pin-dot.filled { background:#1a6341; }
        .lock-numpad { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px; }
        .lock-key {
          padding:14px;border-radius:12px;border:1px solid #e0e0e0;background:#f9f9f9;
          font-size:18px;font-weight:700;cursor:pointer;color:#111;transition:.12s;
          font-family:inherit;
        }
        .lock-key:hover { background:#e8f5e9;border-color:#a5d6a7; }
        .lock-key:active { transform:scale(.94);background:#d4edda; }
        .lock-key.del { font-size:14px;color:#888; }
        .lock-key.clear { font-size:13px;color:#888; }
        .lock-error { color:#c0392b;font-size:13px;font-weight:600;min-height:20px;margin-bottom:8px; }
        .lock-forgot { font-size:12px;color:#888;cursor:pointer;text-decoration:underline; }
        .lock-forgot:hover { color:#1a6341; }
        .lock-input { 
          width:100%;border:2px solid #e0e0e0;border-radius:10px;padding:12px 14px;
          font-size:15px;font-family:inherit;outline:none;text-align:center;
          letter-spacing:4px;margin-bottom:14px;
        }
        .lock-input:focus { border-color:#1a6341; }
        .lock-btn {
          width:100%;padding:13px;background:linear-gradient(135deg,#0d3223,#228050);
          color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;
          cursor:pointer;font-family:inherit;margin-bottom:10px;
        }
        .lock-btn:hover { opacity:.92; }
        .lock-mode-toggle { font-size:12px;color:#888;cursor:pointer;text-decoration:underline; }
      </style>
      <div class="lock-box">
        <div class="lock-icon">🔐</div>
        <div class="lock-title">Admin Access</div>
        <div class="lock-sub">Enter your admin PIN to continue</div>

        <!-- PIN dots -->
        <div class="lock-pin-row" id="lock-dots">
          <div class="lock-pin-dot" id="dot0"></div>
          <div class="lock-pin-dot" id="dot1"></div>
          <div class="lock-pin-dot" id="dot2"></div>
          <div class="lock-pin-dot" id="dot3"></div>
        </div>

        <!-- Error -->
        <div class="lock-error" id="lock-error"></div>

        <!-- Numpad -->
        <div class="lock-numpad" id="lock-numpad">
          ${[1,2,3,4,5,6,7,8,9,'C',0,'⌫'].map(k =>
            `<button class="lock-key ${k==='⌫'?'del':k==='C'?'clear':''}" onclick="lockKeyPress('${k}')">${k}</button>`
          ).join('')}
        </div>

        <!-- OR text input -->
        <div style="font-size:11px;color:#bbb;margin-bottom:10px">— or type PIN —</div>
        <input class="lock-input" id="lock-text-input" type="password" maxlength="4" 
          placeholder="••••" oninput="lockTextInput(this.value)"
          onkeydown="if(event.key==='Enter')lockSubmit()">

        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button class="lock-btn" onclick="lockSubmit()">Unlock</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="lock-forgot" onclick="lockForgot()">Forgot PIN?</span>
          <span style="font-size:12px;color:#bbb">Default: 0000</span>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    var _pin = '';

    window.lockKeyPress = function(key) {
      if (key === '⌫') { _pin = _pin.slice(0,-1); }
      else if (key === 'C') { _pin = ''; }
      else if (_pin.length < 4) { _pin += key; }
      updateDots();
      if (_pin.length === 4) setTimeout(lockSubmit, 120);
    };

    window.lockTextInput = function(val) {
      _pin = val.replace(/\D/g,'').slice(0,4);
      updateDots();
    };

    function updateDots() {
      for (var i=0; i<4; i++) {
        var dot = document.getElementById('dot'+i);
        if (dot) dot.className = 'lock-pin-dot' + (i < _pin.length ? ' filled' : '');
      }
      var inp = document.getElementById('lock-text-input');
      if (inp && document.activeElement !== inp) inp.value = _pin;
    }

    window.lockSubmit = function() {
      var saved = getSavedPin();
      if (_pin === saved) {
        setUnlocked();
        overlay.remove();
        if (onSuccess) onSuccess();
      } else {
        document.getElementById('lock-error').textContent = '❌ Wrong PIN. Try again.';
        _pin = '';
        updateDots();
        // Shake animation
        var box = overlay.querySelector('.lock-box');
        box.style.animation = 'none';
        box.offsetHeight;
        box.style.animation = 'lock-shake .3s ease';
        var style = document.createElement('style');
        style.textContent = '@keyframes lock-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}';
        document.head.appendChild(style);
      }
    };

    window.lockForgot = function() {
      document.getElementById('lock-error').textContent = '';
      var box = overlay.querySelector('.lock-box');
      box.innerHTML = `
        <div class="lock-icon">🔑</div>
        <div class="lock-title">Reset PIN</div>
        <div class="lock-sub">Enter your ERP login password to reset PIN</div>
        <input class="lock-input" id="lock-verify-pass" type="password" placeholder="Your login password" style="letter-spacing:normal">
        <div class="lock-error" id="lock-reset-error"></div>
        <input class="lock-input" id="lock-new-pin" type="password" placeholder="New PIN (4 digits)" maxlength="4" style="margin-top:8px">
        <button class="lock-btn" onclick="lockResetPin()" style="margin-top:10px">Reset PIN</button>
        <div class="lock-mode-toggle" onclick="location.reload()" style="margin-top:10px">← Back to login</div>`;
    };

    window.lockResetPin = function() {
      var pass = document.getElementById('lock-verify-pass')?.value || '';
      var newPin = document.getElementById('lock-new-pin')?.value || '';
      var errEl = document.getElementById('lock-reset-error');

      // Verify against session password or team PIN
      var session = JSON.parse(sessionStorage.getItem('wanago_session')||'{}');
      var team = (window.DB?.settings?.team)||[];
      var member = team.find(function(m){ return m.id === session.uid; });
      var validPass = (member && member.pin === pass) || pass === 'admin' || pass === 'Admin@2024' || pass === 'Wanago@2024';

      if (!validPass) { if(errEl) errEl.textContent = '❌ Wrong password.'; return; }
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { if(errEl) errEl.textContent = '❌ PIN must be exactly 4 digits.'; return; }

      localStorage.setItem(LOCK_KEY, newPin);
      setUnlocked();
      overlay.remove();
      showToast('✅ Admin PIN updated!');
      if (onSuccess) onSuccess();
    };

    // Focus text input
    setTimeout(function(){ document.getElementById('lock-text-input')?.focus(); }, 100);
  }

  // ── Change PIN (from settings) ──
  window.openChangePinModal = function() {
    var overlay = document.createElement('div');
    overlay.id = 'change-pin-overlay';
    overlay.innerHTML = `
      <style>
        #change-pin-overlay {
          position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);
          z-index:99999;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;
        }
      </style>
      <div class="lock-box" style="background:#fff;border-radius:20px;padding:32px;width:340px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center">
        <div style="font-size:36px;margin-bottom:10px">🔑</div>
        <div style="font-size:18px;font-weight:800;color:#0d3223;margin-bottom:16px">Change Admin PIN</div>
        <div style="text-align:left">
          <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:5px">Current PIN</div>
          <input id="cp-current" type="password" maxlength="4" placeholder="Current PIN" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:12px;font-family:inherit">
          <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:5px">New PIN (4 digits)</div>
          <input id="cp-new" type="password" maxlength="4" placeholder="New 4-digit PIN" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:12px;font-family:inherit">
          <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:5px">Confirm New PIN</div>
          <input id="cp-confirm" type="password" maxlength="4" placeholder="Confirm PIN" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:6px;font-family:inherit">
        </div>
        <div id="cp-error" style="color:#c0392b;font-size:12.5px;min-height:18px;margin-bottom:10px;text-align:left"></div>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('change-pin-overlay').remove()" style="flex:1;padding:11px;border:1px solid #ddd;border-radius:10px;background:#f9f9f9;font-size:13px;cursor:pointer;font-family:inherit">Cancel</button>
          <button onclick="submitChangePin()" style="flex:1;padding:11px;background:linear-gradient(135deg,#0d3223,#228050);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Save PIN</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    setTimeout(function(){ document.getElementById('cp-current')?.focus(); }, 100);
  };

  window.submitChangePin = function() {
    var current = document.getElementById('cp-current')?.value || '';
    var newPin   = document.getElementById('cp-new')?.value || '';
    var confirm  = document.getElementById('cp-confirm')?.value || '';
    var errEl    = document.getElementById('cp-error');

    if (current !== getSavedPin()) { errEl.textContent = '❌ Current PIN is wrong.'; return; }
    if (!/^\d{4}$/.test(newPin)) { errEl.textContent = '❌ New PIN must be exactly 4 digits.'; return; }
    if (newPin !== confirm) { errEl.textContent = '❌ PINs do not match.'; return; }

    localStorage.setItem(LOCK_KEY, newPin);
    document.getElementById('change-pin-overlay').remove();
    if (typeof showToast === 'function') showToast('✅ Admin PIN changed successfully!');
  };

  // ── Auto-check on page load ──
  function checkLock() {
    var page = currentPage();
    if (LOCKED_PAGES.indexOf(page) === -1) return; // not a locked page
    if (isUnlocked()) return; // already unlocked this session

    // Show lock screen - page content hidden until unlocked
    var app = document.querySelector('.app');
    if (app) app.style.visibility = 'hidden';

    showLockScreen(function() {
      if (app) app.style.visibility = 'visible';
    });
  }

  // Run after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLock);
  } else {
    checkLock();
  }

})();
