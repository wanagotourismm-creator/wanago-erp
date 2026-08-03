"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchOperationsBookingById,
  updateHandover, updateVerification, updateHotelBooking, updateMeals,
  updateTransportArrival, updateTransportSightseeing, updateEntryTickets, updateGuide,
  updateFinalBookingStatus, updatePreDeparture, updateClosure, updateOverallRemarks,
  addDailyPlanningMessage, addDailyCoordinatorReport, addIssue, addDailyMonitoringEntry, resolveIssue,
} from "@/modules/tour-operations/services/tour-operations.service";
import type { OperationsBooking } from "@/modules/tour-operations/types";

// Wraps every section-save/log-append call so a tab component only needs
// `record` + one of these actions — the hook keeps `record` in sync with
// each write's result (every service call returns the fresh document) so
// derived fields like `status` never go stale between tabs.
export function useTourOperation(id: string | null) {
  const [record,  setRecord]  = useState<OperationsBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setRecord(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setRecord(await fetchOperationsBookingById(id));
    } catch {
      setError("Failed to load this tour operations record");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function wrap<Args extends unknown[]>(fn: (id: string, ...args: Args) => Promise<OperationsBooking>) {
    return async (...args: Args) => {
      if (!id) return;
      const updated = await fn(id, ...args);
      setRecord(updated);
    };
  }

  return {
    record, loading, error, load,
    saveHandover:              wrap(updateHandover),
    saveVerification:          wrap(updateVerification),
    saveHotelBooking:          wrap(updateHotelBooking),
    saveMeals:                 wrap(updateMeals),
    saveTransportArrival:      wrap(updateTransportArrival),
    saveTransportSightseeing:  wrap(updateTransportSightseeing),
    saveEntryTickets:          wrap(updateEntryTickets),
    saveGuide:                 wrap(updateGuide),
    saveFinalBookingStatus:    wrap(updateFinalBookingStatus),
    savePreDeparture:          wrap(updatePreDeparture),
    saveClosure:               wrap(updateClosure),
    saveOverallRemarks:        wrap(updateOverallRemarks),
    logPlanningMessage:        wrap(addDailyPlanningMessage),
    logCoordinatorReport:      wrap(addDailyCoordinatorReport),
    logIssue:                  wrap(addIssue),
    logMonitoringEntry:        wrap(addDailyMonitoringEntry),
    markIssueResolved:         wrap(resolveIssue),
  };
}
