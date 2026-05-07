// ═══════════════════════════════════════════════════════════════
//  WANAGO — Keyboard Shortcuts  (press ? to view)
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window._ksInit) return;
  window._ksInit = true;

  var css = `
    #ks-backdrop{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);backdrop-filter:blur(2px)}
    #ks-backdrop.open{display:block}
    #ks-box{
      display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      width:min(520px,90vw);background:#fff;border-radius:16px;
      box-shadow:0 24px 70px rgba(0,0,0,.2),0 0 0 1px rgba(0,0,0,.05);
      overflow:hidden;z-index:10001;
    }
    #ks-box.open{display:block;animation:ksIn .15s ease}
    @keyframes ksIn{from{opacity:0;transform:translate(-50%,-50%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
    #ks-head{
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid #eef3ef;
    }
    #ks-head h3{font-size:15px;font-weight:700;color:#1a1a1a;margin:0}
    #ks-close-btn{
      width:28px;height:28px;border-radius:7px;background:#f4f8f6;
      border:1px solid #dce8e2;cursor:pointer;font-size:14px;
      display:flex;align-items:center;justify-content:center;color:#7fa592;
    }
    #ks-body{padding:6px 0 12px;max-height:70vh;overflow-y:auto}
    .ks-section-title{
      padding:10px 20px 5px;font-size:10px;font-weight:700;
      letter-spacing:.07em;text-transform:uppercase;color:#9ab4a8;
    }
    .ks-row{
      display:flex;align-items:center;justify-content:space-between;
      padding:7px 20px;transition:background .1s;
    }
    .ks-row:hover{background:#f9fbf9}
    .ks-desc{font-size:13px;color:#2a2a2a}
    .ks-keys{display:flex;gap:4px;align-items:center}
    .ks-key{
      background:#f4f8f6;border:1px solid #dce8e2;border-radius:5px;
      padding:2px 8px;font-size:11px;color:#4a7a5e;font-family:inherit;
      box-shadow:0 1px 0 #dce8e2;
    }
    .ks-sep{font-size:10px;color:#c0cec8}
    #ks-footer{padding:12px 20px;border-top:1px solid #eef3ef;text-align:center;font-size:11px;color:#9ab4a8}
  `;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var SHORTCUTS = [
    { section: 'Navigation' },
    { desc: 'Open command palette',    keys: [['Ctrl','K']] },
    { desc: 'Notifications',           keys: [['N']] },
    { desc: 'Show keyboard shortcuts', keys: [['?']] },
    { section: 'Pages' },
    { desc: 'Dashboard',   keys: [['G'], ['D']] },
    { desc: 'Leads',       keys: [['G'], ['L']] },
    { desc: 'Bookings',    keys: [['G'], ['B']] },
    { desc: 'Customers',   keys: [['G'], ['C']] },
    { desc: 'Invoices',    keys: [['G'], ['I']] },
    { desc: 'Reports',     keys: [['G'], ['R']] },
    { section: 'Actions' },
    { desc: 'New Lead',    keys: [['Ctrl','Shift','L']] },
    { desc: 'New Booking', keys: [['Ctrl','Shift','B']] },
    { section: 'General' },
    { desc: 'Close dialog / modal', keys: [['Esc']] },
    { desc: 'Submit form',          keys: [['Ctrl','↵']] },
  ];

  var bd  = document.createElement('div'); bd.id  = 'ks-backdrop';
  var box = document.createElement('div'); box.id = 'ks-box';
  box.innerHTML = `
    <div id="ks-head">
      <h3>⌨️ Keyboard Shortcuts</h3>
      <div id="ks-close-btn" onclick="ksClose()">✕</div>
    </div>
    <div id="ks-body">` +
    SHORTCUTS.map(function(s) {
      if (s.section) return '<div class="ks-section-title">' + s.section + '</div>';
      var keys = s.keys.map(function(combo) {
        return combo.map(function(k){ return '<span class="ks-key">'+k+'</span>'; }).join('');
      }).join('<span class="ks-sep"> then </span>');
      return '<div class="ks-row"><span class="ks-desc">' + s.desc + '</span><div class="ks-keys">' + keys + '</div></div>';
    }).join('') +
    `</div>
    <div id="ks-footer">Press <b>Esc</b> or click outside to close</div>`;

  document.body.appendChild(bd);
  document.body.appendChild(box);

  function ksOpen() { bd.classList.add('open'); box.classList.add('open'); }
  window.ksClose = function() { bd.classList.remove('open'); box.classList.remove('open'); };

  bd.addEventListener('click', window.ksClose);

  /* ── Goto shortcut (G + key) ── */
  var _gMode = false, _gTimer;
  var G_MAP = { d:'dashboard', l:'leads', b:'bookings', c:'customers', i:'invoices', r:'reports', p:'payments', m:'marketing', w:'whatsapp', h:'hrms', a:'admin' };

  /* ── Global keyboard handler ── */
  document.addEventListener('keydown', function(e) {
    var tag = document.activeElement.tagName;
    var editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement.isContentEditable;

    if (e.key === 'Escape') { window.ksClose(); return; }

    if (editing) return;

    // ? → shortcuts panel
    if (e.key === '?' || e.key === '/') { e.preventDefault(); ksOpen(); return; }

    // Ctrl+Shift+L / Ctrl+Shift+B
    if (e.ctrlKey && e.shiftKey && e.key === 'L') { e.preventDefault(); if(typeof goTo==='function'){ goTo('leads'); setTimeout(function(){ var b=document.getElementById('add-lead-btn'); if(b)b.click(); },450); } return; }
    if (e.ctrlKey && e.shiftKey && e.key === 'B') { e.preventDefault(); if(typeof goTo==='function'){ goTo('bookings'); setTimeout(function(){ var b=document.getElementById('add-booking-btn'); if(b)b.click(); },450); } return; }

    // G-chord navigation
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      _gMode = true;
      clearTimeout(_gTimer);
      _gTimer = setTimeout(function(){ _gMode = false; }, 1500);
      return;
    }
    if (_gMode && G_MAP[e.key]) {
      e.preventDefault();
      _gMode = false;
      if (typeof goTo === 'function') goTo(G_MAP[e.key]);
    }
  });

  window.openKeyboardShortcuts = ksOpen;
})();
