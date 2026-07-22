export function formatMinutesToHours(minutes: number) {
  if (!minutes || minutes <= 0) return "0h 00min";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;

  return `${hours}h ${mins.toString().padStart(2, "0")}min`;
}

export function formatMinutesToCompact(minutes: number) {
  if (!minutes || minutes <= 0) return "00:00";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}:${mins.toString().padStart(2, "0")}`;
}
