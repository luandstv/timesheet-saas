"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CircleHelp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { appNavigation } from "./app-navigation";

export function HeaderTools() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchTrigger.current?.click();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const results = appNavigation.filter((item) => normalize(item.title).includes(normalize(query)));

  return (
    <div className="ml-auto flex items-center gap-2 sm:gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button ref={searchTrigger} variant="outline" className="h-9 rounded-lg px-2 text-muted-foreground sm:w-60 sm:justify-start sm:px-3">
            <Search className="size-4" />
            <span className="sr-only sm:not-sr-only">Buscar páginas...</span>
            <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] md:inline">Ctrl K</kbd>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 rounded-xl p-2">
          <Input autoFocus aria-label="Buscar páginas" placeholder="Qual página você procura?" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="mt-2 grid gap-1">
            {results.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                <item.icon className="size-4 text-muted-foreground" />{item.title}
              </Link>
            ))}
            {!results.length && <p className="p-3 text-sm text-muted-foreground">Nenhuma página encontrada.</p>}
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notificações"><Bell className="size-5" /></Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3 rounded-xl">
          <p className="font-medium">Notificações</p>
          <Badge variant="outline">Em breve · TODO</Badge>
          {/* TODO(JORNIX-UI-02): conectar notificações reais; não simular mensagens não lidas. */}
          <p className="text-sm leading-6 text-muted-foreground">Os avisos da sua jornada aparecerão aqui quando este recurso estiver disponível.</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function HelpMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 rounded-lg px-3 text-muted-foreground"><CircleHelp className="size-5" />Ajuda e suporte</Button>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-72 space-y-3 rounded-xl">
        <p className="font-medium">Sua jornada no Jornix</p>
        <p className="text-sm leading-6 text-muted-foreground">Registre entradas e saídas em Meu ponto. Consulte os totais em Relatórios e ajuste sua jornada em Configurações.</p>
        <Link href="/settings" className="text-sm font-medium underline underline-offset-4">Abrir configurações</Link>
      </PopoverContent>
    </Popover>
  );
}
