import type { ReportSummary as ReportSummaryData } from "@/services/report.service";
import { formatMinutesToHours } from "@/lib/format";

type ReportSummaryProps = {
  summary: ReportSummaryData;
};

export function ReportSummary({ summary }: ReportSummaryProps) {
  const items = [
    {
      label: "Total trabalhado",
      value: summary.totalWorkedMinutes,
    },
    {
      label: "Horas normais",
      value: summary.normalMinutes,
    },
    {
      label: "Extra 75% FHC",
      value: summary.overtime75FhcMinutes,
    },
    {
      label: "Extra 75% FHCN",
      value: summary.overtime75FhcnMinutes,
    },
    {
      label: "Extra 100% FHC",
      value: summary.overtime100FhcMinutes,
    },
    {
      label: "Extra 100% FHCN",
      value: summary.overtime100FhcnMinutes,
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">Resumo do período</h2>
        <p className="text-sm text-muted-foreground">
          Totais consolidados para o período selecionado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">
              {formatMinutesToHours(item.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
