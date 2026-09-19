import { getWorkspaceContext } from "@/lib/workspace-context";
import { getValidatedReportQuery } from "@/lib/reports/report-helpers";
import { getReportData, getTeamReportData } from "@/services/report.service";
import { ReportFilter } from "./_components/report-filter";
import { ReportSummary } from "./_components/report-sumary";
import { ReportTable } from "./_components/report-table";
import { ReportScopeNav } from "./_components/report-scope-nav";
import { TeamReportTable } from "./_components/team-report-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import prisma from "@/lib/prisma";

type ReportsPageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    scope?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { startDate, endDate } = getValidatedReportQuery(resolvedSearchParams);

  const { user, workspace, member } = await getWorkspaceContext();
  const canViewTeam =
    workspace.kind === "COMPANY" &&
    member.active &&
    (member.role === "OWNER" || member.role === "MANAGER");
  const scope = canViewTeam && resolvedSearchParams.scope === "team" ? "team" : "mine";

  const exportHref = `/reports/export?scope=${scope}&startDate=${startDate}&endDate=${endDate}`;

  if (scope === "team") {
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: workspace.id,
        active: true,
        ...(member.role === "MANAGER"
          ? { managerId: member.id, role: "COLLABORATOR" }
          : {}),
      },
      select: { userId: true },
    });
    const teamReport = await getTeamReportData({
      workspaceId: workspace.id,
      userIds: members.map((item) => item.userId),
      startDate,
      endDate,
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe os registros da sua equipe por período.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href={exportHref} download>
              <Download />
              Baixar CSV
            </a>
          </Button>
        </div>
        <ReportScopeNav
          scope="team"
          startDate={startDate}
          endDate={endDate}
          canViewTeam={canViewTeam}
        />
        <ReportFilter startDate={startDate} endDate={endDate} scope="team" />
        <TeamReportTable rows={teamReport.rows} />
      </div>
    );
  }

  const report = await getReportData({
    userId: user.id,
    workspaceId: workspace.id,
    startDate,
    endDate,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Consulte os apontamentos consolidados por período
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={exportHref} download>
            <Download />
            Baixar CSV
          </a>
        </Button>
      </div>

      <ReportScopeNav
        scope="mine"
        startDate={startDate}
        endDate={endDate}
        canViewTeam={canViewTeam}
      />

      <ReportFilter
        startDate={report.period.startDate}
        endDate={report.period.endDate}
      />

      <ReportSummary summary={report.summary} />

      <ReportTable rows={report.rows} />
    </div>
  );
}
