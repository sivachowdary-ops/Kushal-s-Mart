// Date ranges for the admin filters. All dates are the browser's local time (IST for the shop).

export type DatePreset = "all" | "today" | "yesterday" | "week" | "month" | "year" | "custom";

export interface DateFilter {
  preset: DatePreset;
  /** YYYY-MM-DD, used when preset is "custom" */
  from: string;
  to: string;
}

export const ALL_DATES: DateFilter = { preset: "all", from: "", to: "" };

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "All time",
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  month: "This month",
  year: "This year",
  custom: "Custom",
};

/** YYYY-MM-DD in local time, the format of <input type="date"> */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(key: string): Date | null {
  const [y, m, d] = key.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Start (inclusive) and end (exclusive) of the filter, or null for no date limit. */
export function resolveDateRange(filter: DateFilter, now = new Date()): { start: Date; end: Date } | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);

  switch (filter.preset) {
    case "today":
      return { start: today, end: tomorrow };
    case "yesterday":
      return { start: addDays(today, -1), end: today };
    case "week": {
      // Weeks start on Monday
      const sinceMonday = (today.getDay() + 6) % 7;
      return { start: addDays(today, -sinceMonday), end: tomorrow };
    }
    case "month":
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: tomorrow };
    case "year":
      return { start: new Date(today.getFullYear(), 0, 1), end: tomorrow };
    case "custom": {
      let from = fromDateKey(filter.from);
      let to = fromDateKey(filter.to);
      if (!from && !to) return null;
      // Only one end picked: that single day
      from ??= to!;
      to ??= from;
      if (from > to) [from, to] = [to, from];
      return { start: from, end: addDays(to, 1) };
    }
    default:
      return null;
  }
}

export function isInDateRange(iso: string, range: { start: Date; end: Date } | null): boolean {
  if (!range) return true;
  const date = new Date(iso);
  return date >= range.start && date < range.end;
}

/** "12 Nov 2026" or "12 Nov – 15 Nov 2026", for showing the chosen range */
export function describeDateRange(range: { start: Date; end: Date } | null): string {
  if (!range) return "All dates";
  const last = addDays(range.end, -1);
  const day = (d: Date, withYear: boolean) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
  if (toDateKey(range.start) === toDateKey(last)) return day(last, true);
  return `${day(range.start, range.start.getFullYear() !== last.getFullYear())} – ${day(last, true)}`;
}
