// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Role-Based Access Control (RBAC) v2
//  Controls what each role can see and do
// ═══════════════════════════════════════════════════════════════

const RBAC = {

  // ── Page access by systemRole ──
  pages: {
    founder_ceo: ['*'],
    admin:       ['*'],
    reporting_manager: [
      'dashboard','leads','customers','bookings','quotations',
      'invoices','payments','expenses','reports','hrms',
      'packages','whatsapp','marketing'
    ],
    employee: [
      'dashboard','leads','customers','bookings','quotations','packages','whatsapp'
    ],
  },

  // ── Feature permissions ──
  features: {
    founder_ceo:       ['*'],
    admin:             ['*'],
    reporting_manager: [
      'view_all_leads','edit_lead','delete_lead',
      'view_all_bookings','edit_booking','confirm_booking',
      'view_payments','record_payment',
      'view_reports','export_data',
      'manage_team_records'
    ],
    employee: [
      'view_own_leads','add_lead','edit_own_lead',
      'view_own_bookings','add_booking',
      'view_own_payments'
    ],
  },

  // ── Check if current user can access a page ──
  canAccessPage(page) {
    const role = window.currentUser?.systemRole || 'employee';
    const allowed = this.pages[role] || this.pages.employee;
    return allowed.includes('*') || allowed.includes(page);
  },

  // ── Check if current user has a feature permission ──
  can(feature) {
    const role = window.currentUser?.systemRole || 'employee';
    const allowed = this.features[role] || this.features.employee;
    return allowed.includes('*') || allowed.includes(feature);
  },

  // ── Filter records by ownership for agents ──
  filterByOwnership(records, collection) {
    if (!window.currentUser) return records;
    const role = window.currentUser.systemRole || 'employee';

    // Founders/admins see everything
    if (role === 'founder_ceo' || role === 'admin') return records;

    // Managers see their team's records
    if (role === 'reporting_manager') {
      const team = window.DB?.settings?.team || [];
      const mySubIds = getSubordinateIds(window.currentUser.id, team, new Set());
      mySubIds.add(window.currentUser.id);
      return records.filter(r => {
        if (!r.createdBy && !r.agent) return true; // unassigned — show to manager
        return mySubIds.has(r.createdBy) || mySubIds.has(r.assignedTo) ||
               r.agent === window.currentUser.name;
      });
    }

    // Employees see only their own records
    return records.filter(r => {
      return r.createdBy === window.currentUser.id ||
             r.assignedTo === window.currentUser.id ||
             r.agent === window.currentUser.name ||
             !r.createdBy; // unassigned
    });
  },

  // ── Hide/show action buttons based on role ──
  applyUIPermissions() {
    const role = window.currentUser?.systemRole || 'employee';
    const isFullAccess = role === 'founder_ceo' || role === 'admin';
    const isManager    = role === 'reporting_manager';

    // Delete buttons — only founders/admins
    if (!isFullAccess) {
      document.querySelectorAll('[data-rbac="delete"]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Finance actions — only managers/admins
    if (!isFullAccess && !isManager) {
      document.querySelectorAll('[data-rbac="finance"]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Admin-only elements
    if (!isFullAccess) {
      document.querySelectorAll('[data-rbac="admin"]').forEach(el => {
        el.style.display = 'none';
      });
    }
  },

  // ── Redirect if no page access ──
  guardPage(page) {
    if (!this.canAccessPage(page)) {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">
          <div style="text-align:center">
            <div style="font-size:48px;margin-bottom:16px">🔒</div>
            <div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Access Restricted</div>
            <div style="font-size:14px;color:#888;margin-bottom:24px">You don't have permission to view this page.</div>
            <a href="dashboard.html" style="padding:10px 24px;background:#134a32;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">← Back to Dashboard</a>
          </div>
        </div>`;
      return false;
    }
    return true;
  }
};

// ── Upgrade hScoped to use RBAC filtering ──
window.hScopedRBAC = function(collection) {
  const officeData = typeof scoped === 'function' ? scoped(collection) : (DB[collection] || []);
  return RBAC.filterByOwnership(officeData, collection);
};

// ── Apply UI permissions after page loads ──
window.addEventListener('load', function() {
  setTimeout(function() { RBAC.applyUIPermissions(); }, 300);
});

window.RBAC = RBAC;
console.log('[rbac.js] RBAC v2 loaded ✅');
