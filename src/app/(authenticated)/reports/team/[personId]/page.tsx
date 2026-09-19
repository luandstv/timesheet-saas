import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { canReadMember } from "@/lib/workspace-policy";
import {
  formatReportPeriodLabel,
  getValidatedReportQuery,
} from "@/lib/reports/report-helpers";
import { getReportData } from "@/services/report.service";
import prisma from "@/lib/prisma";
import { ReportFilter } from "../../_components/report-filter";
import { ReportExportActions } from "../../_components/report-export-actions";
import { ReportSummary } from "../../_components/report-sumary";
import { ReportTable } from "../../_components/report-table";

type TeamPersonPageProps = {
  params: Promise<{ personId: string }>;
  searchParams?: Promise<{ startDate?: string; endDate?: string }>;
};

export default async function TeamPersonReportPage({
  params,
  searchParams,
}: TeamPersonPageProps) {
  const { personId } = await params;
  const query = (await searchParams) ?? {};
  const { startDate, endDate } = getValidatedReportQuery(query);
  const { workspace, member } = await getWorkspaceContext();

  const subject = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: workspace.id,
      userId: personId,
      active: true,
    },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
      active: true,
      managerId: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!subject || !canReadMember(member, subject)) notFound();

  const report = await getReportData({
    userId: personId,
    workspaceId: workspace.id,
    startDate,
    endDate,
  });

  const backHref = `/reports?scope=team&startDate=${startDate}&endDate=${endDate}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-3 print:hidden">
            <Link href={backHref}>
              <ArrowLeft aria-hidden="true" />
              Voltar para equipe
            </Link>
          </Button>
          <div>
            <p className="text-sm font-medium text-primary">Folha de conferência</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {subject.user.name}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="size-4" aria-hidden="true" />
              {subject.user.email} · {workspace.name}
            </p>
          </div>
          <Badge variant="outline">{formatReportPeriodLabel(startDate, endDate)}</Badge>
        </div>
        <ReportExportActions
          personId={personId}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      <ReportFilter startDate={startDate} endDate={endDate} />
      <ReportSummary summary={report.summary} />
      <ReportTable rows={report.rows} />
    </div>
  );
}
