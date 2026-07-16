"use client";

import { useEffect, useState } from "react";
import { Upload, Trash2, Archive, ImagePlus, Loader2 } from "lucide-react";
import {
  fetchReferralPosters, uploadReferralPosterImage, createReferralPoster,
  updateReferralPoster, deleteReferralPoster,
} from "@/modules/referrals/services/referral-poster.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { useCompanySettings } from "@/modules/admin/settings/hooks/useCompanySettings";
import type { ReferralPoster } from "@/modules/referrals/types";

function defaultCaption(businessName: string): string {
  return `Thinking about your next trip? We've traveled with ${businessName} and loved it — worth checking out!`;
}

export function PosterKitManager() {
  const { user } = useAuthStore();
  const { settings: company } = useCompanySettings();
  const [posters, setPosters] = useState<ReferralPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [caption, setCaption] = useState(defaultCaption(company.businessName));
  const [file, setFile] = useState<File | null>(null);

  function load() {
    setLoading(true);
    fetchReferralPosters().then(setPosters).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleAdd() {
    if (!file || !title.trim()) {
      setError("Add a title and an image.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const imageUrl = await uploadReferralPosterImage(file);
      await createReferralPoster({
        title: title.trim(),
        imageUrl,
        captionTemplate: caption.trim() || defaultCaption(company.businessName),
        destination: destination.trim() || null,
        posterStatus: "active",
      }, user?.uid ?? "");
      setTitle(""); setDestination(""); setCaption(defaultCaption(company.businessName)); setFile(null);
      load();
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleArchive(p: ReferralPoster) {
    await updateReferralPoster(p.id, { posterStatus: p.posterStatus === "active" ? "archived" : "active" });
    load();
  }

  async function handleDelete(p: ReferralPoster) {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    await deleteReferralPoster(p.id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-foreground">Add a Poster</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Bali Getaway)"
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={destination} onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination (optional)"
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <textarea
          rows={2} value={caption} onChange={(e) => setCaption(e.target.value)}
          placeholder="Default caption shared alongside this poster"
          className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="mt-3 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:border-primary/40">
            <ImagePlus size={14} />
            {file ? file.name : "Choose poster image"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button
            onClick={handleAdd}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive font-medium">{error}</p>}
      </div>

      {loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Loading...</p>
      ) : posters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">No posters uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {posters.map((p) => (
            <div key={p.id} className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", p.posterStatus === "archived" && "opacity-50")}>
              <img src={p.imageUrl} alt={p.title} className="h-28 w-full object-cover" />
              <div className="p-2.5">
                <p className="truncate text-xs font-semibold text-foreground">{p.title}</p>
                {p.destination && <p className="truncate text-[11px] text-muted-foreground">{p.destination}</p>}
                <div className="mt-2 flex items-center gap-1.5">
                  <button onClick={() => handleArchive(p)} title={p.posterStatus === "active" ? "Archive" : "Reactivate"} className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    <Archive size={11} />
                  </button>
                  <button onClick={() => handleDelete(p)} title="Delete" className="flex h-6 w-6 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
