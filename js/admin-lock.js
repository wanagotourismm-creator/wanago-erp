// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Admin Lock (Firebase Auth based)
//  No more local PIN — uses Firebase password to unlock
// ═══════════════════════════════════════════════════════════════

(function() {
  var UNLOCK_KEY    = 'wanago_admin_unlocked';
  var UNLOCK_EXPIRY = 60 * 60 * 1000; // 1 hour session
  var LOCKED_PAGES  = ['admin', 'settings', 'team-accounts', 'firestore-sync'];
  var FB_BASE       = 'https://www.gstatic.com/firebasejs/10.12.0';
  var API_KEY       = 'AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU';

  function currentPage() {
    return window.location.pathname.split('/').pop().replace('.html','');
  }

  function isUnlocked() {
    try {
      // Check 1: unlock token exists and not expired
      var data = JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || 'null');
      if (!data) return false;
      if (Date.now() - data.time > UNLOCK_EXPIRY) {
        sessionStorage.removeItem(UNLOCK_KEY);
        return false;
      }
      // Check 2: current user must be an admin role
      // This prevents sessionStorage tampering — even if someone sets
      // wanago_admin_unlocked manually, they still need an admin session
      try {
        var sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
        var adminRoles = ['founder','ceo','co_founder','director','admin'];
        if (!sess || !sess.role) return false;
        if (adminRoles.indexOf(sess.role) === -1) {
          sessionStorage.removeItem(UNLOCK_KEY);
          return false;
        }
        // Check 3: unlock token must have been issued for this user
        if (data.uid && sess.uid && data.uid !== sess.uid) {
          sessionStorage.removeItem(UNLOCK_KEY);
          return false;
        }
      } catch(e) { return false; }
      return true;
    } catch(e) { return false; }
  }

  function setUnlocked() {
    var sess = {};
    try { sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}'); } catch(e) {}
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify({
      time: Date.now(),
      uid:  sess.uid || null,   // bind token to specific user
    }));
  }

  window.adminLockNow = function() {
    sessionStorage.removeItem(UNLOCK_KEY);
    window.location.reload();
  };

  // ── Open Change Password Modal (for admin security tab) ──
  window.openChangePinModal = function() {
    if (typeof window.openChangePasswordModal === 'function') {
      window.openChangePasswordModal();
    } else {
      alert('Change your password using the "Change Password" option in the sidebar.');
    }
  };

  function showLockScreen(onSuccess) {
    var sess = {};
    try { sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}'); } catch(e) {}
    var userEmail = sess.email || '';
    var userName  = sess.name  || 'Admin';

    var overlay = document.createElement('div');
    overlay.id = 'admin-lock-overlay';
    overlay.innerHTML = `
      <style>
        #admin-lock-overlay {
          position:fixed;inset:0;background:rgba(10,20,15,.95);backdrop-filter:blur(8px);
          z-index:99999;display:flex;align-items:center;justify-content:center;
          font-family:'Segoe UI',system-ui,sans-serif;
        }
        .lock-box {
          background:#fff;border-radius:20px;padding:36px 32px;width:380px;max-width:94vw;
          text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.5);
          animation:lock-in .25s ease;
        }
        @keyframes lock-in { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }
        .lock-icon { font-size:48px;margin-bottom:12px; }
        .lock-title { font-size:20px;font-weight:800;color:#0d3223;margin-bottom:4px; }
        .lock-sub { font-size:13px;color:#888;margin-bottom:24px;line-height:1.5; }
        .lock-input {
          width:100%;border:2px solid #e0e0e0;border-radius:10px;padding:12px 14px;
          font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;
          margin-bottom:12px;transition:border-color .2s;
        }
        .lock-input:focus { border-color:#1a6341; }
        .lock-btn {
          width:100%;padding:13px;background:linear-gradient(135deg,#0d3223,#228050);
          color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;
          cursor:pointer;font-family:inherit;margin-bottom:10px;transition:opacity .15s;
        }
        .lock-btn:hover { opacity:.9; }
        .lock-btn:disabled { opacity:.6;cursor:not-allowed; }
        .lock-error { color:#c0392b;font-size:12.5px;min-height:18px;margin-bottom:10px;text-align:left;font-weight:500; }
        .lock-success { color:#1a6341;font-size:12.5px;min-height:18px;margin-bottom:10px;text-align:left;font-weight:500; }
        .lock-user-badge {
          display:flex;align-items:center;gap:10px;background:#f0f7f4;border:1px solid #c8e6c9;
          border-radius:10px;padding:10px 14px;margin-bottom:20px;text-align:left;
        }
        .lock-av { width:36px;height:36px;border-radius:9px;background:#1a6341;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0; }
      </style>
      <div class="lock-box">
        <div class="lock-icon">Lock</div>
        <div class="lock-title">Admin Panel</div>
        <div class="lock-sub">Re-enter your password to access<br>the admin panel</div>

        <div class="lock-user-badge">
          <div class="lock-av">${userName[0]?userName[0].toUpperCase():'A'}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#0d3223">${userName}</div>
            <div style="font-size:11.5px;color:#888">${userEmail}</div>
          </div>
        </div>

        <div style="text-align:left;margin-bottom:4px">
          <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:6px">Password</label>
          <div style="position:relative">
            <input class="lock-input" id="lock-password-input" type="password"
              placeholder="Enter your Firebase password"
              onkeydown="if(event.key==='Enter')lockVerify()"
              style="margin-bottom:0;padding-right:44px">
            <button onclick="var i=document.getElementById('lock-password-input');i.type=i.type==='password'?'text':'password'" type="button"
              style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:11px;font-weight:600;color:#888">Show</button>
          </div>
        </div>

        <div class="lock-error" id="lock-error"></div>
        <div class="lock-success" id="lock-success"></div>

        <button class="lock-btn" id="lock-verify-btn" onclick="lockVerify()">Unlock Admin Panel</button>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <span style="font-size:12px;color:#aaa;cursor:pointer;text-decoration:underline" onclick="lockForgotPassword()">Forgot password?</span>
          <span style="font-size:12px;color:#aaa;cursor:pointer;text-decoration:underline" onclick="sessionStorage.removeItem('wanago_session');window.location.href='../index.html'">Switch account</span>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    window.lockVerify = function() {
      var password = (document.getElementById('lock-password-input').value || '').trim();
      var errEl = document.getElementById('lock-error');
      var sucEl = document.getElementById('lock-success');
      var btn   = document.getElementById('lock-verify-btn');
      errEl.textContent = ''; sucEl.textContent = '';

      if (!password) { errEl.textContent = 'Please enter your password.'; return; }
      if (!userEmail) { errEl.textContent = 'No session found. Please log in again.'; return; }

      btn.textContent = 'Verifying...'; btn.disabled = true;

      // Verify using Firebase Auth REST API
      var url = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        var res = {};
        try { res = JSON.parse(xhr.responseText); } catch(e) {}
        if (xhr.status === 200 && res.idToken) {
          sucEl.textContent = 'Verified!';
          setUnlocked();
          setTimeout(function() {
            overlay.remove();
            if (onSuccess) onSuccess();
          }, 400);
        } else {
          var fbErrs = {
            'INVALID_PASSWORD':      'Wrong password. Try again.',
            'INVALID_EMAIL':         'Invalid email in session.',
            'USER_DISABLED':         'Account disabled.',
            'TOO_MANY_ATTEMPTS_TRY_LATER': 'Too many attempts. Try again later.',
            'INVALID_LOGIN_CREDENTIALS': 'Wrong password. Try again.',
          };
          var msg = (res.error && res.error.message) || 'UNKNOWN';
          errEl.textContent = fbErrs[msg] || msg;
          btn.textContent = 'Unlock Admin Panel'; btn.disabled = false;
        }
      };
      xhr.onerror = function() {
        errEl.textContent = 'Network error. Check your connection.';
        btn.textContent = 'Unlock Admin Panel'; btn.disabled = false;
      };
      xhr.send(JSON.stringify({ email: userEmail, password: password, returnSecureToken: true }));
    };

    window.lockForgotPassword = function() {
      var errEl = document.getElementById('lock-error');
      var sucEl = document.getElementById('lock-success');
      if (!userEmail) { errEl.textContent = 'No email in session.'; return; }
      var url = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' + API_KEY;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        if (xhr.status === 200) {
          sucEl.textContent = 'Reset email sent to ' + userEmail + '. Check your inbox!';
        } else {
          errEl.textContent = 'Could not send reset email.';
        }
      };
      xhr.send(JSON.stringify({ requestType: 'PASSWORD_RESET', email: userEmail }));
    };

    setTimeout(function() { document.getElementById('lock-password-input')?.focus(); }, 100);
  }

  function checkLock() {
    var page = currentPage();
    if (LOCKED_PAGES.indexOf(page) === -1) return;
    if (isUnlocked()) return;

    var app = document.querySelector('.app');
    if (app) app.style.visibility = 'hidden';

    showLockScreen(function() {
      if (app) {
        app.style.visibility = 'visible';
        if (!app.classList.contains('loaded')) app.classList.add('loaded');
        var loader = document.getElementById('page-loader');
        if (loader) loader.classList.add('fade-out');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLock);
  } else {
    checkLock();
  }
})();
