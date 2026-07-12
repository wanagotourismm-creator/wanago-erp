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
      {
        label: "My Training",
        href:  "/my-training",
        icon:  "graduation-cap",
      },
      {
        label: "Team Pulse",
        href:  "/team-pulse",
        icon:  "heart",
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
      {
        label: "Quotations",
        href:  "/quotations",
        icon:  "file-invoice",
        roles: ["super_admin","admin","sales"],
      },
      {
        label: "Sales Team",
        href:  "/sales-team",
        icon:  "chart-bar",
        roles: ["sales_head","admin","super_admin"],
      },
      {
        label: "WhatsApp Inbox",
        href:  "/whatsapp-inbox",
        icon:  "message-circle",
        roles: ["super_admin","admin","sales","sales_head","marketing","support"],
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
      {
        label: "Itinerary Brochures",
        href:  "/itinerary-brochures",
        icon:  "map",
        roles: ["super_admin","admin","operations","sales"],
      },
      {
        label: "Approvals",
        href:  "/operations-approvals",
        icon:  "id-badge",
        roles: ["super_admin","admin","operations"],
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
      {
        label: "Incentives",
        href:  "/incentives",
        icon:  "cash",
        roles: ["super_admin","admin","finance","hr","sales_head"],
      },
      {
        label: "Approvals",
        href:  "/approvals",
        icon:  "id-badge",
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
      {
        label: "Referral Program",
        href:  "/referral-program",
        icon:  "gift",
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
        label: "Onboarding Training",
        href:  "/onboarding-training",
        icon:  "graduation-cap",
        roles: ["super_admin","admin"],
      },
      {
        label: "My Account",
        href:  "/settings",
        icon:  "settings",
      },
    ],
  },
];
