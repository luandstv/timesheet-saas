"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CsvDownloadButton } from "./csv-download-button";

export function ReportExportActions({
  personId,
  startDate,
  endDate,
}: {
  personId: string;
  startDate: string;
  endDate: string;
}) {
  const query = `scope=team&person=${encodeURIComponent(personId)}&startDate=${startDate}&endDate=${endDate}`;

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <CsvDownloadButton
        href={`/reports/export?${query}`}
        label="Baixar CSV"
        loadingLabel="Gerando CSV…"
        fallbackFilename="jornix-folha.csv"
        loadingMessage="Gerando folha CSV…"
      />
      <CsvDownloadButton
        href={`/reports/export?${query}&format=excel`}
        label="Baixar Excel"
        loadingLabel="Gerando Excel…"
        fallbackFilename="jornix-folha.xls"
        loadingMessage="Gerando folha Excel…"
      />
      <CsvDownloadButton
        href={`/reports/export?${query}&format=pdf`}
        label="Baixar PDF"
        loadingLabel="Gerando PDF…"
        fallbackFilename="jornix-folha.pdf"
        loadingMessage="Gerando folha PDF…"
      />
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer aria-hidden="true" />
        Imprimir
      </Button>
    </div>
  );
}
