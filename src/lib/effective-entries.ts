export type Movement = {
  id: string;
  timeSheetId: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: Date;
  entryMode: "REGULAR" | "ON_CALL" | "EMERGENCY";
  provisional?: boolean;
};
export type Adjustment = {
  id: string;
  timeSheetId: string;
  targetEventId: string | null;
  type: "INSERTION" | "MODIFICATION" | "DELETION";
  entryType: Movement["type"];
  newTimestamp: Date | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  provisional: boolean;
  sequence: number;
};

/** Never mutates raw punches; shared by calculation, clock and history. */
export function effectiveEntries(raw: Movement[], requests: Adjustment[]): Movement[] {
  const events = new Map(raw.map((entry) => [entry.id, { ...entry }]));
  for (const request of [...requests].sort((a, b) => a.sequence - b.sequence)) {
    if (
      request.status !== "APPROVED" &&
      !(request.status === "PENDING" && request.provisional)
    )
      continue;
    const provisional = request.status === "PENDING";
    if (request.type === "INSERTION" && request.newTimestamp) {
      events.set(request.id, {
        id: request.id,
        timeSheetId: request.timeSheetId,
        type: request.entryType,
        timestamp: request.newTimestamp,
        entryMode: "REGULAR",
        provisional,
      });
    } else if (request.targetEventId && request.type === "DELETION") {
      events.delete(request.targetEventId);
    } else if (request.targetEventId && request.newTimestamp) {
      const event = events.get(request.targetEventId);
      if (event)
        events.set(event.id, {
          ...event,
          timestamp: request.newTimestamp,
          provisional,
        });
    }
  }
  return [...events.values()].sort(
    (a, b) => +a.timestamp - +b.timestamp || a.id.localeCompare(b.id),
  );
}

/** Validates the person's whole effective sequence, including other workspaces. */
export function validateMovements(events: Movement[], now = new Date()) {
  let open: Movement | undefined;
  let previousTime = -Infinity;
  for (const entry of events) {
    const time = +entry.timestamp;
    if (!Number.isFinite(time) || time > +now)
      throw new Error("O horário deve ser válido e não pode estar no futuro.");
    if (time <= previousTime)
      throw new Error("Os movimentos devem ter horários distintos e em ordem.");
    previousTime = time;
    if (entry.type === "CLOCK_IN") {
      if (open) throw new Error("Já existe uma entrada sem saída nesse intervalo.");
      open = entry;
    } else {
      if (!open || open.timeSheetId !== entry.timeSheetId)
        throw new Error("A saída precisa de uma entrada anterior na mesma jornada.");
      open = undefined;
    }
  }
}
