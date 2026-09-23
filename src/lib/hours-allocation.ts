export function splitContractedMinutes(totalMinutes: number, memberCount: number) {
  if (memberCount === 0) return [];

  const wholeHours = Math.floor(totalMinutes / 60);
  const baseHours = Math.floor(wholeHours / memberCount);
  const extraHours = wholeHours % memberCount;
  const remainingMinutes = totalMinutes % 60;

  return Array.from({ length: memberCount }, (_, index) => {
    const hours = baseHours + (index < extraHours ? 1 : 0);
    return hours * 60 + (index === memberCount - 1 ? remainingMinutes : 0);
  });
}

export function formatHoursInput(minutes: number) {
  return String(Number((minutes / 60).toFixed(2)));
}

export function parseHoursInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const minutes = Math.round(Number(normalized) * 60);
  return Number.isSafeInteger(minutes) ? minutes : null;
}
