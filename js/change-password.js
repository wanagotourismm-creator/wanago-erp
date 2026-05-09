// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Change Password (works on every page)
// ═══════════════════════════════════════════════════════════════

const FB_BASE_CP = 'https://www.gstatic.com/firebasejs/10.12.0';
const FB_CFG_CP = { apiKey:"AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU", authDomain:"wanago-erp.firebaseapp.com", projectId:"wanago-erp", storageBucket:"wanago-erp.firebasestorage.app", messagingSenderId:"445920648182", appId:"1:445920648182:web:2ef6f9110767bc9f36c5d7" };

// Inject modal into page
(function injectChangePasswordModal() {
  if (document.getElementById('modal-change-password')) return;
  const modal = document.createElement('div');
  modal.innerHTML = `
  <div class="modal-overlay" id="modal-change-password" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:none;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:420px;margin:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="font-size:16px;font-weight:800;color:#1a1a1a;margin-bottom:6px">🔑 Change Password</div>
      <div style="font-size:12px;color:#888;margin-bottom:20px">Update your login password</div>

      <div style="margin-bottom:14px">
        <label style="font-size:11.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">Current Password *</label>
        <input id="cp-current" type="password" placeholder="Enter current password" style="width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#134a32'" onblur="this.style.borderColor='#e0e0e0'">
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:11.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">New Password *</label>
        <input id="cp-new" type="password" placeholder="Min 6 characters" style="width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#134a32'" onblur="this.style.borderColor='#e0e0e0'">
      </div>
      <div style="margin-bottom:20px">
        <label style="font-size:11.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">Confirm New Password *</label>
        <input id="cp-confirm" type="password" placeholder="Repeat new password" style="width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#134a32'" onblur="this.style.borderColor='#e0e0e0'">
      </div>

      <div id="cp-error" style="display:none;background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.2);border-radius:8px;padding:10px 14px;font-size:12.5px;color:#c0392b;margin-bottom:14px"></div>
      <div id="cp-success" style="display:none;background:rgba(34,128,80,.08);border:1px solid rgba(34,128,80,.2);border-radius:8px;padding:10px 14px;font-size:12.5px;color:#1a6341;margin-bottom:14px"></div>

      <div style="display:flex;gap:8px">
        <button onclick="closeChangePasswordModal()" style="flex:1;padding:10px;border:1px solid #e0e0e0;border-radius:8px;background:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:#555">Cancel</button>
        <button id="cp-submit-btn" onclick="submitChangePassword()" style="flex:2;padding:10px;border:none;border-radius:8px;background:#134a32;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">🔑 Change Password</button>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #f0f0f0;text-align:center">
        <span style="font-size:12px;color:#888">Forgot your password? </span>
        <span onclick="sendResetEmailFromModal()" style="font-size:12px;color:#134a32;font-weight:600;cursor:pointer;text-decoration:underline">Send reset email</span>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
})();

window.openChangePasswordModal = function() {
  const modal = document.getElementById('modal-change-password');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('cp-current').value = '';
  document.getElementById('cp-new').value = '';
  document.getElementById('cp-confirm').value = '';
  document.getElementById('cp-error').style.display = 'none';
  document.getElementById('cp-success').style.display = 'none';
  document.getElementById('cp-submit-btn').textContent = '🔑 Change Password';
  document.getElementById('cp-submit-btn').disabled = false;
  setTimeout(() => document.getElementById('cp-current')?.focus(), 100);
};

window.closeChangePasswordModal = function() {
  const modal = document.getElementById('modal-change-password');
  if (modal) modal.style.display = 'none';
};

window.submitChangePassword = async function() {
  const current = document.getElementById('cp-current')?.value;
  const newPass  = document.getElementById('cp-new')?.value;
  const confirm  = document.getElementById('cp-confirm')?.value;
  const errEl    = document.getElementById('cp-error');
  const sucEl    = document.getElementById('cp-success');
  const btn      = document.getElementById('cp-submit-btn');

  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!current || !newPass || !confirm) { errEl.textContent = 'Please fill all fields.'; errEl.style.display = ''; return; }
  if (newPass.length < 6) { errEl.textContent = 'New password must be at least 6 characters.'; errEl.style.display = ''; return; }
  if (newPass !== confirm) { errEl.textContent = 'New passwords do not match.'; errEl.style.display = ''; return; }
  if (newPass === current) { errEl.textContent = 'New password must be different from current.'; errEl.style.display = ''; return; }

  btn.textContent = '⏳ Updating...';
  btn.disabled = true;

  try {
    const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    const email = sess.email;
    if (!email) throw new Error('No email in session. Please log out and log in again.');

    const [{ initializeApp, getApps }, { getAuth, signInWithEmailAndPassword, updatePassword }] = await Promise.all([
      import(FB_BASE_CP + '/firebase-app.js'),
      import(FB_BASE_CP + '/firebase-auth.js')
    ]);

    const apps = getApps();
    const app = apps.length ? apps[0] : initializeApp(FB_CFG_CP);
    const auth = getAuth(app);

    // Re-authenticate first
    await signInWithEmailAndPassword(auth, email, current);
    // Update password
    await updatePassword(auth.currentUser, newPass);

    sucEl.textContent = '✅ Password changed successfully! Use your new password next time you log in.';
    sucEl.style.display = '';
    btn.textContent = '✅ Done';

    if (typeof logActivity === 'function') logActivity('Password changed', email, 'login');

    setTimeout(() => closeChangePasswordModal(), 3000);
  } catch(e) {
    const errs = {
      'auth/wrong-password':     'Current password is incorrect.',
      'auth/invalid-credential': 'Current password is incorrect.',
      'auth/too-many-requests':  'Too many attempts. Try again later.',
      'auth/requires-recent-login': 'Please log out and log back in first, then try again.',
      'auth/weak-password':      'Password is too weak. Use at least 6 characters.',
    };
    errEl.textContent = errs[e.code] || e.message;
    errEl.style.display = '';
    btn.textContent = '🔑 Change Password';
    btn.disabled = false;
  }
};

window.sendResetEmailFromModal = async function() {
  const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
  const email = sess.email;
  if (!email) { document.getElementById('cp-error').textContent = 'No email found in session.'; document.getElementById('cp-error').style.display = ''; return; }
  try {
    const [{ initializeApp, getApps }, { getAuth, sendPasswordResetEmail }] = await Promise.all([
      import(FB_BASE_CP + '/firebase-app.js'),
      import(FB_BASE_CP + '/firebase-auth.js')
    ]);
    const apps = getApps();
    const app = apps.length ? apps[0] : initializeApp(FB_CFG_CP);
    const auth = getAuth(app);
    await sendPasswordResetEmail(auth, email);
    document.getElementById('cp-success').textContent = `✅ Reset email sent to ${email}. Check your inbox!`;
    document.getElementById('cp-success').style.display = '';
  } catch(e) {
    document.getElementById('cp-error').textContent = 'Could not send reset email: ' + e.message;
    document.getElementById('cp-error').style.display = '';
  }
};

// Close on backdrop click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('modal-change-password');
  if (modal && e.target === modal) closeChangePasswordModal();
});
