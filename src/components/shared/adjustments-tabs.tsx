"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ClipboardCheck, Clock3, History, LockKeyhole } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AdjustmentTab = "movements" | "requests" | "closure" | "history";

type AdjustmentsTabsProps = {
  children: ReactNode;
  defaultTab: AdjustmentTab;
  pendingCount: number;
  showClosure: boolean;
};

const validTabs: AdjustmentTab[] = ["movements", "requests", "closure", "history"];

function tabFromLocation(fallback: AdjustmentTab): AdjustmentTab {
  const value = new URLSearchParams(window.location.search).get("tab");
  return validTabs.includes(value as AdjustmentTab)
    ? (value as AdjustmentTab)
    : fallback;
}

export function AdjustmentsTabs({
  children,
  defaultTab,
  pendingCount,
  showClosure,
}: AdjustmentsTabsProps) {
  const initialTab = showClosure || defaultTab !== "closure" ? defaultTab : "movements";
  const [tab, setTab] = useState<AdjustmentTab>(initialTab);

  useEffect(() => {
    const onPopState = () => {
      const next = tabFromLocation(initialTab);
      setTab(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialTab]);

  const changeTab = (value: string) => {
    if (!validTabs.includes(value as AdjustmentTab)) return;
    const next = value as AdjustmentTab;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
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
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {pendingCount}
            </span>
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
      </TabsList>
      {children}
    </Tabs>
  );
}
