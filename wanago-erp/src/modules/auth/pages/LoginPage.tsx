"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { LoginBackdrop } from "@/modules/auth/components/LoginBackdrop";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { ForgotPasswordForm } from "@/modules/auth/components/ForgotPasswordForm";
import { useThemeStore, THEMES } from "@/store/theme.store";

export default function LoginPage() {
  const [view, setView] = useState<"login" | "forgot">("login");
  const { colorTheme, setColorTheme } = useThemeStore();
  const theme = THEMES.find(t => t.id === colorTheme) ?? THEMES[0];

  return (
    <LoginBackdrop>
      <div className="w-full max-w-sm">

        {/* Logo — fades and scales in first */}
        <motion.div
          className="relative mx-auto mb-5 h-11 w-48"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <Image
            src="/images/logo-white-clean.png"
            alt="Wanago"
            fill
            className="object-contain"
            priority
            sizes="192px"
          />
        </motion.div>

        {/* Warm welcome line */}
        <motion.p
          className="mb-8 text-center text-sm font-medium text-white/85"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          &ldquo;Great teams build great travel experiences.&rdquo;
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

        <motion.p
          className="mt-5 text-center text-xs text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          Wanago™ ERP · Travel Management System
          <br />© {new Date().getFullYear()} Wanago. All rights reserved.
        </motion.p>

      </div>
    </LoginBackdrop>
  );
}
