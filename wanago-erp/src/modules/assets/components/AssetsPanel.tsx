"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Check, X as XIcon, Loader2, Upload } from "lucide-react";
import { useAssets } from "@/modules/assets/hooks/useAssets";
import { AssetForm } from "@/modules/assets/components/AssetForm";
import { AssetsTable } from "@/modules/assets/components/AssetsTable";
import { AssetDetailModal } from "@/modules/assets/components/AssetDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn, type ParseRowResult } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { useAuthStore } from "@/store/auth.store";
import { assetSchema } from "@/modules/assets/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Employee } from "@/modules/hrms/shared/types";
import type { Office } from "@/modules/admin/offices/types";
import type { Asset } from "@/modules/assets/types";
import type { AssetSchema } from "@/modules/assets/schemas";

const TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "name",         label: "Name",         required: true, example: "Dell Latitude 5420" },
  { key: "category",     label: "Category",     required: true, example: "Laptop" },
  { key: "serialNumber", label: "Serial Number", example: "SN-12345" },
  { key: "condition",    label: "Condition",     example: "good" },
  { key: "assignedTo",   label: "Assigned To",   example: "EMP-0001 or Jane Doe (optional)" },
  { key: "office",       label: "Office",        example: "Head Office" },
];

// Matches a free-text "Assigned To" column value against employeeCode first,
// then fullName (case-insensitive). Assignment is optional for assets, so an
// unmatched or blank value simply leaves the asset unassigned.
function resolveEmployeeRef(value: string | undefined, employees: Employee[]): { id: string; fullName: string } | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const byCode = employees.find((e) => e.employeeCode.toLowerCase() === lower);
  if (byCode) return { id: byCode.id, fullName: byCode.fullName };
  const byName = employees.find((e) => e.fullName.toLowerCase() === lower);
  if (byName) return { id: byName.id, fullName: byName.fullName };
  return null;
}

export function AssetsPanel() {
  const { assets, pendingRequests, loading, load, addAsset, editAsset, removeAsset, decideRequest } = useAssets();
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [viewing, setViewing] = useState<Asset | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
    fetchOffices().then(setOffices);
  }, []);

  async function handleDecide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    await decideRequest(id, decision);
    setBusyId(null);
  }

  function handleEdit(a: Asset) {
    setViewing(null);
    setEditing(a);
    setFormOpen(true);
  }

  function handleDelete(a: Asset) {
    if (!confirm(`Delete asset "${a.name}"?`)) return;
    setViewing(null);
    removeAsset(a.id);
  }

  function onParseRow(raw: Record<string, string>): ParseRowResult<AssetSchema> {
    const empRef = resolveEmployeeRef(raw["Assigned To"], employees);

    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const rawCondition = raw["Condition"]?.trim().toLowerCase();

    const candidate = {
      name:           raw["Name"]?.trim() ?? "",
      category:       raw["Category"]?.trim() ?? "",
      serialNumber:   raw["Serial Number"]?.trim() ?? "",
      condition:      (["good", "fair", "damaged"].includes(rawCondition ?? "") ? rawCondition : "good") as AssetSchema["condition"],
      assignedToId:   empRef?.id ?? "",
      assignedToName: empRef?.fullName ?? "",
      officeId:       office.officeId,
    };

    const result = assetSchema.safeParse(candidate);
    if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid row" };
    return { data: result.data };
  }

  async function onImport(rows: AssetSchema[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const row of rows) {
      const { error } = await addAsset(row);
      if (error) failed++;
      else created++;
    }
    return { created, failed };
  }

  const exportRows = assets.map((a) => ({
    Name:           a.name,
    Category:       a.category,
    SerialNumber:   a.serialNumber ?? "",
    Condition:      a.condition,
    AssignedTo:     a.assignedToName ?? "",
    AssignedDate:   a.assignedDate ?? "",
    Office:         offices.find((o) => o.id === a.officeId)?.name ?? a.officeId,
    Status:         a.status,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Assets" description={`${assets.length} registered · ${pendingRequests.length} pending requests`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>Import</Button>
          <BulkExportButton filenameBase="assets" rows={exportRows} />
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Asset</Button>
        </>} />

      {pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">Pending Asset Requests</p>
          <div className="space-y-2">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.employeeName} · {r.assetCategory}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.reason} · {formatDate(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {busyId === r.id ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <button onClick={() => handleDecide(r.id, "approve")} className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"><Check size={15} /></button>
                      <button onClick={() => handleDecide(r.id, "reject")} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"><XIcon size={15} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {assets.length === 0 && !loading ? (
        <EmptyState title="No assets registered yet" description="Add company equipment, ID cards, and more" icon={<span className="text-2xl">💻</span>} />
      ) : (
        <AssetsTable
          assets={assets}
          loading={loading}
          onView={setViewing}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <AssetDetailModal
        asset={viewing ? assets.find(a => a.id === viewing.id) ?? viewing : null}
        onClose={() => setViewing(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AssetForm
        open={formOpen}
        asset={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={async (data) => {
          if (editing) await editAsset(editing.id, data);
          else await addAsset(data);
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <BulkImportModal<AssetSchema>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Assets"
        description="Upload a .csv or .xlsx file to register many assets at once"
        templateColumns={TEMPLATE_COLUMNS}
        onParseRow={(raw) => onParseRow(raw)}
        onImport={onImport}
      />
    </div>
  );
}
