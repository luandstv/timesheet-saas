import { NextResponse } from "next/server";

import { getWorkspaceContext } from "@/lib/workspace-context";
import { getValidatedReportQuery } from "@/lib/reports/report-helpers";
import {
  getReportData,
  getTeamReportData,
  type ReportResult,
} from "@/services/report.service";
import prisma from "@/lib/prisma";

function csv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function filenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function html(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function detailHeaders() {
  return [
    "Data",
    "Tipo do dia",
    "Status",
    "Total trabalhado",
    "Horas normais",
    "Extras 75% FHC",
    "Extras 75% FHCN",
    "Extras 100% FHC",
    "Extras 100% FHCN",
    "Acionamentos (minutos)",
    "Quantidade de acionamentos",
    "Dias de ausência aprovados",
  ];
}

function detailValues(report: ReportResult) {
  return report.rows.map((row) => [
    row.date,
    row.dayType,
    row.status,
    row.totalWorkedMinutes,
    row.normalMinutes,
    row.overtime75FhcMinutes,
    row.overtime75FhcnMinutes,
    row.overtime100FhcMinutes,
    row.overtime100FhcnMinutes,
    row.activityMinutes,
    row.activityCount,
    row.absenceDays,
  ]);
}

function buildExcelResponse(filename: string, headers: string[], rows: unknown[][]) {
  const tableRows = [headers, ...rows]
    .map((row) => `<tr>${row.map((value) => `<td>${html(value)}</td>`).join("")}</tr>`)
    .join("");
  const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;

  return new NextResponse(`\uFEFF${workbook}`, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function pdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/[\\()]/g, "\\$&");
}

function buildPdfResponse(filename: string, lines: string[]) {
  const chunks = Array.from(
    { length: Math.max(1, Math.ceil(lines.length / 42)) },
    (_, index) => lines.slice(index * 42, index * 42 + 42),
  );
  const objects = ["", "<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pages: { page: number; content: number; lines: string[] }[] = [];

  for (const chunk of chunks) {
    const page = objects.length;
    objects.push("");
    const content = objects.length;
    objects.push("");
    pages.push({ page, content, lines: chunk });
  }

  const font = objects.length;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects[2] = `<< /Type /Pages /Kids [${pages.map(({ page }) => `${page} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  for (const { page, content, lines: pageLines } of pages) {
    const stream = [
      "BT",
      "/F1 9 Tf",
      "40 760 Td",
      ...pageLines.flatMap((line, index) => [
        `(${pdfText(line)}) Tj`,
        ...(index < pageLines.length - 1 ? ["0 -16 Td"] : []),
      ]),
      "ET",
    ].join("\n");
    objects[page] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`;
    objects[content] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }

  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = output.length;
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join("\n");
  output += `\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new NextResponse(new TextEncoder().encode(output), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "team" ? "team" : "mine";
  const personId = url.searchParams.get("person");
  const format = url.searchParams.get("format");
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
  let exportHeaders: string[] = [];
  let exportRows: unknown[][] = [];
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
    const memberIds = members.map((item) => item.userId);
    if (personId && !memberIds.includes(personId)) {
      return NextResponse.json(
        { error: "Você não pode exportar a folha desta pessoa." },
        { status: 403 },
      );
    }

    if (personId) {
      const personReport = await getReportData({
        userId: personId,
        workspaceId: workspace.id,
        startDate,
        endDate,
      });
      const person = await prisma.user.findUnique({
        where: { id: personId },
        select: { name: true },
      });
      const personName = person?.name ?? "colaborador";
      const detailRows = detailValues(personReport);
      const detailFilename = `jornix-folha-${filenamePart(personName)}-${startDate}-${endDate}`;

      if (format === "pdf") {
        return buildPdfResponse(`${detailFilename}.pdf`, [
          `Folha de conferencia - ${personName}`,
          `Periodo: ${startDate} a ${endDate}`,
          "",
          detailHeaders().join(" | "),
          ...detailRows.map((row) => row.join(" | ")),
        ]);
      }

      if (format === "excel") {
        return buildExcelResponse(`${detailFilename}.xls`, detailHeaders(), detailRows);
      }

      lines = [
        detailHeaders().map(csv).join(","),
        ...detailRows.map((row) => row.map(csv).join(",")),
      ];
      filename = `${detailFilename}.csv`;
    } else {
      exportHeaders = [
        "Pessoa",
        "Email",
        "Dias com registros",
        "Total trabalhado",
        "Horas normais",
        "Extras 75%",
        "Extras 100%",
        "Acionamentos (minutos)",
        "Quantidade de acionamentos",
        "Dias de ausência aprovados",
      ];
      exportRows = report.rows.map((row) => [
        row.name,
        row.email,
        row.daysWithRecords,
        row.totalWorkedMinutes,
        row.normalMinutes,
        row.overtime75Minutes,
        row.overtime100Minutes,
        row.activityMinutes,
        row.activityCount,
        row.absenceDays,
      ]);
      lines = [
        exportHeaders.map(csv).join(","),
        ...exportRows.map((row) => row.map(csv).join(",")),
      ];
      filename = `jornix-equipe-${startDate}-${endDate}`;
    }
  } else {
    const report = await getReportData({
      userId: user.id,
      workspaceId: workspace.id,
      startDate,
      endDate,
    });
    exportHeaders = [
      "Data",
      "Tipo do dia",
      "Status",
      "Total trabalhado",
      "Horas normais",
      "Extras 75% FHC",
      "Extras 75% FHCN",
      "Extras 100% FHC",
      "Extras 100% FHCN",
      "Acionamentos (minutos)",
      "Quantidade de acionamentos",
      "Dias de ausência aprovados",
    ];
    exportRows = report.rows.map((row) => [
      row.date,
      row.dayType,
      row.status,
      row.totalWorkedMinutes,
      row.normalMinutes,
      row.overtime75FhcMinutes,
      row.overtime75FhcnMinutes,
      row.overtime100FhcMinutes,
      row.overtime100FhcnMinutes,
      row.activityMinutes,
      row.activityCount,
      row.absenceDays,
    ]);
    lines = [
      exportHeaders.map(csv).join(","),
      ...exportRows.map((row) => row.map(csv).join(",")),
    ];
    filename = `jornix-relatorio-${startDate}-${endDate}`;
  }

  if (format === "pdf") {
    return buildPdfResponse(`${filename}.pdf`, [
      "Relatório de horas",
      `Período: ${startDate} a ${endDate}`,
      "",
      exportHeaders.join(" | "),
      ...exportRows.map((row) => row.join(" | ")),
    ]);
  }

  if (format === "excel") {
    return buildExcelResponse(`${filename}.xls`, exportHeaders, exportRows);
  }

  return new NextResponse(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
