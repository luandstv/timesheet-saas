"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LoadingOverlay } from "@/components/shared/page-loading";
import { cn } from "@/lib/utils";
import type { DashboardModel } from "../_lib/dashboard";

type Period = DashboardModel["header"]["periods"][number];

export function DashboardPeriodNav({ periods }: { periods: Period[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleNavigate(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();

    if (isPending) return;

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  return (
    <>
      <nav
        aria-label="Período do resumo"
        className={cn(
          "mt-4 ml-auto flex w-full max-w-72 rounded-2xl border border-border bg-card/80 p-0.5",
          isPending && "pointer-events-none opacity-70",
        )}
      >
        {periods.map(({ value, label, active, href }) => (
          <Link
            key={value}
            href={href}
            scroll={false}
            onClick={(event) => handleNavigate(event, href)}
            aria-current={active ? "page" : undefined}
            aria-disabled={isPending}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-center text-xs focus-visible:outline-2 focus-visible:outline-ring",
              active
                ? "bg-primary font-semibold text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {isPending && <LoadingOverlay message="Atualizando resumo…" />}
    </>
  );
}
