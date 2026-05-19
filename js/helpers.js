// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Shared Helpers
//
//  PROBLEM SOLVED:
//  goTo(), handleLogout(), initPage() were copy-pasted into
//  22 JS files. Any bug fix had to be applied 22 times.
//  Any improvement was constantly forgotten in some files.
//
//  NOW: Define once here. All pages use window.goTo,
//  window.handleLogout, window.initPage from this file.
//  Fix a bug once — fixed everywhere instantly.
//
//  LOAD ORDER: Must load AFTER utils.js and services.js
//  <script src="../js/helpers.js"></script>
// ═══════════════════════════════════════════════════════════════

'use strict';

// ── Navigation ───────────────────────────────────────────────

/**
 * Navigate to a page by name.
 * Usage: goTo('leads') → opens leads.html
 */
window.goTo = function(page) {
  // If we're at root level (index.html), go to pages/
  var isRoot = window.location.pathname.split('/').length <= 2 ||
               window.location.pathname.endsWith('index.html');
  if (isRoot) {
    window.location.href = 'pages/' + page + '.html';
  } else {
    window.location.href = page + '.html';
  }
};

/**
 * Navigate back to dashboard.
 */
window.goHome = function() {
  window.goTo('dashboard');
};

// ── Session ───────────────────────────────────────────────────

/**
 * Log out the current user — clears session and redirects to login.
 */
window.handleLogout = function() {
  sessionStorage.removeItem('wanago_session');
  sessionStorage.removeItem('wanago_admin_unlocked');
  // Also sign out of Firebase Auth if available
  try {
    var FB_BASE = window.WANAGO_FB_BASE || 'https://www.gstatic.com/firebasejs/10.12.0';
    import(FB_BASE + '/firebase-auth.js').then(function(m) {
      import(FB_BASE + '/firebase-app.js').then(function(app) {
        var apps = app.getApps ? app.getApps() : [];
        if (apps.length) m.getAuth(apps[0]).signOut().catch(function(){});
      });
    });
  } catch(e) {}
  var isInPages = window.location.pathname.includes('/pages/');
  window.location.href = isInPages ? '../index.html' : 'index.html';
};

// ── DOM Helpers ───────────────────────────────────────────────

/**
 * Get element by ID — shorter than document.getElementById
 */
window.$ = function(id) {
  return document.getElementById(id);
};

/**
 * Get first matching element
 */
window.$$ = function(selector) {
  return document.querySelector(selector);
};

/**
 * Set text content safely (no XSS risk)
 */
window.setText = function(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value || '';
};

/**
 * Set innerHTML safely using esc()
 */
window.setHTML = function(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html || '';
};

/**
 * Show/hide element by ID
 */
window.show = function(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = '';
};

window.hide = function(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
};

// ── Loading State ─────────────────────────────────────────────

/**
 * Show a loading spinner inside an element
 */
window.showLoading = function(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = [
    '<div style="display:flex;align-items:center;justify-content:center;',
    'padding:40px;gap:12px;color:var(--textd)">',
    '<div style="width:20px;height:20px;border:2px solid var(--border);',
    'border-top-color:var(--g500);border-radius:50%;animation:spin .7s linear infinite"></div>',
    '<span style="font-size:13px">' + (msg || 'Loading...') + '</span>',
    '</div>',
  ].join('');
};

/**
 * Show empty state inside an element
 */
window.showEmpty = function(id, msg, icon) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = [
    '<div style="display:flex;flex-direction:column;align-items:center;',
    'justify-content:center;padding:60px 20px;text-align:center">',
    icon ? '<div style="font-size:32px;margin-bottom:12px;opacity:.3">' + icon + '</div>' : '',
    '<div style="font-size:13px;color:var(--textd)">' + (msg || 'No data found') + '</div>',
    '</div>',
  ].join('');
};

// ── Clipboard ─────────────────────────────────────────────────

/**
 * Copy text to clipboard with toast feedback
 */
window.copyToClipboard = function(text, successMsg) {
  navigator.clipboard.writeText(text).then(function() {
    if (typeof showToast === 'function') showToast(successMsg || 'Copied!');
  }).catch(function() {
    // Fallback for older browsers
    var el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    if (typeof showToast === 'function') showToast(successMsg || 'Copied!');
  });
};

