import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeColorProvider } from "@/components/providers/ThemeColorProvider";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Wanago ERP", template: "%s | Wanago ERP" },
  description: "Operations Management System for Wanago Tourism",
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ThemeColorProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeColorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
