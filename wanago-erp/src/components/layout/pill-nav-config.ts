// Derived mapping layer — collapses NAV_CONFIG's 8 role-filtered groups
// into a small set of top-nav pills. NAV_CONFIG itself is untouched so
// nothing else that reads it is affected. Single-item pills navigate
// directly; multi-group pills open a dropdown of their child NavItems.
export type PillConfig = { label: string; directHref?: string; groupNames: string[] };

export const PILL_NAV: PillConfig[] = [
  { label: "Dashboard",  directHref: "/dashboard", groupNames: [] },
  { label: "My HR",      directHref: "/ess",       groupNames: [] },
  { label: "Sales",      groupNames: ["Sales"] },
  { label: "Operations", groupNames: ["Operations"] },
  { label: "Finance",    groupNames: ["Finance"] },
  { label: "More",       groupNames: ["Marketing", "HR", "Reports", "System"] },
];
