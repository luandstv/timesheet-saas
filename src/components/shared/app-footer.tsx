import { Clock3 } from "lucide-react";
import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/constants";

export function AppFooter() {
  const year = DateTime.now().setZone(TIMEZONE).year;

  return (
    <footer className="shrink-0 border-t border-border bg-card/30 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-4 text-center text-xs text-muted-foreground md:items-start md:text-left xl:flex-row xl:items-center xl:justify-between">
        <p>
          <span className="font-semibold text-foreground">Jornix</span>
          <span className="ml-2">© {year} · Seu tempo, com clareza.</span>
        </p>
        <p className="flex items-center justify-center gap-2 md:justify-start">
          <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
          Horários em Brasília · América/São Paulo
        </p>
      </div>
    </footer>
  );
}
