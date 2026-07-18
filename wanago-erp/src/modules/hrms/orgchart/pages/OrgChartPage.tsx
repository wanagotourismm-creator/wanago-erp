"use client";

import { Users } from "lucide-react";
import { useOrgChart, type OrgNode } from "@/modules/hrms/orgchart/hooks/useOrgChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { initials } from "@/lib/utils/helpers";

function OrgNodeItem({ node }: { node: OrgNode }) {
  return (
    <div>
      <div
        className="fluid-card flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
        title={node.employee.functionalManagerName ? `Functional Manager: ${node.employee.functionalManagerName}` : undefined}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials(node.employee.fullName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{node.employee.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{node.employee.designation}</p>
          {node.employee.functionalManagerName && (
            <p className="truncate text-[10px] text-muted-foreground/70">FM: {node.employee.functionalManagerName}</p>
          )}
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-4">
          {node.children.map((child) => (
            <OrgNodeItem key={child.employee.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartPage() {
  const { loading, groups, showGroupHeaders } = useOrgChart();
  const isEmpty = !loading && groups.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Org Chart"
        description="Reporting structure across the company"
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No active employees"
          description="Once employees are added and marked active, the reporting structure will appear here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.department} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              {showGroupHeaders && (
                <p className="mb-4 text-sm font-semibold text-foreground">{group.department}</p>
              )}
              <div className="space-y-4">
                {group.roots.map((root) => (
                  <OrgNodeItem key={root.employee.id} node={root} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
