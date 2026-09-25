"use client";
// Organiser's date picker. Tap a first day, tap a last day: everything in between fills in.
// Public holidays are dotted, and long-weekend suggestions go in with one tap.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import {
  autoLabel, dayDiff, fromISO, holidayOn, isWeekend, leaveDays, longWeekends, rangeLabel, toISO,
} from "@/lib/holidays";

export type Win = { label: string; start: string; end: string };
const BANDS = ["#dcebd0", "#e9f7c4", "#d6e8f0", "#f6e3cc", "#e7ddf1", "#f3dada"];
const SWATCH = ["#2d5a44", "#86b33a", "#3a7ca0", "#c07a2c", "#7a5aa6", "#b0443a"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function RangeCalendar({ windows, onChange, max = 6 }: { windows: Win[]; onChange: (w: Win[]) => void; max?: number }) {
  const today = toISO(new Date());
  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const suggestions = useMemo(() => longWeekends(today, 10).slice(0, 10), [today]);

  const monthOffset = (view.y - new Date().getFullYear()) * 12 + view.m - new Date().getMonth();
  const days = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const n = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => toISO(new Date(view.y, view.m, i + 1)))];
  }, [view]);

  const winIndexOf = (d: string) => windows.findIndex((w) => d >= w.start && d <= w.end);
  const same = (a: Win, s: string, e: string) => a.start === s && a.end === e;

  function add(start: string, end: string, label?: string) {
    if (windows.some((w) => same(w, start, end))) return;
    if (windows.length >= max) return;
    onChange([...windows, { start, end, label: label ?? autoLabel(start, end) }].sort((a, b) => a.start.localeCompare(b.start)));
  }

  function tap(d: string) {
    if (d < today) return;
    if (!pending) {
      const i = winIndexOf(d);
      if (i >= 0 && windows[i].start === d && windows[i].end === d) return onChange(windows.filter((_, j) => j !== i));
      setPending(d);
      return;
    }
    if (d < pending) return setPending(d);
    add(pending, d);
    setPending(null);
    setHover(null);
  }

  const toggleSuggestion = (s: { start: string; end: string; label: string }) => {
    const i = windows.findIndex((w) => same(w, s.start, s.end));
    if (i >= 0) onChange(windows.filter((_, j) => j !== i));
    else add(s.start, s.end, s.label);
  };

  const shift = (k: number) => {
    const d = new Date(view.y, view.m + k, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const jumpTo = (iso: string) => { const d = fromISO(iso); setView({ y: d.getFullYear(), m: d.getMonth() }); };

  return (
    <div className="cal">
      <div className="row small" style={{ gap: 6, marginBottom: 8, color: "var(--forest-2)", fontWeight: 700 }}>
        <Sparkles size={15} /> Long weekends coming up, tap to add
      </div>
      <div className="sugg">
        {suggestions.map((s) => {
          const on = windows.some((w) => same(w, s.start, s.end));
          return (
            <button key={s.start + s.end} type="button" className={`sugg-card ${on ? "on" : ""}`}
              onClick={() => { toggleSuggestion(s); jumpTo(s.start); }}>
              <div className="t">{s.holiday}</div>
              <div className="d">{rangeLabel(s.start, s.end)} · {s.nights} night{s.nights === 1 ? "" : "s"}</div>
              <span className={`leave ${s.leave ? "some" : "zero"}`}>{s.leave ? `${s.leave} leave day${s.leave > 1 ? "s" : ""}` : "No leave needed"}</span>
            </button>
          );
        })}
      </div>

      <div className="card flat" style={{ padding: 12, margin: "8px 0 0" }}>
        <div className="cal-head">
          <button type="button" className="iconbtn" onClick={() => shift(-1)} disabled={monthOffset <= 0} aria-label="Previous month" style={{ opacity: monthOffset <= 0 ? 0.3 : 1 }}>
            <ChevronLeft size={18} />
          </button>
          <b>{MONTHS[view.m]} {view.y}</b>
          <button type="button" className="iconbtn" onClick={() => shift(1)} disabled={monthOffset >= 14} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="cal-grid">
          {DOW.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
          {days.map((d, i) => {
            if (!d) return <div key={"e" + i} />;
            const wi = winIndexOf(d);
            const w = wi >= 0 ? windows[wi] : null;
            const hol = holidayOn(d);
            const inHover = pending && hover && d > pending && d <= hover;
            const cls = [
              "cal-day",
              d < today && "past",
              isWeekend(d) && "we",
              hol && "hol",
              w && "inr",
              w && d === w.start && "rs",
              w && d === w.end && "re",
              pending === d && "pending",
              inHover && "hover-in",
            ].filter(Boolean).join(" ");
            return (
              <button type="button" key={d} className={cls} style={w ? ({ ["--band" as string]: BANDS[wi % BANDS.length] } as React.CSSProperties) : undefined}
                onClick={() => tap(d)} onMouseEnter={() => pending && setHover(d)} title={hol ?? undefined} aria-label={`${d}${hol ? " " + hol : ""}`}>
                <span className="n">{fromISO(d).getDate()}</span>
              </button>
            );
          })}
        </div>
        <div className="cal-legend">
          <span><i style={{ background: "var(--holiday)" }} />Public holiday</span>
          <span><i style={{ background: "var(--forest-2)" }} />Weekend</span>
          {pending && <span style={{ color: "var(--forest)", fontWeight: 700 }}>Now tap the last day{pending ? ` (from ${rangeLabel(pending, pending)})` : ""}</span>}
        </div>
      </div>

      {windows.length > 0 && (
        <div className="win-list">
          {windows.map((w, i) => {
            const leave = leaveDays(w.start, w.end);
            const nights = dayDiff(w.start, w.end);
            return (
              <div className="win-row" key={w.start + w.end}>
                <span className="sw" style={{ background: SWATCH[i % SWATCH.length] }} />
                <div className="grow">
                  <input type="text" value={w.label} aria-label="Name for these dates" maxLength={40}
                    onChange={(e) => onChange(windows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <div className="tiny muted">
                    {rangeLabel(w.start, w.end)} · {nights ? `${nights} night${nights > 1 ? "s" : ""}` : "day trip"} ·{" "}
                    <b style={{ color: leave ? "var(--stretch)" : "var(--works)" }}>{leave ? `${leave} leave day${leave > 1 ? "s" : ""}` : "no leave"}</b>
                  </div>
                </div>
                <button type="button" className="iconbtn" aria-label="Remove dates" onClick={() => onChange(windows.filter((_, j) => j !== i))}>
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 8 }}>
        {windows.length}/{max} date options · Festival dates can shift by a day in some states. Check your office calendar.
      </p>
    </div>
  );
}
