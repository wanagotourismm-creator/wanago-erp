"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LoginBackdrop } from "@/modules/auth/components/LoginBackdrop";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { ForgotPasswordForm } from "@/modules/auth/components/ForgotPasswordForm";
import { AboutUsModal } from "@/modules/auth/components/AboutUsModal";
import { useThemeStore, THEMES } from "@/store/theme.store";

export default function LoginPage() {
  const [view, setView] = useState<"login" | "forgot">("login");
  const [aboutOpen, setAboutOpen] = useState(false);
  const { colorTheme, setColorTheme } = useThemeStore();
  const theme = THEMES.find(t => t.id === colorTheme) ?? THEMES[0];

  return (
    <LoginBackdrop>
      <div className="w-full max-w-sm">

        {/* Brand tagline */}
        <motion.p
          className="mb-8 text-center text-xl font-extrabold uppercase tracking-wide text-white sm:text-2xl"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          We know
          <br />
          you wanna go
        </motion.p>

        {/* Login card — slides up last */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.85, ease: "easeOut" }}
          className="rounded-3xl p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {view === "login" ? "Welcome back" : "Reset Password"}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {view === "login" ? "Sign in to continue to Wanago ERP" : "We'll send a reset link to your email"}
            </p>
          </div>

          {/* Pass accent color down via CSS variable override — untouched logic */}
          <div style={{ "--login-color": theme.color } as React.CSSProperties}>
            {view === "login"
              ? <LoginForm onForgotPassword={() => setView("forgot")} />
              : <ForgotPasswordForm onBack={() => setView("login")} />
            }
          </div>
        </motion.div>

        {/* Accent color picker — kept, just restyled for the new backdrop */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          <p className="text-xs font-medium text-white/60">Accent:</p>
          <div className="flex items-center gap-1.5">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setColorTheme(t.id)}
                title={t.label}
                className="h-5 w-5 rounded-full transition-all hover:scale-110"
                style={{
                  background: t.color,
                  outline: t.id === colorTheme ? "2.5px solid rgba(255,255,255,0.85)" : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-5 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <button
            onClick={() => setAboutOpen(true)}
            className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/20"
          >
            About Us
          </button>
          <p className="mt-4 text-xs text-white/50">
            Wanago™ ERP · Travel Management System
            <br />© {new Date().getFullYear()} Wanago. All rights reserved.
          </p>
        </motion.div>

      </div>

      <AboutUsModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </LoginBackdrop>
  );
}
