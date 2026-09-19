import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  Clock3,
  Coins,
  LayoutDashboard,
  Settings2,
  UsersRound,
} from "lucide-react";

export const appNavigation = [
  {
    title: "Dashboard",
    shortTitle: "Início",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Registros de Ponto",
    shortTitle: "Ponto",
    href: "/time-entries",
    icon: Clock3,
  },
  {
    title: "Sobreaviso",
    shortTitle: "Sobreaviso",
    href: "/on-call",
    icon: CalendarDays,
  },
  {
    title: "Relatórios",
    shortTitle: "Relatórios",
    href: "/reports",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Minha remuneração",
    shortTitle: "Valores",
    href: "/compensation",
    icon: Coins,
  },
  {
    title: "Ajustes e fechamento",
    shortTitle: "Ajustes",
    href: "/adjustments",
    icon: ClipboardCheck,
  },
  {
    title: "Espaços e equipe",
    shortTitle: "Equipe",
    href: "/workspaces",
    icon: UsersRound,
  },
  { title: "Configurações", shortTitle: "Config.", href: "/settings", icon: Settings2 },
];
