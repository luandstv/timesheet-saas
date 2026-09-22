import { NextResponse } from "next/server";

import { getWorkspaceContext } from "@/lib/workspace-context";
import { HoursBudgetService } from "@/services/hours-budget.service";

function csv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function html(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/[\\()]/g, "\\$&");
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
  const month = url.searchParams.get("month") ?? undefined;
  const format = url.searchParams.get("format");
  const { user, workspace } = await getWorkspaceContext();
  const overview = await HoursBudgetService.getOverview(user.id, workspace.id, month);

  if (!overview) {
    return NextResponse.json(
      { error: "O controle de horas não está habilitado neste espaço." },
      { status: 404 },
    );
  }

  const headers = [
    "Pessoa",
    "Email",
    "Função",
    "Horas alocadas",
    "Horas consumidas",
    "Horas disponíveis",
    "Excedente",
    "Percentual consumido",
  ];
  const rows = overview.members.map((member) => [
    member.name,
    member.email,
    member.role === "MANAGER" ? "Gestor" : "Colaborador",
    member.allocatedMinutes,
    member.workedMinutes,
    Math.max(member.remainingMinutes, 0),
    member.overageMinutes,
    `${member.percentUsed}%`,
  ]);
  const filename = `jornix-horas-time-${overview.month}`;

  if (format === "pdf") {
    return buildPdfResponse(`${filename}.pdf`, [
      "Horas do time",
      `Competência: ${overview.month}`,
      `Contrato: ${overview.contractedMinutes} minutos | Consumido: ${overview.consumedMinutes} minutos`,
      "",
      headers.join(" | "),
      ...rows.map((row) => row.join(" | ")),
    ]);
  }

  if (format === "excel") {
    return buildExcelResponse(`${filename}.xls`, headers, rows);
  }

  return new NextResponse(
    `\uFEFF${[headers.map(csv).join(","), ...rows.map((row) => row.map(csv).join(","))].join("\r\n")}\r\n`,
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
