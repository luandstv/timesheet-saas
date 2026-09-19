"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Clock3, History, LockKeyhole, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AdjustmentTab =
  "movements" | "requests" | "closure" | "history" | "collaborators";

type AdjustmentsTabsProps = {
  children: ReactNode;
  defaultTab: AdjustmentTab;
  pendingCount: number;
  showClosure: boolean;
  showCollaborators: boolean;
};

const validTabs: AdjustmentTab[] = [
  "movements",
  "requests",
  "closure",
  "history",
  "collaborators",
];

function tabFromLocation(
  fallback: AdjustmentTab,
  showCollaborators: boolean,
): AdjustmentTab {
  const value = new URLSearchParams(window.location.search).get("tab");
  return validTabs.includes(value as AdjustmentTab) &&
    (value !== "collaborators" || showCollaborators)
    ? (value as AdjustmentTab)
    : fallback;
}

export function AdjustmentsTabs({
  children,
  defaultTab,
  pendingCount,
  showClosure,
  showCollaborators,
}: AdjustmentsTabsProps) {
  const router = useRouter();
  const [navigationPending, startNavigation] = useTransition();
  const initialTab =
    (showClosure || defaultTab !== "closure") &&
    (showCollaborators || defaultTab !== "collaborators")
      ? defaultTab
      : "movements";
  const [tab, setTab] = useState<AdjustmentTab>(initialTab);

  useEffect(() => {
    const onPopState = () => {
      const next = tabFromLocation(initialTab, showCollaborators);
      setTab(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialTab, showCollaborators]);

  const changeTab = (value: string) => {
    if (
      !validTabs.includes(value as AdjustmentTab) ||
      (value === "collaborators" && !showCollaborators)
    )
      return;
    const next = value as AdjustmentTab;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    if (next === "collaborators") {
      startNavigation(() => {
        router.push(`${url.pathname}?${url.searchParams.toString()}`, {
          scroll: false,
        });
      });
      return;
    }
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <Tabs value={tab} onValueChange={changeTab} className="w-full">
      <TabsList aria-label="Seções de ajustes e fechamento">
        <TabsTrigger value="movements">
          <Clock3 aria-hidden="true" className="size-4" />
          <span>Registros de ponto</span>
        </TabsTrigger>
        <TabsTrigger value="requests">
          <ClipboardCheck aria-hidden="true" className="size-4" />
          <span>Solicitações</span>
          {pendingCount > 0 && (
            <Badge className="h-5 min-h-5 min-w-5 px-1.5 py-0.5 text-[11px] leading-3">
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
        {showClosure && (
          <TabsTrigger value="closure">
            <LockKeyhole aria-hidden="true" className="size-4" />
            <span>Fechamento</span>
          </TabsTrigger>
        )}
        <TabsTrigger value="history">
          <History aria-hidden="true" className="size-4" />
          <span>Histórico</span>
        </TabsTrigger>
        {showCollaborators && (
          <TabsTrigger value="collaborators">
            <UsersRound aria-hidden="true" className="size-4" />
            <span>Colaboradores</span>
          </TabsTrigger>
        )}
      </TabsList>
      {navigationPending && tab === "collaborators" ? (
        <div role="status" aria-live="polite" className="mt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-4 animate-pulse rounded-full bg-primary/60" />
            Carregando colaboradores…
          </div>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : (
        children
      )}
    </Tabs>
  );
}
