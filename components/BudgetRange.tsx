"use client";
// Two-handle budget slider: what you're comfortable spending, and your absolute max.
// The scale is finer at the low end (₹1k steps) and coarser at the top (₹10k steps).
import { inrK } from "./ui";

const STOPS: number[] = [];
for (let v = 3000; v < 20000; v += 1000) STOPS.push(v);
for (let v = 20000; v < 50000; v += 2500) STOPS.push(v);
for (let v = 50000; v < 100000; v += 5000) STOPS.push(v);
for (let v = 100000; v <= 200000; v += 10000) STOPS.push(v);

const toIdx = (v: number) => {
  let best = 0;
  for (let i = 0; i < STOPS.length; i++) if (Math.abs(STOPS[i] - v) < Math.abs(STOPS[best] - v)) best = i;
  return best;
};

export default function BudgetRange({ low, high, onChange }: { low: number; high: number; onChange: (low: number, high: number) => void }) {
  const lo = toIdx(Math.min(low, high));
  const hi = toIdx(high);
  const pct = (i: number) => (i / (STOPS.length - 1)) * 100;

  return (
    <div className="brange">
      <div className="brange-track">
        <div className="brange-fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input type="range" min={0} max={STOPS.length - 1} value={lo} aria-label="Comfortable budget"
          onChange={(e) => { const i = Math.min(Number(e.target.value), hi); onChange(STOPS[i], STOPS[hi]); }} />
        <input type="range" min={0} max={STOPS.length - 1} value={hi} aria-label="Absolute max budget"
          onChange={(e) => { const i = Math.max(Number(e.target.value), lo); onChange(STOPS[lo], STOPS[i]); }} />
      </div>
      <div className="between" style={{ marginTop: 10, alignItems: "flex-end" }}>
        <div><div className="tiny muted">Comfortable</div><div className="budget-big">{inrK(STOPS[lo])}</div></div>
        <div style={{ textAlign: "right" }}><div className="tiny muted">Absolute max</div><div className="budget-big">{inrK(STOPS[hi])}{STOPS[hi] >= 200000 ? "+" : ""}</div></div>
      </div>
    </div>
  );
}
