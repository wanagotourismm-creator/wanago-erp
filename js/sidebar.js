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
    { id:'settings',       label:'Settings',       icon:'settings',    page:'settings'  },
    { id:'wanago-space',   label:'Wanago Space',   icon:'space',       page:'wanago-space'},
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
    space:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>',
  };

  // Badge counts for nav items
  function _getNavBadge(pageId) {
    try {
      if (!window.DB) return 0;
      var today = new Date().toISOString().split('T')[0];
      if (pageId === 'leads') {
        return (window.DB.leads || []).filter(function(l) {
          return !['won','lost'].includes(l.stage) && l.followup === today;
        }).length || 0;
      }
      if (pageId === 'invoices') {
        return (window.DB.invoices || []).filter(function(i) {
          return i.status === 'overdue';
        }).length || 0;
      }
      if (pageId === 'hrms') {
        return (window.DB.hrmsLeaves || []).filter(function(l) {
          return l.status === 'pending';
        }).length || 0;
      }
      if (pageId === 'bookings') {
        var d = new Date();
        d.setDate(d.getDate() + 3);
        var soon = d.toISOString().split('T')[0];
        return (window.DB.bookings || []).filter(function(b) {
          return b.status === 'confirmed' && b.travelDate >= today && b.travelDate <= soon;
        }).length || 0;
      }
    } catch(e) {}
    return 0;
  }

  // Role label helper
  function _getRoleLabel(role) {
    var labels = {
      founder:'Founder', ceo:'CEO', co_founder:'Co-Founder', director:'Director',
      admin:'Admin', branch_manager:'Branch Manager', team_lead:'Team Lead',
      senior_manager:'Senior Manager', sales_manager:'Sales Manager',
      operations_manager:'Ops Manager', finance_manager:'Finance Manager',
      marketing_manager:'Marketing Manager', agent:'Agent', employee:'Employee',
    };
    return labels[role] || (role ? role.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}) : 'Team Member');
  }

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
      var badge = _getNavBadge(item.id);
      var badgeHTML = badge ? `<span class="nav-badge${badge > 9 ? ' red' : ''}">${badge > 99 ? '99+' : badge}</span>` : '';
      navHTML += `<div class="nav-item${isActive?' active':''}" ${onclick}>${iconSVG} ${item.label}${badgeHTML}</div>`;
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
          <div class="user-role" style="font-size:10px;opacity:.7">${_getRoleLabel(userRole)}</div>
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

  // Build sidebar when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { buildSidebar(); loadComponents(); setupMobileNav(); });
  } else {
    buildSidebar();
    loadComponents();
    setupMobileNav();
  }

  // Also rebuild after page loads (to update user name from session)
  window.addEventListener('load', function() { buildSidebar(); setupMobileNav(); });

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
