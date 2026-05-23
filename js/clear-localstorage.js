// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — localStorage Cleanup Script
//
//  HOW TO USE:
//  1. Open https://wanago-erp.vercel.app
//  2. Press F12 → Console tab
//  3. Type: allow pasting  (press Enter)
//  4. Paste this entire script and press Enter
//  5. Page will reload with clean data from Firestore
// ═══════════════════════════════════════════════════════════════

(function() {
  console.log('=== WANAGO localStorage CLEANUP ===');

  // List all wanago keys before deletion
  var wanagoKeys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && (key.startsWith('wanago') || key.startsWith('WANAGO'))) {
      wanagoKeys.push(key);
    }
  }

  console.log('Found ' + wanagoKeys.length + ' wanago localStorage keys:');
  wanagoKeys.forEach(function(k) {
    var val = localStorage.getItem(k);
    var size = val ? (val.length / 1024).toFixed(1) + ' KB' : '0 KB';
    console.log('  ' + k + ' (' + size + ')');
  });

  // Delete ALL wanago keys
  wanagoKeys.forEach(function(k) {
    localStorage.removeItem(k);
    console.log('  Deleted: ' + k);
  });

  // Also clear session to force fresh login
  // (uncomment the line below if you also want to log out)
  // sessionStorage.removeItem('wanago_session');

  console.log('');
  console.log('Done! All ' + wanagoKeys.length + ' keys deleted.');
  console.log('Reloading page to fetch fresh data from Firestore...');
  console.log('');

  // Reload after short delay
  setTimeout(function() {
    window.location.reload();
  }, 1500);
})();
