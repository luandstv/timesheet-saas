"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CircleHelp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { appNavigation } from "./app-navigation";
import { ClearNotificationsButton } from "./clear-notifications-button";

type HeaderNotification = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  createdAt: string;
};

export function HeaderTools({
  pendingCount = 0,
  notifications = [],
}: {
  pendingCount?: number;
  notifications?: HeaderNotification[];
}) {
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

  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const results = appNavigation.filter((item) =>
    normalize(item.title).includes(normalize(query)),
  );
  const notificationCount = pendingCount + notifications.length;
  const formatNotificationDate = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  return (
    <div className="ml-auto flex items-center gap-2 sm:gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={searchTrigger}
            variant="outline"
            className="h-9 rounded-lg px-2 text-muted-foreground sm:w-60 sm:justify-start sm:px-3"
          >
            <Search className="size-4" />
            <span className="sr-only sm:not-sr-only">Buscar páginas...</span>
            <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] md:inline">
              Ctrl K
            </kbd>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 rounded-xl p-2">
          <Input
            autoFocus
            aria-label="Buscar páginas"
            placeholder="Qual página você procura?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-2 grid gap-1">
            {results.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <item.icon className="size-4 text-muted-foreground" />
                {item.title}
              </Link>
            ))}
            {!results.length && (
              <p className="p-3 text-sm text-muted-foreground">
                Nenhuma página encontrada.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              notificationCount > 0
                ? `${notificationCount} notificações`
                : "Notificações"
            }
            className="relative"
          >
            <Bell className="size-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3 rounded-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">Notificações</p>
            <div className="flex items-center gap-2">
              {notificationCount > 0 && <Badge>{notificationCount}</Badge>}
              {notifications.length > 0 && <ClearNotificationsButton />}
            </div>
          </div>
          {pendingCount > 0 ? (
            <>
              <p className="text-sm leading-6 text-muted-foreground">
                Há solicitações de ajuste aguardando sua revisão.
              </p>
              <Link
                href="/adjustments?tab=requests"
                className="inline-flex text-sm font-medium text-accent-foreground underline underline-offset-4"
              >
                Abrir solicitações
              </Link>
            </>
          ) : null}
          {notifications.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto border-t border-border pt-3">
              {notifications.map((notification) => {
                const content = (
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <time
                        dateTime={notification.createdAt}
                        className="shrink-0 text-[11px] text-muted-foreground"
                      >
                        {formatNotificationDate(notification.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                );
                return notification.href ? (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          ) : pendingCount === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Nenhuma solicitação pendente no momento.
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function HelpMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-lg px-3 text-muted-foreground"
        >
          <CircleHelp className="size-5" />
          Ajuda e suporte
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-72 space-y-3 rounded-xl">
        <p className="font-medium">Sua jornada no Jornix</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Registre entradas e saídas em Meu ponto. Consulte os totais em Relatórios e
          ajuste sua jornada em Configurações.
        </p>
        <Link
          href="/settings"
          className="text-sm font-medium underline underline-offset-4"
        >
          Abrir configurações
        </Link>
      </PopoverContent>
    </Popover>
  );
}
