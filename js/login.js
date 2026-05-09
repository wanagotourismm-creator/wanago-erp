// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Login Module (Fixed)
//  Properly resolves team member roles from DB on Firebase login
// ═══════════════════════════════════════════════════════════════

// Redirect if already logged in
(function () {
  var sess = sessionStorage.getItem('wanago_session');
  if (sess) { window.location.replace('pages/dashboard.html'); }
})();

const FB_BASE = 'https://www.gstatic.com/firebasejs/10.12.0';
const FB_CFG = {
  apiKey: "AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU",
  authDomain: "wanago-erp.firebaseapp.com",
  projectId: "wanago-erp",
  storageBucket: "wanago-erp.firebasestorage.app",
  messagingSenderId: "445920648182",
  appId: "1:445920648182:web:2ef6f9110767bc9f36c5d7"
};

let _app = null, _auth = null, _db = null;

async function _init() {
  if (_app) return { auth: _auth, db: _db };
  const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
    import(FB_BASE + '/firebase-app.js'),
    import(FB_BASE + '/firebase-auth.js'),
    import(FB_BASE + '/firebase-firestore.js')
  ]);
  _app = initializeApp(FB_CFG);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  return { auth: _auth, db: _db };
}

// ── Role map: team member role → systemRole ──
const ROLE_MAP = {
  founder: 'founder_ceo',
  ceo: 'founder_ceo',
  co_founder: 'founder_ceo',
  director: 'founder_ceo',
  admin: 'admin',
  branch_manager: 'reporting_manager',
  team_lead: 'reporting_manager',
  senior_manager: 'reporting_manager',
  sales_manager: 'reporting_manager',
  operations_manager: 'reporting_manager',
  finance_manager: 'reporting_manager',
  marketing_manager: 'reporting_manager',
};

// ── Find team member by Firebase UID or email ──
function findTeamMember(uid, email) {
  try {
    var team = (typeof DB !== 'undefined' && DB.settings && Array.isArray(DB.settings.team))
      ? DB.settings.team : [];
    return team.find(function (m) { return m.firebaseUid === uid; })
        || team.find(function (m) { return (m.email || '').toLowerCase() === email.toLowerCase(); })
        || null;
  } catch (e) {
    return null;
  }
}

// ── Main login handler ──
async function handleLogin() {
  var email = (document.getElementById('login-email')?.value || '').trim();
  var password = document.getElementById('login-password')?.value || '';
  var btn = document.getElementById('login-btn');

  if (!email || !password) {
    showMsg('Please enter email and password.', false);
    return;
  }

  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const { auth } = await _init();
    const { signInWithEmailAndPassword } = await import(FB_BASE + '/firebase-auth.js');
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // ── Look up actual team member ──
    var member = findTeamMember(cred.user.uid, email);

    if (member) {
      // Stamp the Firebase UID onto the member record for future lookups
      member.firebaseUid = cred.user.uid;
      if (typeof saveDB === 'function') saveDB({ silent: true });

      // Resolve systemRole from their actual role
      var roleLower = (member.role || '').toLowerCase();
      member.systemRole = member.systemRole || ROLE_MAP[roleLower] || 'employee';

      doLogin(member, email, btn);

    } else {
      // No team member matched in local DB — try fetching from Firestore directly
      // This happens when DB.settings.team hasn't synced yet (e.g. first load)
      var derivedName = cred.user.displayName
        || email.split('@')[0].replace(/[._-]/g,' ').replace(/\w/g,c=>c.toUpperCase())
        || 'User';

      // Try to fetch team from Firestore before falling back
      var matched = null;
      try {
        if (typeof window._fsGetTeam === 'function') {
          var fsTeam = await window._fsGetTeam();
          if (fsTeam && fsTeam.length) {
            matched = fsTeam.find(function(m){ return (m.firebaseUid===cred.user.uid)||(m.email||'')==email; });
            if (matched) {
              matched.systemRole = matched.systemRole || 'employee';
              doLogin(matched, email, btn); return;
            }
          }
        }
      } catch(_) {}

      // Still not found — treat as owner/admin only if it is truly the first user
      // Use email prefix as name, never hardcode 'Admin'
      doLogin({
        id: cred.user.uid,
        name: derivedName,
        email: email,
        role: 'founder',
        dept: 'leadership',
        officeId: '*',
        systemRole: 'founder_ceo'
      }, email, btn);
    }

  } catch (e) {
    var errs = {
      'auth/wrong-password': 'Wrong password.',
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      'auth/user-not-found': 'No account found.',
      'auth/invalid-email': 'Invalid email address.'
    };
    showMsg(errs[e.code] || 'Login failed. Try again.', false);
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

// ── Build and store session, then redirect ──
function doLogin(member, email, btn) {
  var session = {
    uid: member.id,                                   // team member id (e.g. 't2'), NOT Firebase UID
    name: member.name || 'User',
    email: email,
    role: member.role || 'employee',
    dept: member.dept || '',
    officeId: member.officeId || '*',
    systemRole: member.systemRole || 'employee',      // real role, never hardcoded
    loginTime: new Date().toISOString()
  };
  sessionStorage.setItem('wanago_session', JSON.stringify(session));
  showMsg('Welcome ' + session.name + '!', true);
  setTimeout(function () { window.location.href = 'pages/dashboard.html'; }, 500);
}

// ── Forgot password ──
function handleForgotPassword() {
  var email = (document.getElementById('login-email')?.value || '').trim();
  if (!email) { showMsg('Enter your email first.', false); return; }
  _init()
    .then(function (fb) {
      return import(FB_BASE + '/firebase-auth.js').then(function (m) {
        return m.sendPasswordResetEmail(fb.auth, email);
      });
    })
    .then(function () { showMsg('Reset email sent! Check your inbox.', true); })
    .catch(function () { showMsg('Could not send reset email.', false); });
}

// ── Toggle password visibility ──
function togglePassword() {
  var input = document.getElementById('login-password');
  var b = document.querySelector('.toggle-pw');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (b) b.textContent = '🙈';
  } else {
    input.type = 'password';
    if (b) b.textContent = '👁';
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
