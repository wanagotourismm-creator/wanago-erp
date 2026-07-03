"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useThemeStore, THEMES } from "@/store/theme.store";
import { ArrowRight, Check, BarChart3, Users, Globe, Zap, Shield, Star, ChevronRight, Play } from "lucide-react";

const FEATURES = [
  { icon: Users,     title: "Lead Management",     desc: "Smart pipeline with automated follow-ups, priority scoring and conversion tracking in real time."  },
  { icon: BarChart3, title: "Finance & Invoicing",  desc: "Generate invoices instantly, track payments, manage expenses and get financial clarity."            },
  { icon: Globe,     title: "Booking Management",   desc: "End-to-end booking control — itineraries, packages, confirmations and operations dashboard."       },
  { icon: Zap,       title: "WhatsApp Integration", desc: "Talk to customers where they are. Send quotes, confirmations and updates via WhatsApp instantly."   },
  { icon: Shield,    title: "HRMS",                 desc: "Manage your team — attendance, leaves, payroll, performance and employee records."                  },
  { icon: Star,      title: "Smart Reports",        desc: "AI-powered dashboards with revenue forecasts, lead conversion and team performance insights."       },
];

const STATS = [
  { value: "500+",  label: "Travel Agencies"   },
  { value: "10K+",  label: "Bookings Managed"  },
  { value: "₹50Cr+",label: "Revenue Tracked"   },
  { value: "99.9%", label: "Uptime Guaranteed" },
];

const MODULES = ["Leads","Bookings","Invoices","HRMS","Reports","WhatsApp","CRM","Operations","Suppliers","Packages","Itineraries","Analytics"];

const TESTIMONIALS = [
  { name: "Arjun Mehta",    role: "Operations Head",  text: "Wanago ERP cut our booking time by 60%. Everything is in one place now.",   avatar: "👨‍💼" },
  { name: "Priya Sharma",   role: "Sales Manager",    text: "Lead tracking is incredible. Follow-ups are automated and we never miss a lead.", avatar: "👩‍💼" },
  { name: "Rahul Nair",     role: "Finance Manager",  text: "Invoice generation that used to take hours now takes seconds. Game changer.",  avatar: "👨‍💻" },
];

