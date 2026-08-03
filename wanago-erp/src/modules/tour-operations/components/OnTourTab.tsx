"use client";

import { useState } from "react";
import { Send, Radio, AlertTriangle, NotebookPen, Plus, CheckCircle2 } from "lucide-react";
import { Field, inputClass } from "@/modules/tour-operations/components/shared";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { useTourOperation } from "@/modules/tour-operations/hooks/useTourOperation";
import type { OnTour } from "@/modules/tour-operations/types";

type Ops = ReturnType<typeof useTourOperation>;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function OnTourTab({ onTour, ops }: { onTour: OnTour; ops: Ops }) {
  return (
    <div className="space-y-5">
      <PlanningMessages entries={onTour.dailyPlanningMessages} onAdd={ops.logPlanningMessage} />
      <CoordinatorReports entries={onTour.dailyCoordinatorReports} onAdd={ops.logCoordinatorReport} />
      <Issues entries={onTour.issues} onAdd={ops.logIssue} onResolve={ops.markIssueResolved} />
      <DailyMonitoring entries={onTour.dailyMonitoring} onAdd={ops.logMonitoringEntry} />
    </div>
  );
}

function LogCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
      </div>
      {children}
    </div>
  );
}

function PlanningMessages({ entries, onAdd }: { entries: OnTour["dailyPlanningMessages"]; onAdd: Ops["logPlanningMessage"] }) {
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<"sent" | "pending">("sent");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    setSaving(true);
    try { await onAdd({ date, status, remarks }); setRemarks(""); } finally { setSaving(false); }
  }

  return (
    <LogCard title="Daily Tour Planning Message" icon={<Send size={14} className="text-primary" />}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
        <Field label="Date"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as "sent" | "pending")}>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
          </select>
        </Field>
        <Field label="Remarks" className="sm:col-span-1"><input className={inputClass} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <Button size="sm" icon={<Plus size={14} />} onClick={add} disabled={saving}>Log</Button>
      </div>
      <EntryList items={entries.map((e) => ({ id: e.id, left: e.date, mid: e.remarks, status: e.status, statusVariant: e.status === "sent" ? "success" : "warning" }))} />
    </LogCard>
  );
}

function CoordinatorReports({ entries, onAdd }: { entries: OnTour["dailyCoordinatorReports"]; onAdd: Ops["logCoordinatorReport"] }) {
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<"received" | "pending">("received");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    setSaving(true);
    try { await onAdd({ date, status, remarks }); setRemarks(""); } finally { setSaving(false); }
  }

  return (
    <LogCard title="Daily Tour Coordinator Report" icon={<Radio size={14} className="text-primary" />}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
        <Field label="Date"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as "received" | "pending")}>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
          </select>
        </Field>
        <Field label="Remarks" className="sm:col-span-1"><input className={inputClass} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <Button size="sm" icon={<Plus size={14} />} onClick={add} disabled={saving}>Log</Button>
      </div>
      <EntryList items={entries.map((e) => ({ id: e.id, left: e.date, mid: e.remarks, status: e.status, statusVariant: e.status === "received" ? "success" : "warning" }))} />
    </LogCard>
  );
}

function Issues({ entries, onAdd, onResolve }: { entries: OnTour["issues"]; onAdd: Ops["logIssue"]; onResolve: Ops["markIssueResolved"] }) {
  const [description, setDescription] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!description.trim()) return;
    setSaving(true);
    try {
      await onAdd({ description, remarks, raisedAt: new Date().toISOString() });
      setDescription(""); setRemarks("");
    } finally { setSaving(false); }
  }

  return (
    <LogCard title="Issue Resolution" icon={<AlertTriangle size={14} className="text-primary" />}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
        <Field label="Issue Description" className="sm:col-span-2"><input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Button size="sm" icon={<Plus size={14} />} onClick={add} disabled={saving}>Log Issue</Button>
        <Field label="Remarks" className="sm:col-span-3"><input className={inputClass} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </div>
      <div className="space-y-2">
        {entries.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{i.description}</p>
              {i.remarks && <p className="truncate text-xs text-muted-foreground">{i.remarks}</p>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Badge variant={i.status === "resolved" ? "success" : "warning"}>{i.status === "resolved" ? "Resolved" : "Pending"}</Badge>
              {i.status === "pending" && (
                <Button size="sm" variant="outline" icon={<CheckCircle2 size={13} />} onClick={() => onResolve(i.id)}>Resolve</Button>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-muted-foreground">No issues logged.</p>}
      </div>
    </LogCard>
  );
}

function DailyMonitoring({ entries, onAdd }: { entries: OnTour["dailyMonitoring"]; onAdd: Ops["logMonitoringEntry"] }) {
  const [date, setDate] = useState(todayISO());
  const [update, setUpdate] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!update.trim()) return;
    setSaving(true);
    try { await onAdd({ date, update }); setUpdate(""); } finally { setSaving(false); }
  }

  return (
    <LogCard title="Daily Package Monitoring" icon={<NotebookPen size={14} className="text-primary" />}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
        <Field label="Date"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Daily Update / Remarks" className="sm:col-span-2"><input className={inputClass} value={update} onChange={(e) => setUpdate(e.target.value)} /></Field>
        <Button size="sm" icon={<Plus size={14} />} onClick={add} disabled={saving}>Log</Button>
      </div>
      <div className="space-y-2">
        {[...entries].reverse().map((e) => (
          <div key={e.id} className="rounded-xl border border-border/70 px-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground">{e.date}</p>
            <p className="text-sm text-foreground">{e.update}</p>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-muted-foreground">No updates logged.</p>}
      </div>
    </LogCard>
  );
}

function EntryList({ items }: { items: { id: string; left: string; mid: string; status: string; statusVariant: "success" | "warning" }[] }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">No entries logged.</p>;
  return (
    <div className="space-y-2">
      {[...items].reverse().map((it) => (
        <div key={it.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">{it.left}</p>
            {it.mid && <p className="truncate text-sm text-foreground">{it.mid}</p>}
          </div>
          <Badge variant={it.statusVariant}>{it.status}</Badge>
        </div>
      ))}
    </div>
  );
}
