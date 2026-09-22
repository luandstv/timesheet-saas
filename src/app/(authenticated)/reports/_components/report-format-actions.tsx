"use client";

import { CsvDownloadButton } from "./csv-download-button";

export function ReportFormatActions({
  query,
  prefix = "relatório",
  exportPath = "/reports/export",
}: {
  query: string;
  prefix?: string;
  exportPath?: string;
}) {
  const href = (format?: string) =>
    `${exportPath}?${query}${format ? `&format=${format}` : ""}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <CsvDownloadButton
        href={href()}
        label="Baixar CSV"
        loadingLabel="Gerando CSV…"
        fallbackFilename={`jornix-${prefix}.csv`}
        loadingMessage={`Gerando ${prefix} CSV…`}
      />
      <CsvDownloadButton
        href={href("excel")}
        label="Baixar XLSX"
        loadingLabel="Gerando XLSX…"
        fallbackFilename={`jornix-${prefix}.xls`}
        loadingMessage={`Gerando ${prefix} XLSX…`}
      />
      <CsvDownloadButton
        href={href("pdf")}
        label="Baixar PDF"
        loadingLabel="Gerando PDF…"
        fallbackFilename={`jornix-${prefix}.pdf`}
        loadingMessage={`Gerando ${prefix} PDF…`}
      />
    </div>
  );
}