export default function LandingPage() {
  const { colorTheme, setColorTheme } = useThemeStore();
  const theme = THEMES.find(t => t.id === colorTheme) ?? THEMES[0];
  const hex = theme.color;
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Sticky Navbar ── */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-gray-100 bg-white/95 backdrop-blur-xl shadow-sm" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="relative h-9 w-40">
            <Image src="/images/logo-dark-clean.png" alt="Wanago" fill className="object-contain object-left" sizes="160px" />
          </div>
          <div className="hidden items-center gap-8 md:flex">
            {["Features","Modules","Testimonials","About"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setColorTheme(t.id)} title={t.label}
                  className="h-4 w-4 rounded-full transition-all hover:scale-125"
                  style={{
                    background: t.color,
                    outline: t.id === colorTheme ? `2px solid ${t.color}` : "none",
                    outlineOffset: "2px",
                  }} />
              ))}
            </div>
            <Link href="/auth/login"
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: hex, boxShadow: `0 4px 20px ${hex}50` }}>
              Sign In <ArrowRight size={14} className="inline ml-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16 pb-28">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background:`radial-gradient(ellipse 80% 60% at 50% 0%, ${hex}15, transparent 70%)` }} />
          <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-3xl opacity-8" style={{ background:hex, transform:"translate(40%,-40%)" }} />
          <div className="absolute top-40 left-0 w-96 h-96 rounded-full blur-3xl opacity-5" style={{ background:hex, transform:"translate(-50%,0)" }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-bold"
              style={{ borderColor:`${hex}40`, background:`${hex}10`, color:hex }}>
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ background:hex }} />
              Exclusively Built for Wanago Travel & Co
            </div>

            {/* Headline */}
            <h1 className="mx-auto max-w-5xl text-6xl font-black leading-[1.05] text-gray-900 lg:text-7xl xl:text-8xl">
              Run Your Travel Business
              <span className="block" style={{ WebkitTextStroke:`2px ${hex}`, color:"transparent" }}>
                Like Never Before.
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-xl text-gray-500 leading-relaxed">
              One powerful platform built for Wanago — manage leads, bookings, finance, HR and operations.
              Everything your team needs, nothing they don't.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/login"
                className="inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:-translate-y-1"
                style={{ background:hex, boxShadow:`0 12px 40px ${hex}50` }}>
                Access Your Workspace <ArrowRight size={18} />
              </Link>
              <a href="#features"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-300 hover:shadow-md transition-all">
                <Play size={16} style={{ color:hex }} /> See Features
              </a>
            </div>

            {/* Checks */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              {["No external access","Role-based permissions","Real-time sync","99.9% uptime"].map(c => (
                <div key={c} className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background:`${hex}20` }}>
                    <Check size={11} style={{ color:hex }} />
                  </div>
                  {c}
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="mt-20 mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-3xl shadow-2xl border"
              style={{ borderColor:`${hex}20`, boxShadow:`0 40px 100px ${hex}20, 0 8px 40px rgba(0,0,0,0.08)` }}>
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ background:`${hex}08`, borderColor:`${hex}15` }}>
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="mx-auto flex h-7 w-60 items-center justify-center rounded-full bg-white border border-gray-200 px-4 gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background:hex }} />
                  <span className="text-[11px] text-gray-400 font-medium">app.wanago.in/dashboard</span>
                </div>
              </div>
              {/* Mock UI */}
              <div className="flex" style={{ background:"#f8fafb", minHeight:340 }}>
                {/* Sidebar */}
                <div className="w-52 flex-shrink-0 border-r border-gray-100 bg-white p-4 hidden sm:block" style={{ borderColor:`${hex}10` }}>
                  <div className="mb-5 relative h-7 w-28">
                    <Image src="/images/logo-dark-clean.png" alt="W" fill className="object-contain object-left" sizes="112px" />
                  </div>
                  {[["Dashboard",true],["Leads",false],["Bookings",false],["Finance",false],["HRMS",false]].map(([n,active],i) => (
                    <div key={String(n)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-1 text-xs font-semibold`}
                      style={{ background: active ? hex : "transparent", color: active ? "white" : "#9ca3af" }}>
                      <div className="h-3.5 w-3.5 rounded-md" style={{ background: active ? "rgba(255,255,255,0.4)" : "#e5e7eb" }} />
                      {n}
                    </div>
                  ))}
                </div>
                {/* Content */}
                <div className="flex-1 p-5 space-y-4">
                  {/* Greeting banner */}
                  <div className="rounded-2xl p-5 text-white flex justify-between items-center"
                    style={{ background:`linear-gradient(135deg,${hex},${hex}bb)` }}>
                    <div>
                      <div className="h-5 w-48 rounded-full bg-white/30 mb-2" />
                      <div className="h-3 w-36 rounded-full bg-white/20" />
                    </div>
                    <div className="text-right">
                      <div className="h-8 w-28 rounded-xl bg-white/20 mb-1" />
                      <div className="h-2 w-20 rounded-full bg-white/15 ml-auto" />
                    </div>
                  </div>
                  {/* Stat cards */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      "linear-gradient(135deg,#f97316,#ef4444)",
                      "linear-gradient(135deg,#8b5cf6,#6366f1)",
                      "linear-gradient(135deg,#06b6d4,#3b82f6)",
                      `linear-gradient(135deg,${hex},${hex}88)`,
                    ].map((g,i) => (
                      <div key={i} className="rounded-2xl p-4" style={{ background:g }}>
                        <div className="h-8 w-8 rounded-xl bg-white/25 mb-3" />
                        <div className="h-6 w-12 rounded-lg bg-white/30 mb-1.5" />
                        <div className="h-2 w-16 rounded-full bg-white/20" />
                      </div>
                    ))}
                  </div>
                  {/* Chart */}
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <div className="h-3 w-28 rounded-full bg-gray-100" />
                      <div className="h-3 w-16 rounded-full bg-gray-100" />
                    </div>
                    <div className="flex items-end gap-1.5 h-20">
                      {[30,50,38,65,48,80,60,75,52,70,88,42].map((h,i) => (
                        <div key={i} className="flex-1 rounded-t-lg"
                          style={{ height:`${h}%`, background:`${hex}${i%3===2?"":"88"}`, opacity: 0.7 + (i%3)*0.1 }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 border-y" style={{ borderColor:`${hex}15`, background:`${hex}06` }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-4xl font-black" style={{ color:hex }}>{s.value}</p>
                <p className="text-sm font-medium text-gray-500 mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ── */}
      <section id="modules" className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">All Modules</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {MODULES.map(m => (
              <span key={m}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:scale-105 cursor-default"
                style={{ borderColor:`${hex}30`, background:`${hex}10`, color:hex }}>
                <ChevronRight size={12} /> {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:hex }}>Features</p>
            <h2 className="text-5xl font-black text-gray-900">Everything your team needs</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              Purpose-built for travel agencies. Every feature designed to save time and increase revenue.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className="group rounded-3xl border bg-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                style={{ borderColor:`${hex}15` }}>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background:`${hex}12` }}>
                  <f.icon size={26} style={{ color:hex }} />
                </div>
                <h3 className="mb-3 text-lg font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold" style={{ color:hex }}>
                  Learn more <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-28" style={{ background:`linear-gradient(135deg, ${hex}08, white)` }}>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:hex }}>Testimonials</p>
          <h2 className="text-4xl font-black text-gray-900 mb-12">What the team says</h2>
          <div className="relative">
            {TESTIMONIALS.map((t, i) => (
              <div key={i}
                className={`transition-all duration-500 ${i === activeTestimonial ? "opacity-100 translate-y-0" : "opacity-0 absolute inset-0 translate-y-4"}`}>
                <div className="rounded-3xl bg-white p-10 shadow-lg border" style={{ borderColor:`${hex}15` }}>
                  <div className="text-5xl mb-4">{t.avatar}</div>
                  <p className="text-xl font-medium text-gray-700 leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_,i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                className="h-2 rounded-full transition-all"
                style={{ width: i === activeTestimonial ? 24 : 8, background: i === activeTestimonial ? hex : `${hex}40` }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="about" className="py-24 px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] relative"
          style={{ background:`linear-gradient(135deg,${hex},${hex}cc)`, boxShadow:`0 32px 80px ${hex}50` }}>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
          <div className="relative px-12 py-20 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4">Get Started</p>
            <h2 className="text-5xl font-black text-white leading-tight">Ready to transform<br />how Wanago operates?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/65">
              Sign in to your workspace and start managing leads, bookings, finance and your team — all in one place.
            </p>
            <Link href="/auth/login"
              className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-4 text-base font-bold shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
              style={{ color:hex }}>
              Sign In to Wanago ERP <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-10 bg-white">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative h-8 w-36">
            <Image src="/images/logo-dark-clean.png" alt="Wanago" fill className="object-contain object-left" sizes="144px" />
          </div>
          <p className="text-sm text-gray-400 text-center">
            © {new Date().getFullYear()} Wanago Travel & Co · Internal Platform · All rights reserved
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">Theme:</p>
            <div className="flex gap-1.5">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setColorTheme(t.id)} title={t.label}
                  className="h-4 w-4 rounded-full transition-all hover:scale-125"
                  style={{
                    background:t.color,
                    outline:t.id===colorTheme?`2px solid ${t.color}`:"none",
                    outlineOffset:"2px",
                  }} />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
