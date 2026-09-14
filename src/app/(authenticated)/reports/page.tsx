import { getAuthenticatedUser } from "@/lib/auth";
import { getValidatedReportQuery } from "@/lib/reports/report-helpers";
import { getReportData } from "@/services/report.service";
import { ReportFilter } from "./_components/report-filter";
import { ReportSummary } from "./_components/report-sumary";
import { ReportTable } from "./_components/report-table";

type ReportsPageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { startDate, endDate } = getValidatedReportQuery(resolvedSearchParams);

  const user = await getAuthenticatedUser();

  const report = await getReportData({
    userId: user.id,
    startDate,
    endDate,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Consulte os apontamentos consolidados por período
        </p>
      </div>

      <ReportFilter
        startDate={report.period.startDate}
        endDate={report.period.endDate}
      />

      <ReportSummary summary={report.summary} />

      <ReportTable rows={report.rows} />
    </div>
  );
}
