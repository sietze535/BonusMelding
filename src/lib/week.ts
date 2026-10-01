/** Bonus weeks run roughly Mon–Sun; key = ISO date of the Monday (Europe/Amsterdam). */

export function getBonusWeekKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);

  // Construct as UTC noon to avoid DST edge issues when shifting weekdays
  const local = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = local.getUTCDay(); // 0 Sun … 6 Sat
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  local.setUTCDate(local.getUTCDate() - daysFromMonday);

  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
