"use client";

import { useState, useEffect } from "react";
import { fetchCandidates } from "@/modules/recruitment/candidates/services/candidate.service";
import { fetchJobOpenings } from "@/modules/recruitment/jobs/services/job.service";
import type { Candidate } from "@/modules/recruitment/candidates/types";

const PROGRESSED_STAGES = new Set(["interview_r1", "interview_r2", "hr_round", "offer_sent", "joined"]);

export function useHiringStats() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matched, setMatched] = useState(0);
  const [notMatched, setNotMatched] = useState(0);
  const [openOpenings, setOpenOpenings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCandidates(), fetchJobOpenings()])
      .then(([allCandidates, openings]) => {
        setCandidates(allCandidates.slice(0, 5));
        setMatched(allCandidates.filter((c) => PROGRESSED_STAGES.has(c.status)).length);
        setNotMatched(allCandidates.filter((c) => c.status === "rejected").length);
        setOpenOpenings(openings.filter((o) => o.jobStatus === "open").reduce((sum, o) => sum + o.openings, 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { loading, candidates, matched, notMatched, openOpenings };
}
