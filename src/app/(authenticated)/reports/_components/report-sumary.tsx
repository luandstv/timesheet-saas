import type { ReportSummary as ReportSummaryData } from "@/services/report.service";
import { formatMinutesToHours } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

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
    {
      label: "Acionamentos registrados",
      value: summary.activityMinutes,
    },
    {
      label: "Dias de ausência aprovados",
      value: summary.absenceDays ?? 0,
      count: true,
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
          <Card key={item.label} size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {"count" in item && item.count
                  ? item.value
                  : formatMinutesToHours(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
