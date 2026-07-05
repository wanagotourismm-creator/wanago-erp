"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone, UserCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { initials } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";

type Props = {
  employee: Employee | null;
  fallbackName: string;
  fallbackPhotoUrl: string | null;
};

function yearsSince(dateStr: string): number {
  const start = new Date(dateStr).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25)));
}

export function ProfileHeroCard({ employee, fallbackName, fallbackPhotoUrl }: Props) {
  const name  = employee?.fullName ?? fallbackName;
  const title = employee?.designation ?? "Team Member";
  const photoUrl = employee?.profilePictureUrl ?? fallbackPhotoUrl;
  const years = employee?.dateOfJoining ? yearsSince(employee.dateOfJoining) : null;
  const phone = employee?.mobileNumber ?? null;

  return (
    <Card radius="3xl" padding="none" className="relative flex h-64 flex-col justify-end overflow-hidden">
      {photoUrl ? (
        <Image src={photoUrl} alt={name} fill className="object-cover" sizes="320px" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
          <span className="text-5xl font-bold text-primary/30">{initials(name)}</span>
        </div>
      )}

      {years != null && years > 0 && (
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {years}+ years experience
        </span>
      )}

      <div className="relative flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="truncate text-xs text-white/70">{title}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {phone && (
            <a href={`tel:${phone}`} title="Call" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
              <Phone size={14} />
            </a>
          )}
          <Link href="/ess" title="View My HR profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary hover:bg-white/90 transition-colors">
            <UserCircle size={14} />
          </Link>
        </div>
      </div>
    </Card>
  );
}