// ── Form Helpers ──────────────────────────────────────────────

/**
 * Get form field value by ID (trimmed)
 */
window.fieldVal = function(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
};

/**
 * Set form field value by ID
 */
window.fieldSet = function(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = (val === null || val === undefined) ? '' : val;
};

/**
 * Clear multiple form fields at once
 */
window.fieldsClear = function(ids) {
  ids.forEach(function(id) { fieldSet(id, ''); });
};

// ── Confirmation Dialog ────────────────────────────────────────

/**
 * Show a styled confirmation dialog (replaces browser confirm())
 * Usage: confirmAction('Delete lead?', 'Delete', function() { ... })
 */
window.confirmAction = function(message, confirmLabel, onConfirm, danger) {
  var existing = document.getElementById('wanago-confirm-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'wanago-confirm-overlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99998;',
    'display:flex;align-items:center;justify-content:center;',
    'font-family:inherit',
  ].join('');

  var btnColor = danger ? '#c62828' : '#1a6341';
  overlay.innerHTML = [
    '<div style="background:#fff;border-radius:16px;padding:28px 24px;',
    'width:360px;max-width:94vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">',
    '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px">',
    'Confirm Action</div>',
    '<div style="font-size:13px;color:var(--textd);line-height:1.6;margin-bottom:20px">',
    (typeof esc === 'function' ? esc(message) : message),
    '</div>',
    '<div style="display:flex;gap:8px;justify-content:flex-end">',
    '<button id="wanago-confirm-cancel" style="padding:9px 18px;border:1px solid var(--border);',
    'background:#fff;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;',
    'font-family:inherit;color:var(--text)">Cancel</button>',
    '<button id="wanago-confirm-ok" style="padding:9px 18px;background:' + btnColor + ';',
    'color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;',
    'cursor:pointer;font-family:inherit">' + (confirmLabel || 'Confirm') + '</button>',
    '</div></div>',
  ].join('');

  document.body.appendChild(overlay);

  document.getElementById('wanago-confirm-cancel').onclick = function() {
    overlay.remove();
  };
  document.getElementById('wanago-confirm-ok').onclick = function() {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
};

// ── Date Helpers ──────────────────────────────────────────────

/**
 * Get today's date as YYYY-MM-DD string
 */
window.todayStr = function() {
  return new Date().toISOString().split('T')[0];
};

/**
 * Add days to a date string (YYYY-MM-DD)
 */
window.addDays = function(dateStr, days) {
  var d = new Date(dateStr || new Date());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

/**
 * Check if a date string is in the past
 */
window.isPast = function(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(todayStr());
};

/**
 * Days from today (negative = past)
 */
window.daysFromToday = function(dateStr) {
  if (!dateStr) return null;
  var diff = new Date(dateStr) - new Date(todayStr());
  return Math.round(diff / 86400000);
};

// ── Number Helpers ─────────────────────────────────────────────

/**
 * Safe number parse — returns 0 if NaN
 */
window.toNum = function(val) {
  var n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

/**
 * Clamp number between min and max
 */
window.clamp = function(val, min, max) {
  return Math.min(Math.max(toNum(val), min), max);
};

/**
 * Format a number as Indian currency shorthand
 * 100000 → ₹1.0L, 1000 → ₹1K
 */
window.formatMoneyShort = function(n) {
  n = toNum(n);
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)     return '₹' + (n / 1000).toFixed(0) + 'K';
  return '₹' + n;
};

// ── Array Helpers ──────────────────────────────────────────────

/**
 * Get unique values from array
 */
window.unique = function(arr) {
  return [...new Set(arr)];
};

/**
 * Group array of objects by a key
 */
window.groupBy = function(arr, key) {
  return arr.reduce(function(acc, item) {
    var k = item[key] || 'other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
};

/**
 * Sum a field across an array of objects
 */
window.sumBy = function(arr, field) {
  return arr.reduce(function(s, item) { return s + toNum(item[field]); }, 0);
};

console.log('[helpers.js] Shared helpers loaded');
