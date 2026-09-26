"use client";
// INPUT: private answers in 3 short steps. About 10 taps, no typing. Autosaves on this device.
import { useEffect, useMemo, useState } from "react";
import {
  Check, X, CircleHelp, ArrowLeft, ArrowRight, Lock, Loader2, TreePalm, Mountain, Building2, Landmark, Trees, Tent,
  Coffee, Music, UtensilsCrossed, Bus, Clock, Plane, Footprints, Snowflake, PartyPopper, BedDouble, Car, Sparkles,
} from "lucide-react";
import CityPicker, { type CityValue } from "./CityPicker";
import { dayDiff, holidaysIn, leaveDays, rangeLabel } from "@/lib/holidays";
import { inr, safeGet, safeSet } from "./ui";

type W = { id: string; label: string; start: string; end: string };
type Initial = null | {
  origin_city: string; origin_lat: number | null; origin_lon: number | null; budget_max: number;
  available_windows: string[]; maybe_windows: string[]; trip_nights: number; destination_types: string[]; wont_do: string[]; notes: string;
};
type Avail = "yes" | "maybe" | "no";

export const VIBES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "beach", label: "Beach", icon: <TreePalm size={24} /> },
  { key: "mountains", label: "Mountains", icon: <Mountain size={24} /> },
  { key: "nature", label: "Nature", icon: <Trees size={24} /> },
  { key: "heritage", label: "Heritage", icon: <Landmark size={24} /> },
  { key: "city", label: "City", icon: <Building2 size={24} /> },
  { key: "adventure", label: "Adventure", icon: <Tent size={24} /> },
  { key: "chill", label: "Chill", icon: <Coffee size={24} /> },
  { key: "nightlife", label: "Nightlife", icon: <Music size={24} /> },
  { key: "food", label: "Food", icon: <UtensilsCrossed size={24} /> },
];
const WONTS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "overnight bus", label: "Overnight bus", icon: <Bus size={15} /> },
  { key: "more than 8h one-way travel", label: "8h+ travel", icon: <Clock size={15} /> },
  { key: "flights", label: "Flights", icon: <Plane size={15} /> },
  { key: "trekking / hikes", label: "Treks", icon: <Footprints size={15} /> },
  { key: "cold weather", label: "Cold weather", icon: <Snowflake size={15} /> },
  { key: "crowded party spots", label: "Party crowds", icon: <PartyPopper size={15} /> },
  { key: "hostels / shared dorms", label: "Hostels / dorms", icon: <BedDouble size={15} /> },
  { key: "long road trips", label: "Long road trips", icon: <Car size={15} /> },
];
const BUDGETS = [8000, 12000, 15000, 20000, 30000, 50000];
const STEPS = ["When", "Where & budget", "Vibe"];

