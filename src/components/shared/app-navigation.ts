import { CalendarDays, ChartNoAxesCombined, Clock3, LayoutDashboard, Settings2 } from "lucide-react";

export const appNavigation = [
  { title: "Dashboard", shortTitle: "Início", href: "/dashboard", icon: LayoutDashboard },
  { title: "Registros de Ponto", shortTitle: "Ponto", href: "/time-entries", icon: Clock3 },
  { title: "Sobreaviso", shortTitle: "Sobreaviso", href: "/on-call", icon: CalendarDays },
  { title: "Relatórios", shortTitle: "Relatórios", href: "/reports", icon: ChartNoAxesCombined },
  { title: "Configurações", shortTitle: "Ajustes", href: "/settings", icon: Settings2 },
];
