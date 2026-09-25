// Indian public holidays + long-weekend suggestions. Shared by server and browser.
// Festival dates follow the lunar calendar and can shift by a day in some states,
// so the UI always says "check your office calendar".

export type Holiday = { date: string; name: string };

export const HOLIDAYS: Holiday[] = [
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-10-20", name: "Dussehra" },
  { date: "2026-11-08", name: "Diwali" },
  { date: "2026-11-24", name: "Guru Nanak Jayanti" },
  { date: "2026-12-25", name: "Christmas" },
  { date: "2027-01-01", name: "New Year" },
  { date: "2027-01-14", name: "Makar Sankranti / Pongal" },
  { date: "2027-01-26", name: "Republic Day" },
  { date: "2027-03-22", name: "Holi" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-04-14", name: "Ambedkar Jayanti" },
  { date: "2027-08-15", name: "Independence Day" },
  { date: "2027-10-02", name: "Gandhi Jayanti" },
  { date: "2027-10-29", name: "Diwali" },
  { date: "2027-12-25", name: "Christmas" },
];

const HOL = new Map(HOLIDAYS.map((h) => [h.date, h.name]));

// ---- date helpers (all dates are "YYYY-MM-DD", treated as local calendar days) ----
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const dayDiff = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
export const holidayOn = (s: string) => HOL.get(s) ?? null;
export const isWeekend = (s: string) => [0, 6].includes(fromISO(s).getDay());

export function daysIn(start: string, end: string) {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Weekdays inside the range that are not public holidays = leave days needed. */
export function leaveDays(start: string, end: string) {
  return daysIn(start, end).filter((d) => !isWeekend(d) && !holidayOn(d)).length;
}

export function holidaysIn(start: string, end: string) {
  return daysIn(start, end).map(holidayOn).filter(Boolean) as string[];
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function rangeLabel(start: string, end: string) {
  const a = fromISO(start);
  const b = fromISO(end);
  if (start === end) return `${a.getDate()} ${MON[a.getMonth()]}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MON[a.getMonth()]}`;
  return `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`;
}

/** Smart default label for a window the organiser picks on the calendar. */
export function autoLabel(start: string, end: string) {
  const h = holidaysIn(start, end);
  if (h.length) return `${h[0]} break`;
  const days = dayDiff(start, end) + 1;
  if (days <= 3 && daysIn(start, end).every((d) => isWeekend(d) || fromISO(d).getDay() === 5 || fromISO(d).getDay() === 1))
    return "Weekend";
  return days >= 6 ? "Week away" : `${days}-day trip`;
}

export type Suggestion = { start: string; end: string; label: string; holiday: string; leave: number; nights: number };

/** Long weekends from today onwards, built around each public holiday. */
export function longWeekends(fromDate: string, months = 12): Suggestion[] {
  const until = addDays(fromDate, months * 30);
  const out: Suggestion[] = [];
  for (const h of HOLIDAYS) {
    if (h.date < fromDate || h.date > until) continue;
    const dow = fromISO(h.date).getDay(); // 0 Sun .. 6 Sat
    let start = h.date;
    let end = h.date;
    if (dow === 5) end = addDays(h.date, 2); // Fri-Sun
    else if (dow === 1) start = addDays(h.date, -2); // Sat-Mon
    else if (dow === 4) end = addDays(h.date, 3); // Thu-Sun (take Fri)
    else if (dow === 2) start = addDays(h.date, -3); // Sat-Tue (take Mon)
    else if (dow === 3) end = addDays(h.date, 4); // Wed-Sun (take Thu, Fri)
    else if (dow === 6) start = addDays(h.date, -1); // Fri-Sun (take Fri)
    else if (dow === 0) end = addDays(h.date, 1); // Sat? no: Sun-Mon -> Sat-Mon
    if (dow === 0) start = addDays(h.date, -1);
    if (start < fromDate) continue;
    out.push({
      start,
      end,
      label: `${h.name} weekend`,
      holiday: h.name,
      leave: leaveDays(start, end),
      nights: dayDiff(start, end),
    });
  }
  // Year-end: Christmas to New Year is the classic group-trip week.
  for (const y of [2026, 2027]) {
    const s = `${y}-12-25`;
    const e = `${y + 1}-01-01`;
    if (s >= fromDate && s <= until)
      out.push({ start: s, end: e, label: "Year-end break", holiday: "Christmas → New Year", leave: leaveDays(s, e), nights: dayDiff(s, e) });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