export default function PrefWizard(props: {
  tripId: string; member: string; windows: W[]; initial: Initial; busy: boolean; isOrganiser: boolean;
  onSubmit: (b: object) => void; onSwitch: () => void;
}) {
  const i = props.initial;
  const draftKey = `draft:${props.tripId}:${props.member}`;
  const draft = useMemo(() => { try { return JSON.parse(safeGet(draftKey) || "null"); } catch { return null; } }, [draftKey]);
  const initAvail: Record<string, Avail> = draft?.avail ?? (i
    ? Object.fromEntries(props.windows.map((w) => [w.id, i.available_windows.includes(w.id) ? "yes" : i.maybe_windows?.includes(w.id) ? "maybe" : "no"]))
    : props.isOrganiser ? Object.fromEntries(props.windows.map((w) => [w.id, "yes"])) : {});

  const [step, setStep] = useState<number>(draft?.step ?? 0);
  const [avail, setAvail] = useState<Record<string, Avail>>(initAvail);
  const [city, setCity] = useState<CityValue | null>(draft?.city ?? (i ? { name: i.origin_city, lat: i.origin_lat, lon: i.origin_lon } : null));
  const [budget, setBudget] = useState<number>(draft?.budget ?? i?.budget_max ?? 15000);
  const [nights, setNights] = useState<number>(draft?.nights ?? i?.trip_nights ?? 3);
  const [vibes, setVibes] = useState<string[]>(draft?.vibes ?? i?.destination_types ?? []);
  const [wont, setWont] = useState<string[]>(draft?.wont ?? i?.wont_do ?? []);
  const [easy, setEasy] = useState<boolean>(draft?.easy ?? (!!i && i.wont_do.length === 0));
  const [notes, setNotes] = useState<string>(draft?.notes ?? i?.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!(draft?.notes || i?.notes));

  useEffect(() => {
    safeSet(draftKey, JSON.stringify({ step, avail, city, budget, nights, vibes, wont, easy, notes }));
  }, [draftKey, step, avail, city, budget, nights, vibes, wont, easy, notes]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const answered = props.windows.filter((w) => avail[w.id]).length;
  const okWindows = props.windows.filter((w) => avail[w.id] === "yes" || avail[w.id] === "maybe");
  const maxNights = Math.max(1, ...okWindows.map((w) => dayDiff(w.start, w.end)), ...(okWindows.length ? [] : props.windows.map((w) => dayDiff(w.start, w.end))));
  const nightOpts = [1, 2, 3, 4, 5, 6].filter((n) => n <= Math.max(maxNights, 1));
  useEffect(() => { if (nights > maxNights) setNights(maxNights); }, [maxNights, nights]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const canNext = [answered === props.windows.length, !!city, true][step];
  const blocker = [
    answered < props.windows.length ? `Answer ${props.windows.length - answered} more date option${props.windows.length - answered > 1 ? "s" : ""}` : "",
    !city ? "Pick your city" : "",
    "",
  ][step];

  function submit() {
    props.onSubmit({
      available_windows: props.windows.filter((w) => avail[w.id] === "yes").map((w) => w.id),
      maybe_windows: props.windows.filter((w) => avail[w.id] === "maybe").map((w) => w.id),
      origin_city: city?.name ?? "",
      origin_lat: city?.lat ?? null,
      origin_lon: city?.lon ?? null,
      budget_max: budget,
      trip_nights: nights,
      destination_types: vibes,
      wont_do: easy ? [] : wont,
      notes,
    });
  }

  return (
    <div>
      <div className="stepper-head">
        <span>Step {step + 1} of 3 · {STEPS[step]}</span>
        <span className="row" style={{ gap: 4 }}><Check size={14} /> Autosaved</span>
      </div>
      <div className="progress"><div style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>

      {step === 0 && (
        <section>
          <h1 style={{ fontSize: 26, marginTop: 18 }}>Hi {props.member}! Which dates work for you?</h1>
          <p className="muted small">{props.isOrganiser ? "You picked these, so they're all ticked. Change any that don't work for you." : "One tap each. “Maybe” is fine if you'd need to check."}</p>
          {props.windows.some((w) => avail[w.id] !== "yes") ? (
            <div className="row" style={{ margin: "12px 0" }}>
              <button type="button" className="chip" onClick={() => setAvail(Object.fromEntries(props.windows.map((w) => [w.id, "yes"])))}>
                <Sparkles size={15} /> All of them work
              </button>
            </div>
          ) : <div style={{ height: 12 }} />}
          {props.windows.map((w) => {
            const a = avail[w.id];
            const hol = holidaysIn(w.start, w.end);
            const lv = leaveDays(w.start, w.end);
            const n = dayDiff(w.start, w.end);
            return (
              <div key={w.id} className={`dcard ${a ?? ""}`}>
                <div className="dcard-top">
                  <div>
                    <h3>{w.label}</h3>
                    <div className="small muted">{rangeLabel(w.start, w.end)} · {n ? `${n} night${n > 1 ? "s" : ""}` : "day trip"}{hol.length ? ` · ${hol.join(", ")}` : ""}</div>
                  </div>
                  <span className={`leave ${lv ? "some" : "zero"}`} style={{ marginTop: 0 }}>{lv ? `${lv} leave day${lv > 1 ? "s" : ""}` : "No leave"}</span>
                </div>
                <div className="tri" role="radiogroup" aria-label={`Can you do ${w.label}?`}>
                  {([["yes", "Can go", <Check key="y" size={16} />], ["maybe", "Maybe", <CircleHelp key="m" size={16} />], ["no", "Can't", <X key="n" size={16} />]] as const).map(([k, l, ic]) => (
                    <button type="button" key={k} role="radio" aria-checked={a === k} className={`${k} ${a === k ? "on" : ""}`} onClick={() => setAvail({ ...avail, [w.id]: k })}>
                      {ic} {l}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {answered === props.windows.length && okWindows.length === 0 && (
            <div className="note">None of these work? That&apos;s useful too. Submit anyway and tell the organiser in the note on the last step.</div>
          )}
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 style={{ fontSize: 26, marginTop: 18 }}>Where are you travelling from?</h1>
          <p className="muted small">We use it to estimate your travel time and cost.</p>
          <div style={{ marginTop: 12 }}><CityPicker value={city} onChange={setCity} /></div>

          <label className="lbl" style={{ marginTop: 24 }}>Your max budget, all-in</label>
          <p className="hint">Per person: travel, stay and food. Only you see this.</p>
          <div className="card flat" style={{ margin: 0 }}>
            <div className="between">
              <span className="budget-big">{inr(budget)}{budget >= 100000 ? "+" : ""}</span>
              <span className="tiny muted">per person</span>
            </div>
            <input type="range" min={5000} max={100000} step={1000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} aria-label="Budget" />
            <div className="chips">
              {BUDGETS.map((b) => (
                <button type="button" key={b} className={`chip ${budget === b ? "on" : ""}`} onClick={() => setBudget(b)}>{inr(b).replace(",000", "k")}</button>
              ))}
            </div>
          </div>

          <label className="lbl" style={{ marginTop: 24 }}>Ideal trip length</label>
          <div className="chips">
            {nightOpts.map((n) => (
              <button type="button" key={n} className={`chip ${nights === n ? "on" : ""}`} onClick={() => setNights(n)}>
                {n} night{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 style={{ fontSize: 26, marginTop: 18 }}>What kind of trip?</h1>
          <p className="muted small">Pick as many as you like.</p>
          <div className="tiles" style={{ marginTop: 12 }}>
            {VIBES.map((v) => (
              <button type="button" key={v.key} className={`tile ${vibes.includes(v.key) ? "on" : ""}`} onClick={() => toggle(vibes, setVibes, v.key)} aria-pressed={vibes.includes(v.key)}>
                {vibes.includes(v.key) && <span className="tick"><Check size={12} strokeWidth={3} /></span>}
                {v.icon}{v.label}
              </button>
            ))}
          </div>

          <label className="lbl" style={{ marginTop: 24 }}>Anything that&apos;s a deal-breaker?</label>
          <p className="hint">Only you see this. Others just see that an option “clashes with something they'd rather avoid”.</p>
          <div className="chips">
            <button type="button" className={`chip ${easy ? "on" : ""}`} onClick={() => { setEasy(!easy); if (!easy) setWont([]); }}>
              <Check size={15} /> Nothing, I&apos;m easy
            </button>
            {WONTS.map((w) => (
              <button type="button" key={w.key} className={`chip ${wont.includes(w.key) ? "on" : ""}`}
                onClick={() => { setEasy(false); toggle(wont, setWont, w.key); }} aria-pressed={wont.includes(w.key)}>
                {w.icon}{w.label}
              </button>
            ))}
          </div>

          {!showNotes ? (
            <button type="button" className="linkbtn" style={{ marginTop: 16 }} onClick={() => setShowNotes(true)}>+ Add a note (optional)</button>
          ) : (
            <>
              <label className="lbl">Anything else?</label>
              <textarea value={notes} maxLength={300} placeholder="e.g. Been to Goa twice already · I can only leave Friday evening" onChange={(e) => setNotes(e.target.value)} />
            </>
          )}
        </section>
      )}

      <div className="privacy" style={{ marginTop: 18 }}><Lock size={14} /> Private. Others only see whether each option works for you, never your budget or deal-breakers.</div>
      <p className="tiny muted" style={{ textAlign: "center" }}>
        Not {props.member}? <button type="button" className="linkbtn tiny" onClick={props.onSwitch}>Switch person</button>
      </p>

      <div className="actionbar">
        <div className="actionbar-in">
          {step > 0 && (
            <button type="button" className="btn ghost" onClick={() => setStep(step - 1)} aria-label="Back" style={{ background: "#fff" }}><ArrowLeft size={18} /></button>
          )}
          {step < 2 ? (
            <button type="button" className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
              {canNext ? <>Next <ArrowRight size={17} /></> : blocker}
            </button>
          ) : (
            <button type="button" className="btn primary" disabled={props.busy} onClick={submit}>
              {props.busy ? <><Loader2 size={17} className="spin" /> Saving…</> : <>Submit my answers <Check size={17} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
