// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Login Page
// ═══════════════════════════════════════════════════════════════

// Check if already logged in - redirect immediately, no flicker
(function() {
  var sess = sessionStorage.getItem('wanago_session');
  if (sess) {
    window.location.replace('pages/dashboard.html');
  }
})();

// ── Login handler ──
function handleLogin() {
  var email    = (document.getElementById('login-email')?.value || '').trim();
  var password = document.getElementById('login-password')?.value || '';
  var btn      = document.getElementById('login-btn');

  if (!email || !password) { showMsg('Please enter email and password.', false); return; }

  btn.textContent = 'Signing in...';
  btn.disabled = true;

  // ── Try team member match (PIN login) ──
  var matched = null;
  try {
    var DB_RAW = localStorage.getItem('wanago_erp_v3');
    if (DB_RAW) {
      var db = JSON.parse(DB_RAW);
      var team = db.settings && db.settings.team ? db.settings.team : [];

      // Match email + PIN
      matched = team.find(function(m) {
        return m.email && m.email.toLowerCase() === email.toLowerCase() && m.pin && m.pin === password;
      });

      // Match email + any password if account has firebaseUid (Firebase user)
      if (!matched) {
        matched = team.find(function(m) {
          return m.email && m.email.toLowerCase() === email.toLowerCase() && m.firebaseUid;
        });
        if (matched) {
          // Has Firebase account — try Firebase auth
          tryFirebaseLogin(email, password, matched, btn);
          return;
        }
      }
    }
  } catch(e) {}

  // ── Default admin fallback ──
  if (!matched) {
    var isAdminEmail = email === 'admin@wanago.in' || email === 'wanagotourismm@gmail.com';
    var isAdminPass  = password === 'admin' || password === 'Admin@2024' || password === 'Wanago@2024';
    if (isAdminEmail || isAdminPass) {
      matched = { id:'t1', name:'Admin', role:'founder', dept:'leadership', officeId:'*', systemRole:'founder_ceo', email:email };
    }
  }

  if (matched) {
    doLogin(matched, email, btn);
  } else {
    showMsg('Wrong email or password. Contact your admin.', false);
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

// ── Try Firebase login (for users with Firebase accounts) ──
function tryFirebaseLogin(email, password, member, btn) {
  // Dynamically load Firebase only when needed
  Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
    import('../firebase/firebase-config.js')
  ]).then(function(modules) {
    var signIn = modules[1].signInWithEmailAndPassword;
    var auth   = modules[2].auth;
    return signIn(auth, email, password);
  }).then(function() {
    doLogin(member, email, btn);
  }).catch(function(e) {
    var errs = {
      'auth/wrong-password':     'Wrong password.',
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/too-many-requests':  'Too many attempts. Try again later.',
      'auth/user-not-found':     'No account found.',
    };
    showMsg(errs[e.code] || 'Login failed. Try again.', false);
    btn.textContent = 'Sign In';
    btn.disabled = false;
  });
}

// ── Save session and redirect ──
function doLogin(member, email, btn) {
  var session = {
    uid:        member.id || 't1',
    name:       member.name || 'Admin',
    email:      email,
    role:       member.role || 'founder',
    dept:       member.dept || 'leadership',
    officeId:   member.officeId || '*',
    systemRole: member.systemRole || 'founder_ceo',
    loginTime:  new Date().toISOString()
  };
  sessionStorage.setItem('wanago_session', JSON.stringify(session));
  showMsg('✅ Welcome ' + session.name + '!', true);
  setTimeout(function() {
    window.location.href = 'pages/dashboard.html';
  }, 500);
}

// ── Forgot password ──
function handleForgotPassword() {
  var email = (document.getElementById('login-email')?.value || '').trim();
  if (!email) { showMsg('Enter your email first.', false); return; }
  Promise.all([
    import('../firebase/firebase-config.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
  ]).then(function(modules) {
    var cfg    = modules[0];
    var fbAuth = modules[1];
    if (!cfg.auth) throw new Error('not_configured');
    return fbAuth.sendPasswordResetEmail(cfg.auth, email);
  }).then(function() {
    showMsg('✅ Password reset email sent to ' + email + '. Check your inbox.', true);
  }).catch(function(e) {
    if (e.code === 'auth/user-not-found') {
      showMsg('No Firebase account found for this email. Ask your admin to reset your PIN in the Admin Panel → Team.', false);
    } else if (e.code === 'auth/invalid-email') {
      showMsg('Invalid email address.', false);
    } else if (e.message === 'not_configured') {
      showMsg('Firebase not configured. Ask your admin to reset your PIN via Admin Panel → Team → Edit Member.', false);
    } else {
      showMsg('Could not send reset email. Ask your admin to reset your PIN via Admin Panel → Team.', false);
    }
  });
}

// ── Toggle password visibility ──
function togglePassword() {
  var input  = document.getElementById('login-password');
  var btn    = document.querySelector('.toggle-pw');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁';
  }
}

// ── Show message ──
function showMsg(msg, ok) {
  var el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.fontSize = '13px';
  el.style.marginTop = '10px';
  el.style.background = ok ? 'rgba(34,128,80,.08)' : 'rgba(192,57,43,.08)';
  el.style.color = ok ? '#1a6341' : '#c0392b';
  el.style.border = '1px solid ' + (ok ? 'rgba(34,128,80,.2)' : 'rgba(192,57,43,.2)');
}

function onKeyDown(e) { if (e.key === 'Enter') handleLogin(); }

window.handleLogin = handleLogin;
window.handleForgotPassword = handleForgotPassword;
window.togglePassword = togglePassword;
window.onKeyDown = onKeyDown;
