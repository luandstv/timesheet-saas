import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Mail, UserRound } from "lucide-react";
import { DateTime } from "luxon";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutesToHours } from "@/lib/format";
import { TIMEZONE } from "@/lib/constants";
import type { OnCallDay } from "@/services/on-call.service";
import { ProfileAvatarForm } from "@/app/(authenticated)/profile/_components/profile-avatar-form";

export type PersonProfileData = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "OWNER" | "MANAGER" | "COLLABORATOR";
  dailyHours: number;
  weeklyHours: number;
  workStartHour: number;
  workStartMinute: number;
  workEndHour: number;
  workEndMinute: number;
  managerName: string | null;
  workspaceName: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleLabel(role: PersonProfileData["role"]) {
  return role === "OWNER"
    ? "Responsável"
    : role === "MANAGER"
      ? "Gestor"
      : "Colaborador";
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatMonth(monthKey: string) {
  return DateTime.fromISO(`${monthKey}-01`, { zone: TIMEZONE })
    .setLocale("pt-BR")
    .toFormat("LLLL yyyy")
    .replace(/^./, (value) => value.toUpperCase());
}

function formatDay(date: string) {
  return DateTime.fromISO(date, { zone: TIMEZONE })
    .setLocale("pt-BR")
    .toFormat("ccc, dd/MM")
    .replace(/^./, (value) => value.toUpperCase());
}

export function PersonProfile({
  profile,
  onCallDays,
  monthKey,
  backHref,
  isOwn,
}: {
  profile: PersonProfileData;
  onCallDays: OnCallDay[];
  monthKey: string;
  backHref: string;
  isOwn: boolean;
}) {
  const totalOnCallMinutes = onCallDays.reduce(
    (total, day) => total + day.totalOnCallMinutes,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={backHref}>
          <ArrowLeft aria-hidden="true" />
          {isOwn ? "Voltar para o dashboard" : "Voltar para a escala"}
        </Link>
      </Button>

      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-7">
        {isOwn ? (
          <ProfileAvatarForm
            userId={profile.id}
            name={profile.name}
            avatarUrl={profile.avatarUrl}
          />
        ) : (
          <Avatar size="lg" className="size-16 bg-primary/15 text-primary">
            {profile.avatarUrl && (
              <AvatarImage src={profile.avatarUrl} alt={`Foto de ${profile.name}`} />
            )}
            <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
              {initials(profile.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
            <Badge variant="outline">
              {isOwn ? "Meu perfil" : roleLabel(profile.role)}
            </Badge>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            {profile.email}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{profile.workspaceName}</p>
        </div>
        {isOwn && (
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/settings">
              <UserRound aria-hidden="true" />
              Editar configurações
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-primary" aria-hidden="true" />
              Dados do perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileLine label="Função" value={roleLabel(profile.role)} />
            <ProfileLine
              label="Gestor responsável"
              value={profile.managerName ?? "Sem gestor definido"}
            />
            <ProfileLine label="Carga diária" value={`${profile.dailyHours} horas`} />
            <ProfileLine label="Carga semanal" value={`${profile.weeklyHours} horas`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="size-4 text-primary" aria-hidden="true" />
              Jornada configurada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileLine
              label="Expediente"
              value={`${formatTime(profile.workStartHour, profile.workStartMinute)} às ${formatTime(profile.workEndHour, profile.workEndMinute)}`}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              O horário é usado como referência para separar registros normais de
              acionamentos extras.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-2 border-b border-border/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                Sobreaviso em {formatMonth(monthKey)}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Dias marcados na escala desta pessoa.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {onCallDays.length} {onCallDays.length === 1 ? "dia" : "dias"}
              </Badge>
              <Badge variant="outline">
                {formatMinutesToHours(totalOnCallMinutes)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {onCallDays.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {onCallDays.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{formatDay(day.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {day.isHoliday
                        ? "Feriado"
                        : day.isWeekend
                          ? "Fim de semana"
                          : "Dia útil"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {formatMinutesToHours(day.totalOnCallMinutes)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum dia de sobreaviso marcado neste período.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
