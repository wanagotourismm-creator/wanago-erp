import { useCallback, useEffect, useState } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import type { EmployeeDocument } from "@/modules/hrms/shared/types";

export type DocumentHubRow = {
  employeeId:   string;
  employeeName: string;
  department:   string;
  docId:        string;
  label:        string;
  url:          string;
  uploadedAt:   EmployeeDocument["uploadedAt"];
};

export function useDocumentsHub() {
  const [rows, setRows] = useState<DocumentHubRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const employees = await fetchEmployees();
      const flattened: DocumentHubRow[] = employees.flatMap((emp) =>
        emp.documents.map((doc) => ({
          employeeId:   emp.id,
          employeeName: emp.fullName,
          department:   emp.department,
          docId:        doc.id,
          label:        doc.label,
          url:          doc.url,
          uploadedAt:   doc.uploadedAt,
        }))
      );
      setRows(flattened);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, reload: load };
}
