import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkScheduleForm } from "./work-schedule-form";
import { SalaryForm } from "./salary-form";

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();

  const salaryConfig = await prisma.userSalaryConfig.findFirst({
    where: { userId: user.id },
    orderBy: { validFrom: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie sua jornada de trabalho e dados salariais
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[22px]">
          <CardHeader className="p-6 pb-3 sm:p-8 sm:pb-3">
            <CardTitle>Jornada De Trabalho</CardTitle>
            <CardDescription>
              Configure seu horário de expediente e carga horária.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-3 sm:p-8 sm:pt-3">
            <WorkScheduleForm
              defaultValues={{
                workStartHour: user.workStartHour,
                workStartMinute: user.workStartMinute,
                workEndHour: user.workEndHour,
                workEndMinute: user.workEndMinute,
                dailyHours: user.dailyHours,
                weeklyHours: user.weeklyHours,
              }}
            />
          </CardContent>
        </Card>
        <Card className="rounded-[22px]">
          <CardHeader className="p-6 pb-3 sm:p-8 sm:pb-3">
            <CardTitle>Dados Salariais</CardTitle>
            <CardDescription>
              Informe seu salário para cálculo de horas extras e sobreaviso.
              Apenas você e seu gestor podem ver esses dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-3 sm:p-8 sm:pt-3">
            <SalaryForm
              defaultValues={{
                baseSalary: salaryConfig?.baseSalary != null
                  ? Number(salaryConfig.baseSalary)
                  : 0,
                monthlyHours: salaryConfig?.monthlyHours ?? 220,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
