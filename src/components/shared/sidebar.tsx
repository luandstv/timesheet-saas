"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Registros de Ponto",
    href: "/time-entries",
    icon: Clock,
  },
  {
    title: "Sobreaviso",
    href: "/on-call",
    icon: Calendar,
  },
  {
    title: "Relatórios",
    href: "/reports",
    icon: Calendar,
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r bg-card py-4 lg:w-64">
      <div className="mb-8 flex items-center gap-2 px-4">
        <Clock className="h-8 w-8 shrink-0 text-primary" />
        <span className="hidden truncate text-lg font-bold lg:block">
          Jornix
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-2 w-full">
        <TooltipProvider>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:block">{item.title}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>
    </aside>
  );
}
