"use client";

import { cn } from "@/lib/utils";
import { CsvDownloadButton } from "./csv-download-button";

export function ReportFormatActions({
  query,
  prefix = "relatório",
  exportPath = "/reports/export",
  className,
  compactLabels = false,
}: {
  query: string;
  prefix?: string;
  exportPath?: string;
  className?: string;
  compactLabels?: boolean;
}) {
  const href = (format?: string) =>
    `${exportPath}?${query}${format ? `&format=${format}` : ""}`;

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      <CsvDownloadButton
        href={href()}
        label={compactLabels ? "CSV" : "Baixar CSV"}
        loadingLabel="Gerando CSV…"
        fallbackFilename={`jornix-${prefix}.csv`}
        loadingMessage={`Gerando ${prefix} CSV…`}
      />
      <CsvDownloadButton
        href={href("excel")}
        label={compactLabels ? "XLSX" : "Baixar XLSX"}
        loadingLabel="Gerando XLSX…"
        fallbackFilename={`jornix-${prefix}.xls`}
        loadingMessage={`Gerando ${prefix} XLSX…`}
      />
      <CsvDownloadButton
        href={href("pdf")}
        label={compactLabels ? "PDF" : "Baixar PDF"}
        loadingLabel="Gerando PDF…"
        fallbackFilename={`jornix-${prefix}.pdf`}
        loadingMessage={`Gerando ${prefix} PDF…`}
      />
    </div>
  );
}
