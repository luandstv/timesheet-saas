"use client";

import Link from "next/link";
import { ArrowRight, Search, UserRound } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMinutesToCompact } from "@/lib/format";
import type { TeamReportRow } from "@/services/report.service";

const PAGE_SIZE = 20;

type TeamReportTableProps = {
  rows: TeamReportRow[];
  startDate: string;
  endDate: string;
};

export function TeamReportTable({ rows, startDate, endDate }: TeamReportTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("pt-BR");

  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rows;

    return rows.filter(
      (row) =>
        row.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
        row.email.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
    );
  }, [normalizedSearch, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const searchPending = search !== deferredSearch;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">Resumo por pessoa</h2>
        <p className="text-sm text-muted-foreground">
          Busque por nome ou e-mail e abra a folha detalhada de qualquer colaborador.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b border-border/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Colaboradores no período</CardTitle>
            <Badge variant="outline" className="gap-1.5">
              <UserRound aria-hidden="true" />
              {filteredRows.length} {filteredRows.length === 1 ? "pessoa" : "pessoas"}
            </Badge>
          </div>
          <label className="relative block max-w-xl">
            <span className="sr-only">Buscar colaborador por nome ou e-mail</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="pl-9"
              aria-controls="team-report-results"
            />
          </label>
        </CardHeader>

        <CardContent id="team-report-results" className="p-0" aria-busy={searchPending}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] caption-bottom text-sm">
              <thead className="bg-muted/40 [&_tr]:border-b">
                <tr className="border-b">
                  <Header label="Pessoa" />
                  <Header label="Dias" />
                  <Header label="Total trabalhado" />
                  <Header label="Horas normais" />
                  <Header label="Extras 75%" />
                  <Header label="Extras 100%" />
                  <Header label="Acionamentos" />
                  <Header label="Conferência" />
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {pageRows.length ? (
                  pageRows.map((row) => {
                    const detailHref = `/reports/team/${encodeURIComponent(row.userId)}?startDate=${startDate}&endDate=${endDate}`;

                    return (
                      <tr
                        key={row.userId}
                        className="border-b transition-colors hover:bg-muted/25"
                      >
                        <td className="p-4 align-middle">
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </td>
                        <td className="p-4 align-middle tabular-nums">
                          {row.daysWithRecords}
                        </td>
                        <td className="p-4 align-middle tabular-nums">
                          {formatMinutesToCompact(row.totalWorkedMinutes)}
                        </td>
                        <td className="p-4 align-middle tabular-nums">
                          {formatMinutesToCompact(row.normalMinutes)}
                        </td>
                        <td className="p-4 align-middle tabular-nums">
                          {formatMinutesToCompact(row.overtime75Minutes)}
                        </td>
                        <td className="p-4 align-middle tabular-nums">
                          {formatMinutesToCompact(row.overtime100Minutes)}
                        </td>
                        <td
                          className="p-4 align-middle tabular-nums"
                          title={`${row.activityCount} registro(s)`}
                        >
                          {formatMinutesToCompact(row.activityMinutes)}
                        </td>
                        <td className="p-4 align-middle">
                          <Button asChild variant="outline" size="sm">
                            <Link href={detailHref}>
                              Abrir folha
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                      Nenhum colaborador encontrado para essa busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm sm:px-6">
              <span className="text-muted-foreground">
                Página {safePage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Header({ label }: { label: string }) {
  return (
    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
      {label}
    </th>
  );
}
