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
    { section: 'OPERATIONS' },
    { id:'packages',       label:'Packages',       icon:'packages',    page:'packages'  },
    { id:'bookings',       label:'Bookings',       icon:'bookings',    page:'bookings'  },
    { section: 'FINANCE' },
    { id:'invoices',       label:'Invoices',       icon:'invoices',    page:'invoices'  },
    { id:'payments',       label:'Payments',       icon:'payments',    page:'payments'  },
    { section: 'MARKETING' },
    { id:'whatsapp',       label:'WhatsApp',       icon:'whatsapp',    page:'whatsapp'  },
    { id:'sales-chat',     label:'Sales Chat',     icon:'chat',        action:"openSalesChatWindow('','','all')" },
    { section: 'TEAM' },
    { id:'hrms',           label:'HRMS',           icon:'hrms',        page:'hrms'      },
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
    invoices:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    payments:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    whatsapp:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    chat:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    hrms:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
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
      <div class="sidebar-user">
        <div class="user-av" id="user-avatar">${userName[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name" id="user-name">${userName}</div>
          <div class="user-role" style="font-size:10px;opacity:.7">${userEmail || userRole}</div>
        </div>
        <svg onclick="if(typeof handleLogout==='function')handleLogout()" style="width:16px;height:16px;color:rgba(255,255,255,.4);cursor:pointer;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </div>`;
  }

  // Build sidebar when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebar);
  } else {
    buildSidebar();
  }

  // Also rebuild after page loads (to update user name from session)
  window.addEventListener('load', buildSidebar);

  // Expose rebuild for auth systems to call after login
  window.rebuildSidebar = buildSidebar;

})();
