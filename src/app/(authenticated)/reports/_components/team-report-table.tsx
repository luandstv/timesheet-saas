import type { TeamReportRow } from "@/services/report.service";
import { formatMinutesToCompact } from "@/lib/format";
import { Card } from "@/components/ui/card";

export function TeamReportTable({ rows }: { rows: TeamReportRow[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">Resumo por pessoa</h2>
        <p className="text-sm text-muted-foreground">
          A equipe aparece consolidada, sem valores salariais individuais.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] caption-bottom text-sm">
            <thead className="bg-muted/40 [&_tr]:border-b">
              <tr className="border-b">
                <Header label="Pessoa" />
                <Header label="Dias" />
                <Header label="Total trabalhado" />
                <Header label="Horas normais" />
                <Header label="Extras 75%" />
                <Header label="Extras 100%" />
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-b transition-colors hover:bg-muted/25"
                  >
                    <td className="p-4 align-middle">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="p-4 align-middle tabular-nums">
                      {row.daysWithRecords}
                    </td>
                    <td className="p-4 align-middle tabular-nums">
                      {formatMinutesToCompact(row.totalWorkedMinutes)}
                    </td>
                    <td className="p-4 align-middle tabular-nums">
                      {formatMinutesToCompact(row.normalMinutes)}
                    </td>
                    <td className="p-4 align-middle tabular-nums">
                      {formatMinutesToCompact(row.overtime75Minutes)}
                    </td>
                    <td className="p-4 align-middle tabular-nums">
                      {formatMinutesToCompact(row.overtime100Minutes)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum colaborador encontrado no espaço.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function Header({ label }: { label: string }) {
  return (
    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
      {label}
    </th>
  );
}
