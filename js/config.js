// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firebase Config (Single Source of Truth)
//
//  PROBLEM SOLVED:
//  Firebase config was duplicated in 4 files:
//  firestore.js, admin-features.js, login.js, notify.js
//  If the project ID, API key, or app ID ever changes,
//  you had to update 4 places — and risk missing one.
//
//  NOW: Update config in ONE place only — this file.
//  All other files read window.WANAGO_FB_CFG.
//
//  HOW TO ADD TO PAGES:
//  Add this FIRST in every page's script list:
//  <script src="../js/config.js"></script>
// ═══════════════════════════════════════════════════════════════

window.WANAGO_FB_CFG = {
  apiKey:            "AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU",
  authDomain:        "wanago-erp.firebaseapp.com",
  projectId:         "wanago-erp",
  storageBucket:     "wanago-erp.firebasestorage.app",
  messagingSenderId: "445920648182",
  appId:             "1:445920648182:web:2ef6f9110767bc9f36c5d7",
};

window.WANAGO_FB_VER  = '10.12.0';
window.WANAGO_FB_BASE = `https://www.gstatic.com/firebasejs/${window.WANAGO_FB_VER}`;

console.log('[config.js] Firebase config loaded — project:', window.WANAGO_FB_CFG.projectId);
