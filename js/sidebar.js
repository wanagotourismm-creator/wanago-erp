// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Shared Sidebar Component
//  Injects the same sidebar on every page automatically
// ═══════════════════════════════════════════════════════════════

(function() {

  // Detect which page we're on
  const page = window.location.pathname.split('/').pop().replace('.html','') || 'dashboard';

  const NAV = [
    { section: 'OVERVIEW' },
    { id:'dashboard',      label:'Dashboard',      icon:'dashboard',   page:'dashboard' },
    { id:'reports',        label:'Reports',        icon:'reports',     page:'reports'   },
    { section: 'SALES' },
    { id:'leads',          label:'Leads',          icon:'leads',       page:'leads'     },
    { id:'customers',      label:'Customers',      icon:'customers',   page:'customers' },
    { id:'quotations',     label:'Quotations',     icon:'quotations',  page:'quotations'},
    { id:'incentives',     label:'Incentives',     icon:'incentives',  page:'incentives'},
    { id:'crm',            label:'Advanced CRM',   icon:'crm',         page:'crm'        },
    { section: 'OPERATIONS' },
    { id:'ops',            label:'Ops Dashboard',  icon:'ops',         page:'ops'       },
    { id:'docs',           label:'Documents & PNR',icon:'docs',        page:'docs'      },
    { id:'cancellations',  label:'Cancellations',  icon:'cancellations',page:'cancellations'},
    { id:'suppliers',      label:'Suppliers',      icon:'suppliers',   page:'suppliers' },
    { id:'packages',       label:'Packages',       icon:'packages',    page:'packages'  },
    { id:'bookings',       label:'Bookings',       icon:'bookings',    page:'bookings'  },
    { id:'itinerary',      label:'Itinerary Builder', icon:'itinerary', page:'itinerary' },
    { section: 'FINANCE' },
    { id:'invoices',       label:'Invoices',       icon:'invoices',    page:'invoices'  },
    { id:'payments',       label:'Payments',       icon:'payments',    page:'payments'  },
    { id:'expenses',       label:'Expenses',       icon:'expenses',    page:'expenses'  },
    { section: 'MARKETING' },
    { id:'marketing',      label:'Marketing Hub',  icon:'marketing',   page:'marketing' },
    { id:'whatsapp',       label:'WhatsApp',       icon:'whatsapp',    page:'whatsapp'  },
    { id:'sales-chat',     label:'Sales Chat',     icon:'chat',        action:"openSalesChatWindow('','','all')" },
    { section: 'TEAM' },
    { id:'chat',           label:'Team Chat',      icon:'chat-team',   page:'chat'      },
    { id:'hrms',           label:'HRMS',           icon:'hrms',        page:'hrms'      },
    { id:'hrms-self',      label:'My HRMS',        icon:'hrms-self',   page:'hrms-self' },
    { id:'team-accounts',  label:'Team Accounts',  icon:'team-accounts', page:'team-accounts' },
    { section: 'SYSTEM' },
    { id:'admin',          label:'Admin Panel',    icon:'admin',       page:'admin'     },
  ];

  const ICONS = {
    dashboard:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    reports:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    leads:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    customers:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    quotations:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    incentives:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>',
    packages:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    bookings:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    ops:           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    docs:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    cancellations: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    suppliers:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    crm:           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="23 11 17 11"/><polyline points="20 8 23 11 20 14"/></svg>',
    'chat-team':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    itinerary:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    invoices:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    payments:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    expenses:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    marketing:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    whatsapp:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    chat:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    hrms:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    'hrms-self':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="9 11 12 14 22 4"/></svg>',
    admin:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>',
    'team-accounts':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    settings:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };

  function buildSidebar() {
    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;

    var _sess = {};
    try { _sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}'); } catch(e) {}
    const userName = (window.currentUser && window.currentUser.name) || _sess.name || 'User';
    const userRole = (window.currentUser && window.currentUser.role) || _sess.role || 'Agent';
    const userEmail = (window.currentUser && window.currentUser.email) || _sess.email || '';

    let navHTML = '';
    let lastSectionHasItems = false;
    let pendingSectionHTML = '';
    for (const item of NAV) {
      if (item.section) {
        pendingSectionHTML = `<div class="nav-sec">${item.section}</div>`;
        lastSectionHasItems = false;
        continue;
      }
      // Hide nav items the current user cannot access
      const canSee = typeof window.canUserSeePage === 'function'
        ? window.canUserSeePage(item.id)
        : true;
      if (!canSee) continue;

      // Flush pending section header only when first visible item is found
      if (pendingSectionHTML) { navHTML += pendingSectionHTML; pendingSectionHTML = ''; }
      lastSectionHasItems = true;

      const isActive = item.id === page || item.page === page;
      const onclick = item.action
        ? `onclick="${item.action}"`
        : `onclick="goTo('${item.page}')"`;
      const iconSVG = ICONS[item.icon]
        ? `<svg class="nav-icon" ${ICONS[item.icon].slice(4)}`
        : '';
      navHTML += `<div class="nav-item${isActive?' active':''}" ${onclick}>${iconSVG} ${item.label}</div>`;
    }

    sidebarEl.innerHTML = `
      <div style="padding:14px;border-bottom:1px solid rgba(255,255,255,.07);position:relative;overflow:hidden">
        <div class="sidebar-glow"></div>
        <img src="../assets/logo-white.png" alt="Wanago" style="width:140px;height:auto;display:block;position:relative;z-index:1" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
        <div style="display:none;font-family:'DM Serif Display',serif;font-size:20px;color:#fff;font-weight:700;position:relative;z-index:1"><span style="color:#c9a84c">wana</span><span>go</span><span style="font-size:13px;vertical-align:super">™</span></div>
      </div>
      <nav>${navHTML}</nav>
      <div id="pwa-install-btn" onclick="pwaInstall()" style="display:${window._pwaInstallPrompt?'flex':'none'};align-items:center;gap:8px;margin:6px 12px 2px;padding:8px 12px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);border-radius:8px;cursor:pointer;transition:background .15s">
        <span style="font-size:15px">📲</span>
        <div style="flex:1"><div style="font-size:11.5px;font-weight:600;color:#c9a84c">Install App</div><div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:1px">Add to home screen</div></div>
      </div>
      <div class="sidebar-user">
        <div class="user-av" id="user-avatar" onclick="openChangePasswordModal()" style="cursor:pointer" title="Click to change password">${userName[0].toUpperCase()}</div>
        <div class="user-info" style="cursor:pointer" onclick="openChangePasswordModal()">
          <div class="user-name" id="user-name">${userName}</div>
          <div class="user-role" style="font-size:10px;opacity:.7">${userEmail || userRole}</div>
          <div style="font-size:9.5px;color:rgba(255,255,255,.4);margin-top:1px">🔑 Change Password</div>
        </div>
        <svg onclick="if(typeof handleLogout==='function')handleLogout()" style="width:16px;height:16px;color:rgba(255,255,255,.4);cursor:pointer;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </div>`;
  }

  // ── Mobile sidebar ──
  function setupMobileNav() {
    // Overlay backdrop
    if (!document.getElementById('sidebar-overlay')) {
      var ov = document.createElement('div');
      ov.id = 'sidebar-overlay';
      document.body.appendChild(ov);
      ov.addEventListener('click', closeMobileSidebar);
    }

    // Hamburger button inside topbar
    if (!document.getElementById('menu-toggle')) {
      var btn = document.createElement('button');
      btn.id = 'menu-toggle';
      btn.setAttribute('aria-label', 'Open menu');
      btn.innerHTML = '<span></span><span></span><span></span>';
      btn.addEventListener('click', toggleMobileSidebar);

      var topbar = document.querySelector('.topbar');
      if (topbar) topbar.insertBefore(btn, topbar.firstChild);
    }

    // Close sidebar when a nav item is clicked on mobile
    document.querySelectorAll('.nav-item').forEach(function(el) {
      el.addEventListener('click', function() {
        if (window.innerWidth <= 768) closeMobileSidebar();
      });
    });

    // Close on resize back to desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) closeMobileSidebar();
    });
  }

  function toggleMobileSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var btn     = document.getElementById('menu-toggle');
    if (!sidebar) return;
    var isOpen = sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open', isOpen);
    if (btn)     btn.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  function closeMobileSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var btn     = document.getElementById('menu-toggle');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (btn)     btn.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.closeMobileSidebar  = closeMobileSidebar;
  window.toggleMobileSidebar = toggleMobileSidebar;

  // ── Load advanced UI components ──
  function loadComponents() {
    if (window._componentsLoaded) return;
    window._componentsLoaded = true;
    var isPages = window.location.pathname.replace(/\\/g, '/').includes('/pages/');
    var base   = isPages ? '../components/' : 'components/';
    var jsBase = isPages ? '../js/' : 'js/';
    ['command-palette', 'notifications', 'keyboard-shortcuts'].forEach(function(name) {
      var s = document.createElement('script');
      s.src = base + name + '.js';
      s.defer = true;
      document.head.appendChild(s);
    });
    // Inject AI + Automation engines on every page
    if (!window.WanagoAI) {
      var ai = document.createElement('script');
      ai.src = jsBase + 'ai.js';
      document.head.appendChild(ai);
    }
    if (!window.WanagoAutomation) {
      var at = document.createElement('script');
      at.src = jsBase + 'automation.js';
      document.head.appendChild(at);
    }
    // Inject Google Sheets sync on every page (hooks into saveDB)
    if (!window.WanagoSheets) {
      var gs = document.createElement('script');
      gs.src = jsBase + 'google-sheets.js';
      document.head.appendChild(gs);
    }
  }

  // ── PWA: register service worker + inject manifest link ──
  (function () {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function(){});
    }
    // Load FCM push module (once per page)
    if (!document.querySelector('script[src="/js/fcm.js"]')) {
      var _fcmScript = document.createElement('script');
      _fcmScript.type = 'module'; _fcmScript.src = '/js/fcm.js';
      document.head.appendChild(_fcmScript);
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      var lnk = document.createElement('link');
      lnk.rel = 'manifest'; lnk.href = '/manifest.json';
      document.head.appendChild(lnk);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      var mc = document.createElement('meta');
      mc.name = 'theme-color'; mc.content = '#134a32';
      document.head.appendChild(mc);
    }
  })();

  // ── PWA: capture install prompt ──
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    window._pwaInstallPrompt = e;
    var btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'flex';
  });
  window.addEventListener('appinstalled', function() {
    window._pwaInstallPrompt = null;
    var btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
  });
  window.pwaInstall = function() {
    if (!window._pwaInstallPrompt) return;
    window._pwaInstallPrompt.prompt();
    window._pwaInstallPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') {
        window._pwaInstallPrompt = null;
        var btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'none';
      }
    });
  };

  // ── Global Search (Ctrl+K / ⌘K) ──
  function initGlobalSearch() {
    if (window._gsInited) return;
    window._gsInited = true;

    var style = document.createElement('style');
    style.textContent = '#gs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99998;display:none;align-items:flex-start;justify-content:center;padding-top:80px}#gs-overlay.open{display:flex}#gs-box{width:100%;max-width:580px;background:var(--white);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;animation:gsIn .15s ease}@keyframes gsIn{from{opacity:0;transform:scale(.96) translateY(-10px)}to{opacity:1;transform:none}}#gs-inp{width:100%;border:none;outline:none;padding:16px 18px;font-size:15px;font-family:inherit;background:transparent;border-bottom:1px solid var(--border);color:var(--text);box-sizing:border-box}#gs-results{max-height:300px;overflow-y:auto}.gs-sec{padding:6px 14px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--textd);border-top:1px solid var(--border);background:var(--cream)}.gs-item{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;transition:.1s}.gs-item:hover,.gs-item.gs-on{background:var(--g50)}.gs-item-main{flex:1;min-width:0}.gs-title{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}.gs-sub{font-size:11px;color:var(--textd);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}.gs-badge{font-size:10px;background:var(--g50);color:var(--g700);padding:2px 7px;border-radius:8px;white-space:nowrap;flex-shrink:0;text-transform:capitalize}#gs-footer{padding:8px 14px;font-size:10.5px;color:var(--textd);border-top:1px solid var(--border);display:flex;gap:12px}#gs-empty{padding:24px;text-align:center;color:var(--textd);font-size:13px}';
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'gs-overlay';
    overlay.innerHTML = '<div id="gs-box"><input id="gs-inp" type="text" placeholder="Search leads, customers, bookings…" autocomplete="off"><div id="gs-results"></div><div id="gs-footer"><span>↑↓ navigate</span><span>↵ open</span><span>Esc close</span><span style="margin-left:auto;opacity:.6">⌘K \xb7 Ctrl+K</span></div></div>';
    document.body.appendChild(overlay);

    var inp = document.getElementById('gs-inp');
    var resEl = document.getElementById('gs-results');
    var _activeIdx = -1;
    var _items = [];
    var _timer;

    function open() {
      overlay.classList.add('open');
      inp.value = '';
      resEl.innerHTML = '<div id="gs-empty">Type to search across leads, customers, bookings…</div>';
      _activeIdx = -1; _items = [];
      setTimeout(function() { inp.focus(); }, 40);
    }
    function close() { overlay.classList.remove('open'); inp.value = ''; resEl.innerHTML = ''; }
    function nav(idx) {
      _items.forEach(function(el, i) { el.classList.toggle('gs-on', i === idx); });
      _activeIdx = idx;
    }
    function go(el) {
      var pg = el.dataset.page;
      close();
      var prefix = window.location.pathname.includes('/pages/') ? '' : '/pages/';
      window.location.href = prefix + pg + '.html';
    }
    function search(q) {
      q = (q || '').trim().toLowerCase();
      resEl.innerHTML = ''; _items = []; _activeIdx = -1;
      if (q.length < 2) { resEl.innerHTML = '<div id="gs-empty">Type to search…</div>'; return; }
      var DB = window.DB;
      if (!DB) { resEl.innerHTML = '<div id="gs-empty">Loading…</div>'; return; }
      var hs = window.hScoped;
      var leads     = (hs ? hs('leads')      : DB.leads     ) || [];
      var customers = (hs ? hs('customers')  : DB.customers ) || [];
      var bookings  = (hs ? hs('bookings')   : DB.bookings  ) || [];
      var quotations= (hs ? hs('quotations') : DB.quotations) || [];
      var groups = {};
      leads.filter(function(l) {
        return (l.name||'').toLowerCase().includes(q)||(l.phone||'').includes(q)||(l.destination||'').toLowerCase().includes(q)||(l.email||'').toLowerCase().includes(q);
      }).slice(0,4).forEach(function(l) { (groups.lead||(groups.lead=[])).push({title:l.name,sub:(l.destination||'—')+(l.phone?' \xb7 '+l.phone:''),badge:(l.stage||'').replace(/_/g,' '),page:'leads'}); });
      customers.filter(function(c) {
        return (c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.email||'').toLowerCase().includes(q);
      }).slice(0,4).forEach(function(c) { (groups.customer||(groups.customer=[])).push({title:c.name,sub:(c.phone||'')+(c.city?' \xb7 '+c.city:''),badge:c.tag==='vip'?'⭐ VIP':'',page:'customers'}); });
      bookings.filter(function(b) {
        return (b.customerName||'').toLowerCase().includes(q)||(b.ref||'').toLowerCase().includes(q)||(b.destination||'').toLowerCase().includes(q);
      }).slice(0,4).forEach(function(b) { (groups.booking||(groups.booking=[])).push({title:(b.customerName||'?')+' → '+(b.destination||'?'),sub:(b.ref||'')+(b.travelDate?' \xb7 '+b.travelDate:''),badge:b.status||'',page:'bookings'}); });
      quotations.filter(function(qx) {
        return (qx.customerName||'').toLowerCase().includes(q)||(qx.destination||'').toLowerCase().includes(q)||(qx.id||'').toLowerCase().includes(q);
      }).slice(0,3).forEach(function(qx) { (groups.quotation||(groups.quotation=[])).push({title:(qx.customerName||'?')+(qx.destination?' \xb7 '+qx.destination:''),sub:(qx.id||'')+(qx.grandTotal?' \xb7 ₹'+Number(qx.grandTotal).toLocaleString('en-IN'):''),badge:qx.status||'',page:'quotations'}); });
      var META = {lead:{icon:'🎯',lbl:'Leads'},customer:{icon:'👤',lbl:'Customers'},booking:{icon:'✈️',lbl:'Bookings'},quotation:{icon:'📄',lbl:'Quotations'}};
      var html = '';
      var total = 0;
      ['lead','customer','booking','quotation'].forEach(function(type) {
        var grp = groups[type]; if (!grp||!grp.length) return;
        var m = META[type];
        html += '<div class="gs-sec">'+m.icon+' '+m.lbl+'</div>';
        grp.forEach(function(r) {
          html += '<div class="gs-item" data-page="'+r.page+'"><div class="gs-item-main"><div class="gs-title">'+r.title+'</div><div class="gs-sub">'+r.sub+'</div></div>'+(r.badge?'<span class="gs-badge">'+r.badge+'</span>':'')+'</div>';
          total++;
        });
      });
      if (!total) { resEl.innerHTML = '<div id="gs-empty">No results for “'+q+'”</div>'; return; }
      resEl.innerHTML = html;
      _items = Array.from(resEl.querySelectorAll('.gs-item'));
      _items.forEach(function(el, i) {
        el.addEventListener('click', function() { go(el); });
        el.addEventListener('mouseover', function() { nav(i); });
      });
    }

    inp.addEventListener('input', function() { clearTimeout(_timer); _timer = setTimeout(function() { search(inp.value); }, 160); });
    inp.addEventListener('keydown', function(e) {
      if (e.key==='Escape') { close(); return; }
      if (e.key==='ArrowDown') { e.preventDefault(); nav(Math.min(_activeIdx+1, _items.length-1)); }
      else if (e.key==='ArrowUp') { e.preventDefault(); nav(Math.max(_activeIdx-1, 0)); }
      else if (e.key==='Enter' && _activeIdx>=0) { e.preventDefault(); go(_items[_activeIdx]); }
    });
    overlay.addEventListener('click', function(e) { if (e.target===overlay) close(); });
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); overlay.classList.contains('open') ? close() : open(); }
    });
    // Wire topbar search inputs that have no oninput handler
    document.querySelectorAll('.topbar-actions .search-inp:not([oninput])').forEach(function(el) {
      el.addEventListener('focus', function() { el.blur(); open(); });
    });
    window.openGlobalSearch = open;
  }

  // Build sidebar when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { buildSidebar(); loadComponents(); setupMobileNav(); });
  } else {
    buildSidebar();
    loadComponents();
    setupMobileNav();
  }

  // Also rebuild after page loads (to update user name from session)
  window.addEventListener('load', function() { buildSidebar(); setupMobileNav(); setTimeout(initGlobalSearch, 700); });

  // Expose rebuild for auth systems to call after login
  window.rebuildSidebar = buildSidebar;

  // Auto-load change-password module
  (function loadChangePassword() {
    var isPages = window.location.pathname.includes('/pages/');
    var prefix = isPages ? '../js/' : 'js/';
    var s = document.createElement('script');
    s.src = prefix + 'change-password.js';
    document.body.appendChild(s);
  })();

})();
