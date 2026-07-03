"use client";

import { useState } from "react";
import Image from "next/image";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { ForgotPasswordForm } from "@/modules/auth/components/ForgotPasswordForm";
import { useThemeStore, THEMES } from "@/store/theme.store";

const FEATURES = [
  { icon: "🧭", label: "Lead Management" },
  { icon: "📅", label: "Bookings"        },
  { icon: "💰", label: "Invoices"        },
  { icon: "👥", label: "HRMS"           },
  { icon: "📊", label: "Reports"         },
  { icon: "💬", label: "WhatsApp"        },
];

export default function LoginPage() {
  const [view, setView]       = useState<"login" | "forgot">("login");
  const { colorTheme, setColorTheme } = useThemeStore();
  const theme = THEMES.find(t => t.id === colorTheme) ?? THEMES[0];

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
      style={{
        background: `radial-gradient(ellipse at top left, ${theme.color}22 0%, transparent 60%),
                     radial-gradient(ellipse at bottom right, ${theme.color}18 0%, transparent 60%),
                     #f8fafc`,
      }}
    >
      {/* Blobs */}
      <div className="absolute top-0 left-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `${theme.color}30`, transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: `${theme.color}25`, transform: "translate(30%, 30%)" }} />
      <div className="absolute top-1/2 right-1/4 h-40 w-40 rounded-full blur-2xl"
        style={{ background: `${theme.color}18`, transform: "translateY(-50%)" }} />

      {/* Floating dots */}
      {[
        { top: "8%",  left: "5%",   size: 12, op: 0.45 },
        { top: "14%", left: "16%",  size: 6,  op: 0.7  },
        { top: "80%", left: "6%",   size: 10, op: 0.35 },
        { top: "90%", right: "9%",  size: 15, op: 0.4  },
        { top: "15%", right: "6%",  size: 8,  op: 0.5  },
        { top: "65%", right: "3%",  size: 22, op: 0.2  },
      ].map((d, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            top: d.top,
            left: (d as Record<string,unknown>).left as string | undefined,
            right: (d as Record<string,unknown>).right as string | undefined,
            width: d.size, height: d.size,
            background: theme.color,
            opacity: d.op,
          }}
        />
      ))}

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-5xl mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px)",
          border: `1.5px solid ${theme.color}35`,
        }}
      >
        <div className="flex min-h-[600px]">

          {/* ── Left panel ── */}
          <div
            className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
            style={{ background: `linear-gradient(145deg, ${theme.color}10, ${theme.color}20)` }}
          >
            {/* Deco */}
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20"
              style={{ background: theme.color }} />
            <div className="absolute -left-10 bottom-10 h-40 w-40 rounded-full opacity-10"
              style={{ background: theme.color }} />

            {/* Logo */}
            <div className="relative z-10">
              <div className="relative h-10 w-44">
                <Image
                  src="/images/logo-dark-clean.png"
                  alt="Wanago"
                  fill
                  className="object-contain object-left"
                  priority
                  sizes="176px"
                />
              </div>
            </div>

            {/* Feature card */}
            <div className="relative z-10 space-y-5">
              <div
                className="rounded-2xl p-6 shadow-lg"
                style={{
                  background: "rgba(255,255,255,0.88)",
                  border: `1px solid ${theme.color}30`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md"
                    style={{ background: theme.color }}
                  >
                    ✈️
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-base leading-tight">Your travel business,</p>
                    <p className="font-bold text-base" style={{ color: theme.color }}>
                      powered by intelligence.
                    </p>
                    <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                      One platform to manage leads, bookings, invoices, team, and everything in between.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Leads", "Bookings", "Revenue"].map(label => (
                    <div key={label} className="rounded-xl p-2.5 text-center"
                      style={{
                        background: `${theme.color}12`,
                        border: `1px solid ${theme.color}25`,
                      }}
                    >
                      <p className="text-lg font-bold" style={{ color: theme.color }}>∞</p>
                      <p className="text-[10px] font-medium text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {FEATURES.map(f => (
                  <span key={f.label}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      border: `1px solid ${theme.color}28`,
                    }}
                  >
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>
            </div>

            <p className="relative z-10 text-[11px] text-gray-400 font-medium tracking-widest">
              BUILT FOR TRAVEL AGENCIES ACROSS INDIA
            </p>
          </div>

          {/* ── Right panel ── */}
          <div className="flex w-full lg:w-[55%] flex-col items-center justify-center px-10 py-12">

            {/* Mobile logo */}
            <div className="mb-8 lg:hidden relative h-9 w-40">
              <Image src="/images/logo-dark-clean.png" alt="Wanago" fill className="object-contain object-center" sizes="160px" />
            </div>

            <div className="w-full max-w-sm">

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                  {view === "login" ? "Sign in Now." : "Reset Password."}
                </h1>
                <p className="mt-1.5 text-sm text-gray-400">
                  {view === "login" ? "Enter your details below" : "We'll send a reset link to your email"}
                </p>
              </div>

              {/* Pass theme color down via CSS variable override */}
              <div style={{ "--login-color": theme.color } as React.CSSProperties}>
                {view === "login"
                  ? <LoginForm onForgotPassword={() => setView("forgot")} />
                  : <ForgotPasswordForm onBack={() => setView("login")} />
                }
              </div>

            </div>

            {/* Theme switcher on login page */}
            <div className="mt-8 flex items-center gap-3">
              <p className="text-xs text-gray-400 font-medium">Theme:</p>
              <div className="flex items-center gap-1.5">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setColorTheme(t.id)}
                    title={t.label}
                    className="h-5 w-5 rounded-full transition-all hover:scale-110"
                    style={{
                      background: t.color,
                      outline: t.id === colorTheme ? `2.5px solid ${t.color}` : "none",
                      outlineOffset: "2px",
                      boxShadow: t.id === colorTheme ? `0 0 8px ${t.color}80` : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-gray-400">
              Wanago™ ERP · Travel Management System
              <br />© {new Date().getFullYear()} Wanago. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
