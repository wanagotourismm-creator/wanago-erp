"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  getCurrentRoundId, hasSubmittedThisRound, submitPulseResponse, fetchAggregate,
} from "@/modules/team-pulse/services/team-pulse.service";
import type { TeamPulseResponseSchema } from "@/modules/team-pulse/schemas";
import type { TeamPulseAggregate } from "@/modules/team-pulse/types";

export function useTeamPulse() {
  const { user } = useAuthStore();
  const roundId = getCurrentRoundId();

  const [submitted, setSubmitted] = useState(false);
  const [aggregate, setAggregate] = useState<TeamPulseAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const already = await hasSubmittedThisRound(user.uid);
      setSubmitted(already);
      if (already) {
        setAggregate(await fetchAggregate(roundId));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.uid, roundId]);

  useEffect(() => { load(); }, [load]);

  async function submit(data: TeamPulseResponseSchema): Promise<{ error: string | null }> {
    if (!user?.uid) return { error: "Not signed in" };
    setSubmitting(true);
    setError(null);
    try {
      await submitPulseResponse(data, user.uid);
      setSubmitted(true);
      setAggregate(await fetchAggregate(roundId));
      return { error: null };
    } catch {
      const msg = "Failed to submit — please try again.";
      setError(msg);
      return { error: msg };
    } finally {
      setSubmitting(false);
    }
  }

  return { roundId, submitted, aggregate, loading, submitting, error, submit };
}
