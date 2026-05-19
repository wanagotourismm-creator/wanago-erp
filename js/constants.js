// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — App Constants (Single Source of Truth)
//
//  PROBLEM SOLVED:
//  Stage names, role names, colors, and status values were
//  hardcoded as raw strings scattered across 40+ files.
//  A typo like 'Confirmed' vs 'confirmed' caused silent bugs.
//
//  NOW: All constants in one place.
//  Use STAGES.WON instead of 'won'
//  Use ROLES.ADMIN instead of 'admin'
//  Use COLORS.GREEN instead of '#228050'
// ═══════════════════════════════════════════════════════════════

// ── Lead Stages ──────────────────────────────────────────────
window.STAGES = {
  NEW:         'new',
  CONTACTED:   'contacted',
  FOLLOW_UP:   'follow_up',
  QUOTED:      'quoted',
  NEGOTIATION: 'negotiation',
  WON:         'won',
  LOST:        'lost',
};

window.STAGE_LABELS = {
  new:         'New',
  contacted:   'Contacted',
  follow_up:   'Follow-up',
  quoted:      'Quoted',
  negotiation: 'Negotiation',
  won:         'Won',
  lost:        'Lost',
};

// ── Booking Statuses ─────────────────────────────────────────
window.BOOKING_STATUS = {
  PENDING_FINANCE:   'pending_finance',
  FINANCE_APPROVED:  'finance_approved',
  OPS_PENDING:       'ops_pending',
  CONFIRMED:         'confirmed',
  COMPLETED:         'completed',
  CANCELLED:         'cancelled',
};

// ── Payment Statuses ─────────────────────────────────────────
window.PAYMENT_STATUS = {
  PAID:    'paid',
  PARTIAL: 'partial',
  UNPAID:  'unpaid',
  OVERDUE: 'overdue',
};

// ── Invoice Statuses ─────────────────────────────────────────
window.INVOICE_STATUS = {
  DRAFT:   'draft',
  SENT:    'sent',
  PAID:    'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
};

// ── Team Roles ────────────────────────────────────────────────
window.ROLES = {
  FOUNDER:              'founder',
  CEO:                  'ceo',
  CO_FOUNDER:           'co_founder',
  DIRECTOR:             'director',
  ADMIN:                'admin',
  BRANCH_MANAGER:       'branch_manager',
  TEAM_LEAD:            'team_lead',
  SENIOR_MANAGER:       'senior_manager',
  SALES_MANAGER:        'sales_manager',
  OPERATIONS_MANAGER:   'operations_manager',
  FINANCE_MANAGER:      'finance_manager',
  MARKETING_MANAGER:    'marketing_manager',
  AGENT:                'agent',
};

window.ROLE_LABELS = {
  founder:            'Founder',
  ceo:                'CEO',
  co_founder:         'Co-Founder',
  director:           'Director',
  admin:              'Admin',
  branch_manager:     'Branch Manager',
  team_lead:          'Team Lead',
  senior_manager:     'Senior Manager',
  sales_manager:      'Sales Manager',
  operations_manager: 'Operations Manager',
  finance_manager:    'Finance Manager',
  marketing_manager:  'Marketing Manager',
  agent:              'Agent',
};

window.ADMIN_ROLES = ['founder','ceo','co_founder','director','admin'];
window.MANAGER_ROLES = ['branch_manager','team_lead','senior_manager',
                        'sales_manager','operations_manager','finance_manager','marketing_manager'];

// ── System Roles (simplified) ─────────────────────────────────
window.SYSTEM_ROLES = {
  FOUNDER_CEO:        'founder_ceo',
  ADMIN:              'admin',
  REPORTING_MANAGER:  'reporting_manager',
  EMPLOYEE:           'employee',
};

// ── Priority ─────────────────────────────────────────────────
window.PRIORITY = {
  HOT:  'hot',
  WARM: 'warm',
  COLD: 'cold',
};

window.PRIORITY_COLORS = {
  hot:  'var(--red)',
  warm: 'var(--amb)',
  cold: '#3b82f6',
};

// ── Firestore Collections ─────────────────────────────────────
window.COLLECTIONS = {
  LEADS:              'leads',
  CUSTOMERS:          'customers',
  QUOTATIONS:         'quotations',
  PACKAGES:           'packages',
  BOOKINGS:           'bookings',
  INVOICES:           'invoices',
  PAYMENTS:           'payments',
  EXPENSES:           'expenses',
  CAMPAIGNS:          'campaigns',
  SEGMENTS:           'segments',
  ACTIVITIES:         'activities',
  TICKETS:            'tickets',
  HRMS_EMPLOYEES:     'hrmsEmployees',
  HRMS_LEAVES:        'hrmsLeaves',
  HRMS_PAYROLL:       'hrmsPayroll',
  HRMS_CHECK_INS:     'hrmsCheckIns',
  HRMS_LOC_REQUESTS:  'hrmsLocRequests',
  ITINERARIES:        'itineraries',
  SUPPLIERS:          'suppliers',
  TASKS:              'tasks',
  REWARDS:            'rewards',
  POINTS_LOG:         'pointsLog',
};

// ── Brand Colors ──────────────────────────────────────────────
window.COLORS = {
  GREEN:       '#228050',
  GREEN_DARK:  '#134a32',
  GREEN_LIGHT: '#1a6341',
  AMBER:       '#c9a84c',
  RED:         '#c62828',
  BLUE:        '#1976d2',
  PURPLE:      '#7c3aed',
};

// ── Lead Sources ──────────────────────────────────────────────
window.DEFAULT_LEAD_SOURCES = [
  'Instagram','Facebook','WhatsApp','Walk-in',
  'Referral','Website','Google','YouTube',
  'TV Ad','Cold Call',
];

// ── Trip Types ────────────────────────────────────────────────
window.TRIP_TYPES = {
  INTERNATIONAL: 'international',
  DOMESTIC:      'domestic',
  HONEYMOON:     'honeymoon',
  GROUP:         'group',
  ADVENTURE:     'adventure',
  CORPORATE:     'corporate',
};

console.log('[constants.js] App constants loaded');
