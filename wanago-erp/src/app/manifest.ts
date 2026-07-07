import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wanago ERP",
    short_name: "Wanago ERP",
    description: "Operations Management System for Wanago Tourism",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#228050",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the installed app icon to jump straight into a form,
    // skipping the dashboard. Both routes already support ?new=1 deep-links.
    shortcuts: [
      { name: "Add Lead",    url: "/leads?new=1",    icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Add Booking", url: "/bookings?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
