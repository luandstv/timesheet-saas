"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { HoursFeatureSettings } from "@/services/hours-budget.service";
import { saveHoursFeatures } from "../team-hours/actions";

export function HoursFeaturesForm({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: HoursFeatureSettings;
}) {
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: keyof HoursFeatureSettings, value: boolean) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await saveHoursFeatures({ workspaceId, ...values });
      setMessage(result.message ?? "Recursos atualizados.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
          <Checkbox
            checked={values.hoursControlEnabled}
            onCheckedChange={(checked) =>
              update("hoursControlEnabled", Boolean(checked))
            }
            disabled={pending}
          />
          <span>
            <strong className="block">Controle contratual de horas</strong>
            <span className="text-xs text-muted-foreground">
              Metas, consumo, excedentes e dashboard do time.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
          <Checkbox
            checked={values.adjustmentsRequireApproval}
            onCheckedChange={(checked) =>
              update("adjustmentsRequireApproval", Boolean(checked))
            }
            disabled={pending}
          />
          <span>
            <strong className="block">Aprovar ajustes de horas</strong>
            <span className="text-xs text-muted-foreground">
              Novos ajustes aguardam gestor ou owner quando ativo.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
          <Checkbox
            checked={values.hoursNotificationsEnabled}
            onCheckedChange={(checked) =>
              update("hoursNotificationsEnabled", Boolean(checked))
            }
            disabled={pending}
          />
          <span>
            <strong className="block">Notificações de distribuição</strong>
            <span className="text-xs text-muted-foreground">
              Comunica mudanças de meta e turno ao colaborador.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
          <Checkbox
            checked={values.hoursAlertsEnabled}
            onCheckedChange={(checked) =>
              update("hoursAlertsEnabled", Boolean(checked))
            }
            disabled={pending}
          />
          <span>
            <strong className="block">Alertas de consumo</strong>
            <span className="text-xs text-muted-foreground">
              Avisa 80%, 100% e excedentes da competência.
            </span>
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          <Save />
          {pending ? <LoaderCircle className="animate-spin" /> : null}Salvar recursos
        </Button>
        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
