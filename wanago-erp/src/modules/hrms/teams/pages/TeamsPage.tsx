"use client";

import { Users } from "lucide-react";
import { useTeams } from "@/modules/hrms/teams/hooks/useTeams";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { initials } from "@/lib/utils/helpers";

export function TeamsPage() {
  const { loading, teams } = useTeams();
  const isEmpty = !loading && teams.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teams"
        description="Everyone, grouped by department"
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No active employees"
          description="Once employees are added and marked active, teams will appear here grouped by department."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.department} hover className="fluid-card">
              <CardHeader>
                <CardTitle>{team.department}</CardTitle>
                <span className="flex-shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                </span>
              </CardHeader>
              <div className="space-y-2">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(member.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{member.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.designation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
