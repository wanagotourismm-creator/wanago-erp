"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, Loader2, Images, X } from "lucide-react";
import { uploadBrochureImage } from "@/modules/itinerary-brochures/services/itinerary-brochure.service";

type Props = {
  value:        string;
  onChange:     (url: string) => void;
  library:      string[];
  aspect?:      "video" | "square";
};

// Cover image / per-day image picker: upload a new photo (stored under the
// shared `itinerary-images/` prefix) or reuse one already uploaded for a
// past brochure, since the same destination photos get reused often.
export function ImageUploadField({ value, onChange, library, aspect = "video" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadBrochureImage(file);
      onChange(url);
    } catch {
      setError("Upload failed — try again");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className={aspect === "video" ? "aspect-video w-full" : "aspect-square w-32"}>
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-muted">
          {value ? (
            <>
              <Image src={value} alt="" fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => onChange("")}
                title="Remove image"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No image selected
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Uploading..." : "Upload New"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
        </label>
        {library.length > 0 && (
          <button
            type="button"
            onClick={() => setLibraryOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Images size={13} /> Pick from Library
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      {libraryOpen && (
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-border p-2 sm:grid-cols-6">
          {library.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => { onChange(url); setLibraryOpen(false); }}
              className="relative aspect-square overflow-hidden rounded-lg border border-border hover:border-primary/60 transition-colors"
            >
              <Image src={url} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
