import { NextResponse } from "next/server";

import { getWorkspaceContext } from "@/lib/workspace-context";
import { getValidatedReportQuery } from "@/lib/reports/report-helpers";
import { getReportData, getTeamReportData } from "@/services/report.service";
import prisma from "@/lib/prisma";

function csv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "team" ? "team" : "mine";
  const { startDate, endDate } = getValidatedReportQuery({
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
  });
  const { user, workspace, member } = await getWorkspaceContext();
  const canViewTeam =
    workspace.kind === "COMPANY" &&
    member.active &&
    (member.role === "OWNER" || member.role === "MANAGER");

  if (scope === "team" && !canViewTeam) {
    return NextResponse.json(
      { error: "Você não pode exportar este relatório." },
      { status: 403 },
    );
  }

  let lines: string[];
  let filename = `jornix-relatorio-${startDate}-${endDate}.csv`;
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
    const report = await getTeamReportData({
      workspaceId: workspace.id,
      userIds: members.map((item) => item.userId),
      startDate,
      endDate,
    });
    lines = [
      [
        "Pessoa",
        "Email",
        "Dias com registros",
        "Total trabalhado",
        "Horas normais",
        "Extras 75%",
        "Extras 100%",
      ]
        .map(csv)
        .join(","),
      ...report.rows.map((row) =>
        [
          row.name,
          row.email,
          row.daysWithRecords,
          row.totalWorkedMinutes,
          row.normalMinutes,
          row.overtime75Minutes,
          row.overtime100Minutes,
        ]
          .map(csv)
          .join(","),
      ),
    ];
    filename = `jornix-equipe-${startDate}-${endDate}.csv`;
  } else {
    const report = await getReportData({
      userId: user.id,
      workspaceId: workspace.id,
      startDate,
      endDate,
    });
    lines = [
      [
        "Data",
        "Tipo do dia",
        "Status",
        "Total trabalhado",
        "Horas normais",
        "Extras 75% FHC",
        "Extras 75% FHCN",
        "Extras 100% FHC",
        "Extras 100% FHCN",
      ]
        .map(csv)
        .join(","),
      ...report.rows.map((row) =>
        [
          row.date,
          row.dayType,
          row.status,
          row.totalWorkedMinutes,
          row.normalMinutes,
          row.overtime75FhcMinutes,
          row.overtime75FhcnMinutes,
          row.overtime100FhcMinutes,
          row.overtime100FhcnMinutes,
        ]
          .map(csv)
          .join(","),
      ),
    ];
  }

  return new NextResponse(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
