import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { DashboardService } from "@/services/dashboard.service";
import { formatMinutesToHours } from "@/lib/format";
import { TimeEntriesList } from "@/components/shared/time-entries-list";
import { TimeEntryService } from "@/services/time-entry.service";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  const timeSheet = await TimeEntryService.getTodayEntries(user.id);
  const entries = timeSheet?.entries || [];

  const today = await DashboardService.getTodaySummary(user.id);
  const week = await DashboardService.getWeekSummary(user.id);
  const month = await DashboardService.getMonthSummary(user.id);

  const monthOvertimeTotal =
    month.overtime75FhcMinutes +
    month.overtime75FhcnMinutes +
    month.overtime100FhcMinutes +
    month.overtime100FhcnMinutes;

  const monthOvertime75 =
    month.overtime75FhcMinutes + month.overtime75FhcnMinutes;

  const monthOvertime100 =
    month.overtime100FhcMinutes + month.overtime100FhcnMinutes;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          Aqui está o resumo da sua jornada
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutesToHours(today.totalWorkedMinutes)}
            </div>
            <p className="text-sx text-muted-foreground">
              Jornada: {user?.dailyHours}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutesToHours(week.totalWorkedMinutes)}
            </div>
            <p className="text-sx text-muted-foreground">
              Meta: {user?.weeklyHours}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horas Extras Mês
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutesToHours(monthOvertimeTotal)}
            </div>
            <p className="text-sx text-muted-foreground">
              75%: {formatMinutesToHours(monthOvertime75)} | 100%:{" "}
              {formatMinutesToHours(monthOvertime100)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sobreaviso Mês
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 dias</div>
            <p className="text-sx text-muted-foreground">0h total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeEntriesList entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
