"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { UsersRound, UserRound } from "lucide-react";

import { LoadingOverlay } from "@/components/shared/page-loading";
import { cn } from "@/lib/utils";

export function ReportScopeNav({
  scope,
  startDate,
  endDate,
  canViewTeam,
}: {
  scope: "mine" | "team";
  startDate: string;
  endDate: string;
  canViewTeam: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const query = `startDate=${startDate}&endDate=${endDate}`;
  const items = [
    {
      key: "mine" as const,
      label: "Meu resumo",
      icon: UserRound,
      href: `/reports?${query}`,
    },
    ...(canViewTeam
      ? [
          {
            key: "team" as const,
            label: "Minha equipe",
            icon: UsersRound,
            href: `/reports?scope=team&${query}`,
          },
        ]
      : []),
  ];

  if (items.length === 1) return null;

  return (
    <>
      <nav
        aria-label="Escopo do relatório"
        className="flex w-full gap-1 rounded-xl border border-border bg-muted/45 p-1 sm:w-fit"
      >
        {items.map(({ key, label, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            onClick={(event) => {
              if (isPending) {
                event.preventDefault();
                return;
              }

              event.preventDefault();
              startTransition(() => router.push(href));
            }}
            aria-disabled={isPending}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/70 sm:min-w-40",
              isPending && "pointer-events-none opacity-70",
              scope === key && "bg-accent text-accent-foreground shadow-sm",
            )}
            aria-current={scope === key ? "page" : undefined}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      {isPending && <LoadingOverlay message="Atualizando relatório…" />}
    </>
  );
}
