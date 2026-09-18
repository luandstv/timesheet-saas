"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, CircleDot, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CollaboratorDirectory,
  CollaboratorDirectoryItem,
} from "../_lib/load-collaborators";

type CollaboratorsPanelProps = {
  directory: CollaboratorDirectory;
  currentUserId: string;
  startDate: string;
  endDate: string;
  initialSearch: string;
  initialStatus: "active" | "inactive" | "all";
  initialSort: "priority" | "name" | "recent" | "open";
  canViewInactive: boolean;
};

type DirectoryStatus = CollaboratorsPanelProps["initialStatus"];
type DirectorySort = CollaboratorsPanelProps["initialSort"];

const roleLabel = {
  OWNER: "Responsável",
  MANAGER: "Gestor",
  COLLABORATOR: "Colaborador",
} as const;

const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Sem atividade registrada";

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "pt-BR", { sensitivity: "base" });

const compareRecent = (
  left: CollaboratorDirectoryItem,
  right: CollaboratorDirectoryItem,
) =>
  (right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0) -
  (left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0);

function sortCollaborators(items: CollaboratorDirectoryItem[], sort: DirectorySort) {
  return [...items].sort((left, right) => {
    if (sort === "name") return compareText(left.name, right.name);
    if (sort === "recent") {
      return compareRecent(left, right) || compareText(left.name, right.name);
    }
    if (sort === "open") {
      return (
        Number(right.hasOpenPoint) - Number(left.hasOpenPoint) ||
        compareText(left.name, right.name)
      );
    }
    return (
      right.pendingCount - left.pendingCount ||
      Number(right.hasOpenPoint) - Number(left.hasOpenPoint) ||
      compareText(left.name, right.name)
    );
  });
}

export function CollaboratorsPanel({
  directory,
  currentUserId,
  startDate,
  endDate,
  initialSearch,
  initialStatus,
  initialSort,
  canViewInactive,
}: CollaboratorsPanelProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<DirectoryStatus>(initialStatus);
  const [sort, setSort] = useState<DirectorySort>(initialSort);
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const updateUrl = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    next.set("tab", "collaborators");
    next.set("startDate", startDate);
    next.set("endDate", endDate);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("memberPage");
    window.history.replaceState(null, "", `${pathname}?${next.toString()}`);
  };

  const filteredItems = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const matchingItems = directory.items.filter((person) => {
      const matchesStatus =
        status === "all" ||
        (status === "active" && person.active) ||
        (status === "inactive" && !person.active);
      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;
      return (
        person.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
        person.email.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
      );
    });
    return sortCollaborators(matchingItems, sort);
  }, [deferredSearch, directory.items, sort, status]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / directory.pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice(
    (safePage - 1) * directory.pageSize,
    safePage * directory.pageSize,
  );
  const searchPending = search !== deferredSearch;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    updateUrl({ memberSearch: value.trim() || null });
  };

  const handleStatusChange = (value: string) => {
    const nextStatus = value as DirectoryStatus;
    setStatus(nextStatus);
    setPage(1);
    updateUrl({ memberStatus: nextStatus });
  };

  const handleSortChange = (value: string) => {
    const nextSort = value as DirectorySort;
    setSort(nextSort);
    setPage(1);
    updateUrl({ memberSort: nextSort });
  };

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Colaboradores</CardTitle>
            <CardDescription>
              Encontre uma pessoa do espaço e abra os registros dela no mesmo período.
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <UserRound aria-hidden="true" />
            {filteredItems.length} {filteredItems.length === 1 ? "pessoa" : "pessoas"}
          </Badge>
        </div>
        <div
          className={`grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem] ${canViewInactive ? "lg:grid-cols-[minmax(0,1fr)_10rem_11rem]" : ""}`}
        >
          <label className="relative block">
            <span className="sr-only">Buscar por nome ou email</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Buscar por nome ou email"
              className="pl-9"
              aria-controls="collaborators-results"
            />
          </label>
          {canViewInactive ? (
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger aria-label="Filtrar status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-11 items-center rounded-[11px] border border-border bg-input/50 px-3.5 text-sm text-muted-foreground">
              Apenas vínculos ativos
            </div>
          )}
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger aria-label="Ordenar colaboradores">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Pendências primeiro</SelectItem>
              <SelectItem value="open">Ponto aberto primeiro</SelectItem>
              <SelectItem value="name">Nome A-Z</SelectItem>
              <SelectItem value="recent">Atividade recente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent
        id="collaborators-results"
        className="space-y-3"
        aria-busy={searchPending}
      >
        {pageItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="font-medium">Nenhuma pessoa encontrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste a busca ou os filtros para consultar outro vínculo.
            </p>
          </div>
        ) : (
          pageItems.map((person) => {
            const selected = person.userId === currentUserId;
            const href = `/adjustments?${new URLSearchParams({
              userId: person.userId,
              startDate,
              endDate,
              tab: "movements",
            }).toString()}`;
            return (
              <div
                key={person.memberId}
                className={`rounded-2xl border p-4 transition-colors ${selected ? "border-primary/60 bg-primary/5" : "bg-muted/20 hover:bg-muted/40"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{person.name}</p>
                      {selected && <Badge>Você está aqui</Badge>}
                      {!person.active && <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {person.email}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span>{roleLabel[person.role]}</span>
                      <span>Última atividade: {dateTime(person.lastActivityAt)}</span>
                    </div>
                  </div>
                  <div className="flex min-w-40 flex-col items-start gap-2 text-xs sm:items-end">
                    {person.pendingCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-primary/50 text-accent-foreground"
                      >
                        {person.pendingCount}{" "}
                        {person.pendingCount === 1 ? "pendência" : "pendências"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Sem pendências</span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <CircleDot
                        className={
                          person.hasOpenPoint
                            ? "size-3.5 text-primary"
                            : "size-3.5 text-muted-foreground/50"
                        }
                      />
                      {person.hasOpenPoint ? "Ponto aberto" : "Sem ponto aberto"}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={href}>
                        Abrir registros
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4 text-sm">
            <span className="text-muted-foreground">
              Página {safePage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => {
                  const nextPage = safePage - 1;
                  setPage(nextPage);
                }}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => {
                  const nextPage = safePage + 1;
                  setPage(nextPage);
                }}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
