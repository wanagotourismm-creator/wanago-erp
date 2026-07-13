"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { parsePortalUid, type PortalType } from "@/modules/portal/services/portal-auth.service";

export function usePortalAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);

  const parsed = user ? parsePortalUid(user.uid) : null;

  return {
    loading,
    signedIn: !!parsed,
    portalType: parsed?.portalType ?? null as PortalType | null,
    entityId: parsed?.entityId ?? null,
    user,
  };
}
