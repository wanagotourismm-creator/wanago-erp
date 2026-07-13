"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Fraunces } from "next/font/google";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Plane, TreePalm, Compass, Sailboat } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { FormRenderer, type FormAnswers } from "@/modules/forms/components/FormRenderer";
import type { FormField } from "@/modules/forms/types";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], style: ["italic"], display: "swap" });

type PublicForm = { title: string; description: string | null; fields: FormField[] };

const FLOATING_ICONS = [
  { Icon: Plane,    top: "10%", left: "6%",   size: 28, duration: 9,  delay: 0   },
  { Icon: TreePalm, top: "72%", left: "4%",   size: 32, duration: 11, delay: 1.2 },
  { Icon: Compass,  top: "16%", right: "8%",  size: 26, duration: 8,  delay: 0.6, hideOnMobile: true },
  { Icon: Sailboat, top: "78%", right: "10%", size: 26, duration: 9.5, delay: 1.5, hideOnMobile: true },
];

export default function PublicFormPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/forms/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        setData(await res.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleUploadFile(file: File): Promise<string> {
    const form = new FormData();
    form.set("file", file, file.name);
    const res = await fetch(`/api/public/forms/${params.token}/upload`, { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.url as string;
  }

  async function handleSubmit(answers: FormAnswers) {
    const res = await fetch(`/api/public/forms/${params.token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) return { error: "Something went wrong — please try again." };
    return { error: null };
  }

  if (loading) {
    return (
      <div className="travel-gradient-bg flex min-h-screen items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="travel-gradient-bg flex min-h-screen items-center justify-center px-4">
        <div className="text-center text-white">
          <p className="text-lg font-semibold">This form isn&apos;t available</p>
          <p className="mt-1 text-sm text-white/60">It may have been closed, or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="travel-gradient-bg relative overflow-hidden px-4 pb-20 pt-8 text-white sm:pt-10">
        {FLOATING_ICONS.map(({ Icon, top, left, right, size, duration, delay, hideOnMobile }, i) => (
          <motion.div key={i} className={cn("pointer-events-none absolute text-white/25", hideOnMobile && "hidden sm:block")} style={{ top, left, right }}
            animate={{ y: [0, -14, 0], rotate: [0, 4, -3, 0] }} transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}>
            <Icon size={size} strokeWidth={1.5} />
          </motion.div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

        <div className="relative mx-auto max-w-xl text-center">
          <img src="/images/logo-white-clean.png" alt="Wanago" className="mx-auto mb-8 h-8 w-auto" />
          <h1 className={cn(fraunces.className, "text-4xl italic leading-tight text-white sm:text-5xl")} style={{ textShadow: "0 2px 20px rgba(0,0,0,0.35)" }}>
            {data.title}
          </h1>
          {data.description && <p className="mx-auto mt-4 max-w-md text-sm text-white/70">{data.description}</p>}
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
              <ShieldCheck size={12} /> Secure & Encrypted
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-xl px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <FormRenderer fields={data.fields} onSubmit={handleSubmit} onUploadFile={handleUploadFile} />
        </div>
      </div>
    </div>
  );
}
