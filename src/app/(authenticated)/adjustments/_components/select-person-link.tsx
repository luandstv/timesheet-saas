"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NavigationIcon } from "@/components/shared/navigation-icon";

type PersonOption = {
  userId: string;
  name: string;
  email: string;
};

export function SelectPersonLink({
  href,
  people,
  currentUserId,
  startDate,
  endDate,
}: {
  href: string;
  people: PersonOption[];
  currentUserId: string;
  startDate: string;
  endDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredPeople = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return people;
    return people.filter(
      (person) =>
        person.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
        person.email.toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [people, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-expanded={open}>
          <UsersRound aria-hidden="true" className="size-4" />
          Selecionar pessoa
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(22rem,calc(100vw-2rem))] gap-3 p-3"
      >
        <PopoverHeader>
          <PopoverTitle>Selecionar pessoa</PopoverTitle>
          <PopoverDescription>
            Abra os registros de um colaborador neste mesmo período.
          </PopoverDescription>
        </PopoverHeader>
        <label className="relative block">
          <span className="sr-only">Buscar por nome ou email</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou email"
            className="h-10 pl-9"
          />
        </label>
        <div className="max-h-64 space-y-1 overflow-y-auto" role="listbox">
          {filteredPeople.map((person) => {
            const selected = person.userId === currentUserId;
            const personHref = `/adjustments?${new URLSearchParams({
              userId: person.userId,
              startDate,
              endDate,
              tab: "movements",
            }).toString()}`;
            return (
              <Link
                key={person.userId}
                href={personHref}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                role="option"
                aria-selected={selected}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{person.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {person.email}
                  </span>
                </span>
                {selected && <Badge variant="outline">Você</Badge>}
              </Link>
            );
          })}
          {filteredPeople.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhuma pessoa encontrada.
            </p>
          )}
        </div>
        <Link
          href={href}
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 border-t border-border pt-3 text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
        >
          <NavigationIcon
            icon={UsersRound}
            label="lista completa de colaboradores"
            className="size-4"
          />
          Ver lista completa e filtros
        </Link>
      </PopoverContent>
    </Popover>
  );
}
