import type { SystemRole } from "@/types/rbac";

export type NavItem = {
  label:      string;
  href:       string;
  icon:       string;
  badge?:     string;
  roles?:     SystemRole[];
  children?:  NavItem[];
};

export type NavGroup = {
  group:  string;
  items:  NavItem[];
};

export const NAV_CONFIG: NavGroup[] = [
  {
    group: "Main",
    items: [
      {
        label: "Dashboard",
        href:  "/dashboard",
        icon:  "layout-dashboard",
      },
      {
        label: "My HR",
        href:  "/ess",
        icon:  "user-circle",
      },
    ],
  },
  {
    group: "Sales",
    items: [
      {
        label: "Leads",
        href:  "/leads",
        icon:  "users",
        roles: ["super_admin","admin","sales","marketing","support"],
      },
      {
        label: "Customers",
        href:  "/customers",
        icon:  "user-check",
        roles: ["super_admin","admin","sales","operations","support"],
      },
      {
        label: "Bookings",
        href:  "/bookings",
        icon:  "calendar-check",
        roles: ["super_admin","admin","sales","operations","finance","support"],
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Packages",
        href:  "/packages",
        icon:  "package",
        roles: ["super_admin","admin","operations","sales"],
      },
      {
        label: "Suppliers",
        href:  "/suppliers",
        icon:  "building-store",
        roles: ["super_admin","admin","operations"],
      },
      {
        label: "Itineraries",
        href:  "/itineraries",
        icon:  "map",
        roles: ["super_admin","admin","operations","sales"],
      },
    ],
  },
  {
    group: "Finance",
    items: [
      {
        label: "Invoices",
        href:  "/invoices",
        icon:  "file-invoice",
        roles: ["super_admin","admin","finance"],
      },
      {
        label: "Payments",
        href:  "/payments",
        icon:  "credit-card",
        roles: ["super_admin","admin","finance"],
      },
      {
        label: "Expenses",
        href:  "/expenses",
        icon:  "receipt",
        roles: ["super_admin","admin","finance"],
      },
    ],
  },
  {
    group: "Marketing",
    items: [
      {
        label: "Campaigns",
        href:  "/campaigns",
        icon:  "speakerphone",
        roles: ["super_admin","admin","marketing"],
      },
    ],
  },
  {
    group: "HR",
    items: [
      {
        label: "HR Admin",
        href:  "/hrms-admin",
        icon:  "gauge",
        roles: ["super_admin","admin","hr","finance"],
      },
    ],
  },
  {
    group: "Reports",
    items: [
      {
        label: "Reports",
        href:  "/reports",
        icon:  "chart-bar",
        roles: ["super_admin","admin","finance","operations","marketing"],
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        label: "Admin",
        href:  "/admin",
        icon:  "shield",
        roles: ["super_admin","admin"],
      },
      {
        label: "Settings",
        href:  "/settings",
        icon:  "settings",
        roles: ["super_admin","admin"],
      },
    ],
  },
];
