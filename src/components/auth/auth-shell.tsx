"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/shared/brand-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Card } from "@/components/ui/card";

type AuthShellProps = {
  children: ReactNode;
  tabs: ReactNode;
};

export function AuthShell({ children, tabs }: AuthShellProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lg:right-[46%]"
      >
        <Image
          src="/jornix/auth-mountains.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 54vw, 100vw"
          loading="eager"
          className="object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 bg-background/75 lg:bg-black/30 dark:bg-background/55 dark:lg:bg-black/30" />
      </div>
      <div className="relative grid min-h-dvh lg:grid-cols-[minmax(0,1.08fr)_minmax(26rem,0.92fr)]">
        <section className="sticky top-0 hidden h-dvh overflow-hidden border-r border-border px-8 py-8 text-white [--primary:#ffb65b] lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-[18%] -right-16 left-[8%] -skew-x-12 [background:repeating-linear-gradient(90deg,transparent_0_88px,rgb(255_255_255_/_0.08)_89px,transparent_90px)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-56 -right-48 size-[32rem] rounded-full border border-primary/30 shadow-[0_0_0_36px_color-mix(in_srgb,var(--primary)_7%,transparent),0_0_0_72px_color-mix(in_srgb,var(--primary)_4%,transparent)]"
          />

          <Link
            href="/login"
            aria-label="Jornix — início"
            className="relative z-10 inline-flex w-fit items-center rounded-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <BrandLogo darkSurface className="w-36 xl:w-40" />
          </Link>

          <div className="relative z-10 max-w-xl py-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Seu tempo, com clareza
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-balance xl:text-7xl">
              Comece o dia no ritmo certo.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/85 xl:text-lg">
              Registre seus movimentos, acompanhe sua jornada e mantenha o foco no que
              importa.
            </p>
            <div className="mt-10 flex max-w-sm items-center gap-3 text-xs text-white/85">
              <span>08:00</span>
              <span className="relative h-px flex-1 bg-white/30 before:absolute before:-top-1 before:left-1/4 before:size-2.5 before:rounded-full before:bg-primary after:absolute after:-top-1 after:right-[12%] after:size-2.5 after:rounded-full after:bg-primary" />
              <span>17:00</span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-6 text-xs text-white/85">
            <span>Controle de jornada</span>
            <span>América/São Paulo · BRT</span>
          </div>
        </section>

        <section className="flex min-h-dvh items-start justify-center px-5 py-3 sm:px-8 lg:px-12 lg:pt-[max(0.75rem,calc((100dvh-744px)/2))]">
          <div className="w-full max-w-md">
            <div className="mb-3 flex items-center justify-between">
              <Link
                href="/login"
                aria-label="Jornix — início"
                className="inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
              >
                <BrandLogo className="w-32" />
              </Link>
              <div className="ml-auto rounded-full border border-border bg-card">
                <ThemeToggle />
              </div>
            </div>

            <Card className="gap-0 rounded-[22px] border-border bg-card bg-none p-5 shadow-xl shadow-black/5 sm:p-8 dark:shadow-black/25">
              {tabs}
              {children}
            </Card>

            <p className="mt-3 flex justify-center text-center text-[11px] text-muted-foreground">
              Acesso seguro para sua jornada de trabalho
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
