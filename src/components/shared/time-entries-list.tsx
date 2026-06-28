import { DateTime } from "luxon";
import { LogIn, LogOut } from "lucide-react";

import { TIMEZONE } from "@/lib/constants";

interface TimeEntry {
  id: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: Date;
  entryMode: string;
}

interface TimeEntriesListProps {
  entries: TimeEntry[];
}

export function TimeEntriesList({ entries }: TimeEntriesListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum registro hoje.</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const time = DateTime.fromJSDate(entry.timestamp)
          .setZone(TIMEZONE)
          .toFormat("HH:mm:ss");

        const isEntry = entry.type === "CLOCK_IN";

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            {isEntry ? (
              <LogIn className="h-4 w-4 text-green-500" />
            ) : (
              <LogOut className="h4 w-4 text-red-500" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isEntry ? "Entrada" : "Saída"}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.entryMode === "REGULAR" ? "Regular" : entry.entryMode}
              </p>
            </div>
            <span className="text-sm font-mono">{time}</span>
          </div>
        );
      })}
    </div>
  );
}
