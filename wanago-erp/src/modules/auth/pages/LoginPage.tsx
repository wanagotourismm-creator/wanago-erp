"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginSchema } from "@/modules/auth/schemas";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useThemeStore, THEMES } from "@/store/theme.store";

function LoginFormInner({ onForgotPassword, hex }: { onForgotPassword: () => void; hex: string }) {
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginSchema) {
    setErr(null);
    const { error } = await login(data.email, data.password);
    if (error) setErr(error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {err && (
        <div className="rounded-2xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">{err}</div>
      )}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/70">Email Address</label>
        <input type="email" placeholder="you@wanago.in" {...register("email")}
          className="w-full rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/30 outline-none transition-all border border-white/15 focus:border-white/50 focus:bg-white/15"
          style={{ background: "rgba(255,255,255,0.10)" }} />
        {errors.email && <p className="text-xs text-red-300">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-white/70">Password</label>
          <button type="button" onClick={onForgotPassword} className="text-xs text-white/40 hover:text-white/70 transition-colors">Forgot Password?</button>
        </div>
        <div className="relative">
          <input type={showPw ? "text" : "password"} placeholder="••••••••••" {...register("password")}
            className="w-full rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/30 outline-none transition-all border border-white/15 focus:border-white/50 focus:bg-white/15 pr-12"
            style={{ background: "rgba(255,255,255,0.10)" }} />
          <button type="button" onClick={() => setShowPw(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-300">{errors.password.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-lg border border-white/25"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)" }}>
        {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Signing in...</> : "Sign In to Wanago ERP"}
      </button>
    </form>
  );
}

function ForgotFormInner({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await forgotPassword(email);
    setSent(true);
    setLoading(false);
  }

  if (sent) return (
    <div className="text-center space-y-4 py-4">
      <div className="text-5xl">📧</div>
      <p className="text-white font-bold">Reset link sent!</p>
      <p className="text-sm text-white/50">Check your email inbox.</p>
      <button onClick={onBack} className="text-sm text-white/50 hover:text-white underline">← Back to Sign In</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white/70">Email Address</label>
        <input type="email" placeholder="you@wanago.in" value={email}
          onChange={e => setEmail(e.target.value)} required
          className="w-full rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/30 outline-none border border-white/15 focus:border-white/50"
          style={{ background: "rgba(255,255,255,0.10)" }} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-2xl py-4 text-sm font-bold text-white border border-white/25 hover:bg-white/15 transition-all"
        style={{ background: "rgba(255,255,255,0.12)" }}>
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
      <button type="button" onClick={onBack}
        className="w-full text-sm text-white/40 hover:text-white/70 transition-colors text-center">
        ← Back to Sign In
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [view, setView] = useState<"login" | "forgot">("login");
  const [mounted, setMounted] = useState(false);
  const { colorTheme, setColorTheme } = useThemeStore();
  const theme = THEMES.find(t => t.id === colorTheme) ?? THEMES[0];
  const hex = theme.color;

  useEffect(() => setMounted(true), []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      {/* Full bg */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hex} 0%, ${hex}cc 100%)` }} />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-25" style={{ background: "rgba(255,255,255,0.5)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-15" style={{ background: "rgba(255,255,255,0.4)" }} />
      </div>

      {/* Background dots */}
      {[
        { top:"5%",   right:"10%", size:120, op:0.10 },
        { top:"22%",  right:"4%",  size:55,  op:0.10 },
        { top:"44%",  right:"2%",  size:30,  op:0.12 },
        { bottom:"22%",right:"16%",size:75,  op:0.08 },
        { bottom:"5%", right:"5%", size:25,  op:0.12 },
        { top:"58%",  left:"2%",   size:38,  op:0.08 },
        { bottom:"32%",left:"1%",  size:18,  op:0.10 },
        { top:"28%",  left:"4%",   size:22,  op:0.08 },
      ].map((d,i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            top:(d as any).top, bottom:(d as any).bottom,
            left:(d as any).left, right:(d as any).right,
            width:d.size, height:d.size,
            background:`rgba(255,255,255,${d.op})`,
          }} />
      ))}

      {/* LEFT — blob card */}
      <div className="hidden lg:flex lg:w-[52%] items-center justify-center relative z-10">
        <div className="relative" style={{ width:"82%", height:"84vh", maxHeight:600 }}>
          {/* Blob SVG */}
          <svg viewBox="0 0 500 600" className="absolute inset-0 w-full h-full drop-shadow-2xl" preserveAspectRatio="none">
            <path d="M30,0 L440,0 Q490,0 500,50 Q520,120 490,200 Q520,280 490,360 Q520,440 480,510 Q450,580 380,590 L30,590 Q0,590 0,560 L0,30 Q0,0 30,0 Z" fill="white" fillOpacity="0.96" />
          </svg>

          {/* Card content */}
          <div className="absolute inset-0 flex flex-col px-12 py-10">

            {/* Logo — FIXED: bigger, properly positioned */}
            <div className="relative z-10 flex-shrink-0 mb-6">
              <div className="relative h-12 w-52">
                <Image
                  src="/images/logo-dark-clean.png"
                  alt="Wanago Travel & Co"
                  fill
                  className="object-contain object-left"
                  priority
                  sizes="208px"
                />
              </div>
            </div>

            {/* Illustration area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {/* Subtle glow behind scene */}
              <div className="absolute w-56 h-56 rounded-full blur-3xl opacity-30"
                style={{ background: hex }} />

              {/* Inner floating dots */}
              {[
                { top:"8%",  right:"18%", size:20, op:0.3 },
                { top:"20%", right:"8%",  size:12, op:0.2 },
                { top:"12%", left:"20%",  size:16, op:0.2 },
                { bottom:"18%",left:"12%",size:18, op:0.2 },
                { bottom:"28%",right:"12%",size:14,op:0.18 },
              ].map((d,i) => (
                <div key={i} className="absolute rounded-full z-10"
                  style={{
                    top:(d as any).top, bottom:(d as any).bottom,
                    left:(d as any).left, right:(d as any).right,
                    width:d.size, height:d.size,
                    background:hex, opacity:d.op,
                  }} />
              ))}

              {/* Main scene */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Airplane floating */}
                <div className="absolute -top-16 right-0 text-5xl"
                  style={{ animation:"floatPlane 4s ease-in-out infinite", filter:"drop-shadow(0 8px 20px rgba(0,0,0,0.15))" }}>
                  ✈️
                </div>
                <div className="absolute top-0 left-4 text-2xl opacity-50">🌍</div>

                {/* People scene */}
                <div className="relative flex h-48 w-56 items-end justify-center pb-3"
                  style={{ background:`radial-gradient(ellipse at center, ${hex}20 0%, transparent 65%)`, borderRadius:"50%" }}>
                  <div className="flex items-end gap-2">
                    <span className="text-6xl" style={{ filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.18))" }}>🧳</span>
                    <span className="text-7xl" style={{ filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.18))" }}>👩‍💼</span>
                    <span className="text-5xl" style={{ filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.18))" }}>🗺️</span>
                  </div>
                </div>
                <div className="h-3 w-40 rounded-full blur-md mt-1 opacity-15" style={{ background:hex }} />
              </div>
            </div>

            {/* Bottom info */}
            <div className="flex-shrink-0 mt-4">
              <p className="text-sm font-bold text-gray-700">Wanago Operations Platform</p>
              <p className="text-xs text-gray-400 mt-0.5">Internal use only · Authorized personnel</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[11px] text-gray-400">© {new Date().getFullYear()} Wanago Travel & Co</p>
                <p className="text-[11px] text-gray-400">Powered by Wanago ERP</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex w-full lg:w-[48%] flex-col items-start justify-center px-10 lg:px-16 relative z-10">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 relative h-10 w-44">
          <Image src="/images/logo-white-clean.png" alt="Wanago" fill className="object-contain object-left" sizes="176px" />
        </div>

        <div className="w-full max-w-sm">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 mb-6 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-white/80">Wanago ERP — Internal Portal</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl font-black text-white mb-2 leading-tight">
            {view === "login" ? "Welcome\nBack." : "Reset\nPassword."}
          </h1>
          <p className="text-sm text-white/50 mb-8">
            {view === "login" ? "Sign in to access your workspace" : "Enter your email to receive a reset link"}
          </p>

          {/* Form */}
          {view === "login"
            ? <LoginFormInner onForgotPassword={() => setView("forgot")} hex={hex} />
            : <ForgotFormInner onBack={() => setView("login")} />
          }
        </div>

        {/* Theme picker */}
        {mounted && (
          <div className="mt-10 flex items-center gap-3">
            <p className="text-xs text-white/30">Color theme:</p>
            <div className="flex gap-2">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setColorTheme(t.id)} title={t.label}
                  className="h-5 w-5 rounded-full transition-all hover:scale-125"
                  style={{
                    background: t.color,
                    outline: t.id === colorTheme ? "2.5px solid rgba(255,255,255,0.9)" : "none",
                    outlineOffset: "2px",
                    boxShadow: t.id === colorTheme ? "0 0 12px rgba(255,255,255,0.4)" : "none",
                  }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes floatPlane {
          0%,100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-14px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
