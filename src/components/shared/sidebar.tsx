"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserNav } from "./user-nav";
import { BrandLogo, BrandMark } from "./brand-mark";
import { HelpMenu } from "./header-tools";
import { appNavigation } from "./app-navigation";
import { NavigationIcon } from "./navigation-icon";

export function Sidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh min-h-0 shrink-0 self-start flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
          collapsed ? "w-[76px] px-3" : "w-[76px] px-3 lg:w-[252px] lg:px-4",
        )}
      >
        <div className="relative flex h-20 shrink-0 items-center justify-center gap-2">
          <Link
            href="/dashboard"
            aria-label="Jornix — início"
            className="flex items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-ring"
          >
            {collapsed ? (
              <BrandMark className="h-9 w-9" />
            ) : (
              <>
                <BrandMark className="h-9 w-9 lg:hidden" />
                <BrandLogo className="hidden h-10 w-32 lg:block" />
              </>
            )}
          </Link>
          <Button
            size="icon-sm"
            variant="outline"
            className={cn(
              "hidden shrink-0 rounded-lg lg:inline-flex",
              collapsed
                ? "absolute -right-4 top-6 z-10 bg-sidebar"
                : "absolute right-0",
            )}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </div>
        <nav
          aria-label="Navegação principal"
          className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain"
        >
          {appNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 items-center gap-4 rounded-lg border border-transparent px-3 text-sm transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring",
                pathname === item.href &&
                  "border-primary/10 bg-sidebar-accent text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-primary",
              )}
            >
              <NavigationIcon
                icon={item.icon}
                label={item.title}
                className={cn(
                  "size-5 shrink-0",
                  pathname === item.href
                    ? "text-sidebar-primary"
                    : "text-muted-foreground",
                )}
              />
              <span className={cn(collapsed ? "sr-only" : "sr-only lg:not-sr-only")}>
                {item.title}
              </span>
            </Link>
          ))}
        </nav>
        <div className="shrink-0 pt-4 pb-5">
          {!collapsed && (
            <div className="mb-4 hidden lg:block">
              <HelpMenu />
            </div>
          )}
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <UserNav name={name} email={email} />
            {!collapsed && (
              <Link
                href="/settings"
                className="hidden min-w-0 rounded text-sm focus-visible:outline-2 focus-visible:outline-ring lg:block"
              >
                <span className="block truncate font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">Minha conta</span>
              </Link>
            )}
          </div>
        </div>
      </aside>
      <nav
        aria-label="Navegação mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-border bg-sidebar px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {appNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={cn(
              "flex min-h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring",
              pathname === item.href && "bg-accent text-accent-foreground",
            )}
          >
            <NavigationIcon
              icon={item.icon}
              label={item.title}
              className="size-5 shrink-0"
            />
            {item.shortTitle}
          </Link>
        ))}
      </nav>
    </>
  );
}
