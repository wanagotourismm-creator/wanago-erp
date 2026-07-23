"use client";

import { useState, useEffect, useMemo } from "react";
import { loadReportData } from "@/modules/reports/services/report-data.service";
import { useAuthStore } from "@/store/auth.store";
import type { ReportKey, ReportRow, ReportTypeConfig, RetentionCohort } from "@/modules/reports/types";

export function useReportData(reportTypes: ReportTypeConfig[]) {
  const { user } = useAuthStore();
  const visibleReportTypes = useMemo(
    () => reportTypes.filter(r => !r.allowedRoles || (user && r.allowedRoles.includes(user.systemRole))),
    [reportTypes, user]
  );

  const [reportType, setReportType] = useState<ReportKey>(reportTypes[0].key);
  const [loading,    setLoading]    = useState(true);
  const [columns,    setColumns]    = useState<string[]>([]);
  const [allRows,    setAllRows]    = useState<ReportRow[]>([]);
  const [deptField,  setDeptField]  = useState<string | undefined>(undefined);
  const [cohorts,    setCohorts]    = useState<RetentionCohort[] | undefined>(undefined);
  const [department, setDepartment] = useState("");
  const [search,     setSearch]     = useState("");
  const [error,      setError]      = useState<string | null>(null);

  // If the current selection isn't in the visible set (e.g. the signed-in
  // role can't see Payroll/Recruitment/Performance), fall back to the
  // first tab that role actually has access to.
  useEffect(() => {
    if (!visibleReportTypes.some(r => r.key === reportType) && visibleReportTypes[0]) {
      setReportType(visibleReportTypes[0].key);
    }
  }, [visibleReportTypes, reportType]);

  useEffect(() => {
    setLoading(true);
    setDepartment("");
    setSearch("");
    setError(null);
    loadReportData(reportType).then(({ columns, rows, deptField, cohorts }) => {
      setColumns(columns);
      setAllRows(rows);
      setDeptField(deptField);
      setCohorts(cohorts);
    }).catch(() => {
      // A permission-denied read (e.g. a role that can reach /reports but
      // isn't allowed to read candidates/payroll/performance data)
      // otherwise renders as the ordinary "no data" empty state,
      // indistinguishable from a genuinely empty report.
      setColumns([]);
      setAllRows([]);
      setError("Failed to load this report — you may not have access to some of this data.");
    }).finally(() => setLoading(false));
  }, [reportType]);

  const filtered = useMemo(() => {
    return allRows.filter(row => {
      const matchDept = !department || !deptField || row[deptField] === department;
      const matchSearch = !search || Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
      return matchDept && matchSearch;
    });
  }, [allRows, department, deptField, search]);

  return {
    visibleReportTypes,
    reportType, setReportType,
    loading, columns, filtered, cohorts,
    deptField, department, setDepartment,
    search, setSearch,
    error,
  };
}
