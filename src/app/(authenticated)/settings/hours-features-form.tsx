"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { HoursFeatureSettings } from "@/services/hours-budget.service";
import { saveHoursFeatures } from "../team-hours/actions";

type FeatureKey = keyof HoursFeatureSettings;
type Feedback = {
  tone: "success" | "error" | "info";
  message: string;
};

const featureMessages: Record<FeatureKey, { enabled: string; disabled: string }> = {
  hoursControlEnabled: {
    enabled: "Controle contratual de horas ativado.",
    disabled: "Controle contratual de horas desabilitado.",
  },
  adjustmentsRequireApproval: {
    enabled: "Aprovação de ajustes de horas ativada.",
    disabled: "Aprovação de ajustes de horas desabilitada.",
  },
  hoursNotificationsEnabled: {
    enabled: "Notificações de distribuição ativadas.",
    disabled: "Notificações de distribuição desabilitadas.",
  },
  hoursAlertsEnabled: {
    enabled: "Alertas de consumo ativados.",
    disabled: "Alertas de consumo desabilitados.",
  },
};

export function HoursFeaturesForm({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: HoursFeatureSettings;
}) {
  const [values, setValues] = useState(initial);
  const [savedValues, setSavedValues] = useState(initial);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: keyof HoursFeatureSettings, value: boolean) {
    setValues((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  function save() {
    const keys = Object.keys(featureMessages) as FeatureKey[];
    const changedKeys = keys.filter((key) => values[key] !== savedValues[key]);

    if (changedKeys.length === 0) {
      setFeedback({
        tone: "info",
        message: "Nenhuma alteração pendente.",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveHoursFeatures({ workspaceId, ...values });

      if (!result.ok) {
        setFeedback({
          tone: "error",
          message: result.message ?? "Não foi possível atualizar os recursos.",
        });
        return;
      }

      setSavedValues(values);
      setFeedback({
        tone: "success",
        message: changedKeys
          .map((key) =>
            values[key] ? featureMessages[key].enabled : featureMessages[key].disabled,
          )
          .join(" "),
      });
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
        {feedback && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : feedback.tone === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-border bg-muted/40 text-muted-foreground"
            }`}
            role={feedback.tone === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {feedback.tone === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            ) : feedback.tone === "error" ? (
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
