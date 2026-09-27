"use client";
// INPUT: private answers in 3 short steps. About 10 taps, no typing. Autosaves on this device.
import { useEffect, useMemo, useState } from "react";
import {
  Check, X, CircleHelp, ArrowLeft, ArrowRight, Lock, Loader2, TreePalm, Mountain, Building2, Landmark, Trees, Tent,
  Coffee, Music, UtensilsCrossed, Bus, Clock, Plane, Footprints, Snowflake, PartyPopper, BedDouble, Car, Sparkles, CalendarPlus,
  Leaf, Scale, Zap, Wallet, Gem, PawPrint, Sun, Waves, Sailboat, Flower2, Sofa, Compass, Camera, ShoppingBag, MapPin, Wifi, House, Eye, CloudRain, Sunrise, Users, Globe, X as XIcon,
} from "lucide-react";
import CityPicker, { type CityValue } from "./CityPicker";
import RangeCalendar, { type Win } from "./RangeCalendar";
import BudgetRange from "./BudgetRange";
import { PICKS, STYLE_PHOTOS } from "@/lib/photos";
import { dayDiff, holidaysIn, leaveDays, rangeLabel } from "@/lib/holidays";
import { inr, inrK, safeGet, safeSet } from "./ui";

type W = { id: string; label: string; start: string; end: string; added_by?: string; added_at?: string };
type Initial = null | {
  updated_at?: string;
  origin_city: string; origin_lat: number | null; origin_lon: number | null; budget_max: number;
  available_windows: string[]; maybe_windows: string[]; trip_nights: number; destination_types: string[]; wont_do: string[]; notes: string;
  abroad?: "yes" | "maybe" | "no"; styles?: string[]; must_haves?: string[]; places?: string[];
  budget_min?: number | null; pace?: "relaxed" | "balanced" | "packed" | null; stay?: "budget" | "boutique" | "comfort" | null; passport?: boolean;
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
  { key: "wildlife", label: "Wildlife", icon: <PawPrint size={24} /> },
  { key: "snow", label: "Snow", icon: <Snowflake size={24} /> },
  { key: "desert", label: "Desert", icon: <Sun size={24} /> },
  { key: "lakes", label: "Lakes & rivers", icon: <Waves size={24} /> },
  { key: "islands", label: "Islands", icon: <Sailboat size={24} /> },
  { key: "spiritual", label: "Spiritual", icon: <Flower2 size={24} /> },
];
// How people want to spend the days.
const STYLES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "relaxed", label: "Relaxed", icon: <Sofa size={15} /> },
  { key: "adventurous", label: "Adventurous", icon: <Mountain size={15} /> },
  { key: "party", label: "Parties", icon: <PartyPopper size={15} /> },
  { key: "exploring", label: "Exploring", icon: <Compass size={15} /> },
  { key: "sightseeing", label: "Sightseeing", icon: <Landmark size={15} /> },
  { key: "food trail", label: "Food focused", icon: <UtensilsCrossed size={15} /> },
  { key: "shopping", label: "Shopping spree", icon: <ShoppingBag size={15} /> },
  { key: "wellness", label: "Wellness", icon: <Flower2 size={15} /> },
  { key: "culture", label: "Local culture", icon: <Users size={15} /> },
  { key: "photography", label: "Photography", icon: <Camera size={15} /> },
];
const MUSTS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "pool", label: "Pool", icon: <Waves size={15} /> },
  { key: "beach nearby", label: "Beach nearby", icon: <TreePalm size={15} /> },
  { key: "veg-friendly food", label: "Veg-friendly food", icon: <UtensilsCrossed size={15} /> },
  { key: "villa / homestay", label: "Villa / homestay", icon: <House size={15} /> },
  { key: "good cafes", label: "Good cafes", icon: <Coffee size={15} /> },
  { key: "nightlife nearby", label: "Nightlife nearby", icon: <Music size={15} /> },
  { key: "short travel", label: "Short travel", icon: <Clock size={15} /> },
  { key: "wifi to work", label: "Wi-Fi to work", icon: <Wifi size={15} /> },
  { key: "scenic views", label: "Scenic views", icon: <Eye size={15} /> },
  { key: "easy on the legs", label: "Not much walking", icon: <Footprints size={15} /> },
];
const ABROAD: { key: "no" | "maybe" | "yes"; label: string; icon: React.ReactNode }[] = [
  { key: "yes", label: "Yes!", icon: <Globe size={15} /> },
  { key: "maybe", label: "Maybe", icon: <CircleHelp size={15} /> },
  { key: "no", label: "India only", icon: <MapPin size={15} /> },
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
  { key: "hot weather", label: "Hot weather", icon: <Sun size={15} /> },
  { key: "high altitude", label: "High altitude", icon: <Mountain size={15} /> },
  { key: "visa hassle", label: "Visa hassle", icon: <Plane size={15} /> },
  { key: "very touristy spots", label: "Very touristy spots", icon: <Users size={15} /> },
  { key: "monsoon / rain", label: "Rain", icon: <CloudRain size={15} /> },
  { key: "early mornings", label: "Early mornings", icon: <Sunrise size={15} /> },
];
const STEPS = ["Dates", "Budget", "Style", "Details"];
const PACE = [
  { key: "relaxed", label: "Relaxed", sub: "Lazy mornings", icon: <Leaf size={17} /> },
  { key: "balanced", label: "Balanced", sub: "A bit of both", icon: <Scale size={17} /> },
  { key: "packed", label: "Packed", sub: "See it all", icon: <Zap size={17} /> },
] as const;
const STAY = [
  { key: "budget", label: "Budget", sub: "Clean & simple", icon: <Wallet size={17} /> },
  { key: "boutique", label: "Boutique", sub: "Charming", icon: <Gem size={17} /> },
  { key: "comfort", label: "Comfort", sub: "Pools & polish", icon: <BedDouble size={17} /> },
] as const;

export default function PrefWizard(props: {
  tripId: string; member: string; windows: W[]; initial: Initial; busy: boolean; isOrganiser: boolean; abroadAllowed: boolean;
  onSubmit: (b: object) => void; onSwitch: () => void;
}) {
  const i = props.initial;
  const draftKey = `draft:${props.tripId}:${props.member}`;
  const draft = useMemo(() => { try { return JSON.parse(safeGet(draftKey) || "null"); } catch { return null; } }, [draftKey]);
  const initAvail: Record<string, Avail> = draft?.avail ?? (i
    ? Object.fromEntries(props.windows
        .filter((w) => i.available_windows.includes(w.id) || i.maybe_windows?.includes(w.id) || !(w.added_at && i.updated_at && w.added_at > i.updated_at))
        .map((w) => [w.id, i.available_windows.includes(w.id) ? "yes" : i.maybe_windows?.includes(w.id) ? "maybe" : "no"]))
    : props.isOrganiser ? Object.fromEntries(props.windows.map((w) => [w.id, "yes"])) : {});

  const [step, setStep] = useState<number>(draft?.step ?? 0);
  const [avail, setAvail] = useState<Record<string, Avail>>(initAvail);
  const [city, setCity] = useState<CityValue | null>(draft?.city ?? (i ? { name: i.origin_city, lat: i.origin_lat, lon: i.origin_lon } : null));
  const [budget, setBudget] = useState<number>(draft?.budget ?? i?.budget_max ?? 20000);
  const [budgetMin, setBudgetMin] = useState<number>(draft?.budgetMin ?? i?.budget_min ?? 12000);
  const [pace, setPace] = useState<string>(draft?.pace ?? i?.pace ?? "balanced");
  const [stay, setStay] = useState<string>(draft?.stay ?? i?.stay ?? "boutique");
  const [passport, setPassport] = useState<boolean>(draft?.passport ?? i?.passport ?? false);
  const [nights, setNights] = useState<number>(draft?.nights ?? i?.trip_nights ?? 3);
  const [vibes, setVibes] = useState<string[]>(draft?.vibes ?? i?.destination_types ?? []);
  const [wont, setWont] = useState<string[]>(draft?.wont ?? i?.wont_do ?? []);
  const [easy, setEasy] = useState<boolean>(draft?.easy ?? (!!i && i.wont_do.length === 0));
  const [notes, setNotes] = useState<string>(draft?.notes ?? i?.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!(draft?.notes || i?.notes));
  const [abroad, setAbroad] = useState<"yes" | "maybe" | "no">(draft?.abroad ?? i?.abroad ?? "no");
  const [styles, setStyles] = useState<string[]>(draft?.styles ?? i?.styles ?? []);
  const [musts, setMusts] = useState<string[]>(draft?.musts ?? i?.must_haves ?? []);
  const [places, setPlaces] = useState<string[]>(draft?.places ?? i?.places ?? []);
  const [placeDraft, setPlaceDraft] = useState("");
  // Long lists start short; anything already picked always shows.
  const [moreMust, setMoreMust] = useState(false);
  const [moreWont, setMoreWont] = useState(false);
  const shown = <T extends { key: string }>(list: T[], n: number, all: boolean, picked: string[]) =>
    all ? list : list.filter((x, k) => k < n || picked.includes(x.key));
  const addPlace = () => {
    const v = placeDraft.replace(/[:<>]/g, "").trim().slice(0, 40);
    if (v && places.length < 3 && !places.some((p) => p.toLowerCase() === v.toLowerCase())) setPlaces([...places, v]);
    setPlaceDraft("");
  };
  // Dates this person suggests on top of the organiser's. They count as "Can go" for them.
  const [extra, setExtra] = useState<Win[]>(draft?.extra ?? []);
  const [showCal, setShowCal] = useState(!!draft?.extra?.length);
  const room = Math.max(0, 6 - props.windows.length);

  useEffect(() => {
    safeSet(draftKey, JSON.stringify({ step, avail, city, budget, budgetMin, nights, vibes, wont, easy, notes, extra, abroad, styles, musts, places, pace, stay, passport }));
  }, [draftKey, step, avail, city, budget, budgetMin, nights, vibes, wont, easy, notes, extra, abroad, styles, musts, places, pace, stay, passport]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const answered = props.windows.filter((w) => avail[w.id]).length;
  const okWindows = [...props.windows.filter((w) => avail[w.id] === "yes" || avail[w.id] === "maybe"), ...extra];
  const maxNights = Math.max(1, ...okWindows.map((w) => dayDiff(w.start, w.end)), ...(okWindows.length ? [] : props.windows.map((w) => dayDiff(w.start, w.end))));
  const nightOpts = [1, 2, 3, 4, 5, 6].filter((n) => n <= Math.max(maxNights, 1));
  useEffect(() => { if (nights > maxNights) setNights(maxNights); }, [maxNights, nights]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const last = STEPS.length - 1;
  const canNext = [answered === props.windows.length, !!city, true, true][step];
  const blocker = [
    answered < props.windows.length ? `Answer ${props.windows.length - answered} more date option${props.windows.length - answered > 1 ? "s" : ""}` : "",
    !city ? "Pick your city" : "",
    "",
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
      budget_min: Math.min(budgetMin, budget),
      pace,
      stay,
      passport: props.abroadAllowed && abroad !== "no" ? passport : false,
      trip_nights: nights,
      destination_types: vibes,
      wont_do: easy ? [] : wont,
      notes,
      new_windows: extra,
      abroad: props.abroadAllowed ? abroad : "no",
      styles,
      must_haves: musts,
      places: placeDraft.trim() && places.length < 3 ? [...places, placeDraft.trim()] : places,
    });
  }

  return (
    <div>
      <div className="steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((l, k) => (
          <span key={l} className={`step ${k === step ? "on" : k < step ? "done" : ""}`}>
            {k < step ? <Check size={13} strokeWidth={3} /> : <b>{k + 1}</b>} {l}
          </span>
        ))}
      </div>
      <div className="stepper-head"><span /> <span className="row" style={{ gap: 4 }}><Check size={14} /> Autosaved</span></div>

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
                    <div className="small muted">{rangeLabel(w.start, w.end)} · {n ? `${n} night${n > 1 ? "s" : ""}` : "day trip"}{hol.length ? ` · ${hol.join(", ")}` : ""}{w.added_by ? ` · suggested by ${w.added_by}` : ""}</div>
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
          {room > 0 && (
            <div className={showCal ? "card flat" : ""} style={{ marginTop: 12 }}>
              {!showCal ? (
                <button type="button" className="btn ghost block" onClick={() => setShowCal(true)} style={{ borderStyle: "dashed" }}>
                  <CalendarPlus size={16} /> Suggest other dates that work for you
                </button>
              ) : (
                <>
                  <h3 style={{ marginBottom: 4 }}>Your suggested dates</h3>
                  <p className="hint" style={{ marginTop: 0 }}>Everyone will be asked about these too. Up to {room} more.</p>
                  <RangeCalendar windows={extra} onChange={setExtra} max={room} taken={props.windows} />
                </>
              )}
            </div>
          )}
          {answered === props.windows.length && okWindows.length === 0 && (
            <div className="note">None of these work? Suggest dates that do, just above, so the group can consider them.</div>
          )}
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 style={{ fontSize: 26, marginTop: 18 }}>Where are you travelling from?</h1>
          <p className="muted small">We use it to estimate your travel time and cost.</p>
          <div style={{ marginTop: 12 }}><CityPicker value={city} onChange={setCity} /></div>

          <label className="lbl" style={{ marginTop: 24 }}>Budget, all-in per person</label>
          <p className="hint">Including travel from your city, stay and food.</p>
          <div className="privacy" style={{ marginTop: 0 }}><Lock size={14} /> Only you see this. Others only see whether an option works for you.</div>
          <BudgetRange low={budgetMin} high={budget} onChange={(lo, hi) => { setBudgetMin(lo); setBudget(hi); }} />

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
          <p className="muted small">Pick up to 3.</p>
          <div className="photo-picks">
            {STYLES.map((v) => {
              const on = styles.includes(v.key);
              return (
                <button type="button" key={v.key} className={`photo-pick ${on ? "on" : ""}`} aria-pressed={on}
                  onClick={() => (on ? setStyles(styles.filter((x) => x !== v.key)) : styles.length < 3 && setStyles([...styles, v.key]))}>
                  <img src={STYLE_PHOTOS[v.key]} alt="" loading="lazy" />
                  {on && <span className="tick"><Check size={12} strokeWidth={3} /></span>}
                  <span className="lbl">{v.label}</span>
                </button>
              );
            })}
          </div>

          <label className="lbl" style={{ marginTop: 24 }}>Pace</label>
          <div className="seg big">
            {PACE.map((x) => (
              <button type="button" key={x.key} className={pace === x.key ? "on" : ""} onClick={() => setPace(x.key)} aria-pressed={pace === x.key}>
                {x.icon}<b>{x.label}</b><span>{x.sub}</span>
              </button>
            ))}
          </div>

          <label className="lbl" style={{ marginTop: 20 }}>Stay style</label>
          <div className="seg big">
            {STAY.map((x) => (
              <button type="button" key={x.key} className={stay === x.key ? "on" : ""} onClick={() => setStay(x.key)} aria-pressed={stay === x.key}>
                {x.icon}<b>{x.label}</b><span>{x.sub}</span>
              </button>
            ))}
          </div>

          {props.abroadAllowed && (
            <div className="card flat abroad-box">
              <h3><Globe size={17} style={{ verticalAlign: -3 }} /> Open to going abroad?</h3>
              <p className="hint" style={{ margin: "4px 0 10px" }}>Short-haul trips like Thailand, Sri Lanka, Nepal or Bali.</p>
              <div className="seg">
                {ABROAD.map((a) => (
                  <button type="button" key={a.key} className={abroad === a.key ? "on" : ""} onClick={() => setAbroad(a.key)} aria-pressed={abroad === a.key}>{a.label}</button>
                ))}
              </div>
              {abroad !== "no" && (
                <label className="switch-row">
                  <span>I have a passport valid for 6+ months</span>
                  <input type="checkbox" className="switch" checked={passport} onChange={(e) => setPassport(e.target.checked)} />
                </label>
              )}
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 style={{ fontSize: 26, marginTop: 18 }}>A few details</h1>
          <p className="muted small">All optional. Skip anything you don&apos;t mind about.</p>

          <label className="lbl">What would you love to see?</label>
          <div className="tiles">
            {VIBES.map((v) => (
              <button type="button" key={v.key} className={`tile ${vibes.includes(v.key) ? "on" : ""}`} onClick={() => toggle(vibes, setVibes, v.key)} aria-pressed={vibes.includes(v.key)}>
                {vibes.includes(v.key) && <span className="tick"><Check size={12} strokeWidth={3} /></span>}
                {v.icon}{v.label}
              </button>
            ))}
          </div>

          <label className="lbl" style={{ marginTop: 24 }}>Any must-haves?</label>
          <div className="chips">
            {shown(MUSTS, 5, moreMust, musts).map((v) => (
              <button type="button" key={v.key} className={`chip ${musts.includes(v.key) ? "on" : ""}`} onClick={() => toggle(musts, setMusts, v.key)} aria-pressed={musts.includes(v.key)}>
                {v.icon}{v.label}
              </button>
            ))}
            {!moreMust && <button type="button" className="chip more" onClick={() => setMoreMust(true)}>+ {MUSTS.length - shown(MUSTS, 5, false, musts).length} more</button>}
          </div>

          <label className="lbl" style={{ marginTop: 24 }}>Anything that&apos;s a deal-breaker?</label>
          <p className="hint">Only you see this. Others just see that an option “clashes with something they'd rather avoid”.</p>
          <div className="chips">
            <button type="button" className={`chip ${easy ? "on" : ""}`} onClick={() => { setEasy(!easy); if (!easy) setWont([]); }}>
              <Check size={15} /> Nothing, I&apos;m easy
            </button>
            {shown(WONTS, 7, moreWont, wont).map((w) => (
              <button type="button" key={w.key} className={`chip ${wont.includes(w.key) ? "on" : ""}`}
                onClick={() => { setEasy(false); toggle(wont, setWont, w.key); }} aria-pressed={wont.includes(w.key)}>
                {w.icon}{w.label}
              </button>
            ))}
            {!moreWont && <button type="button" className="chip more" onClick={() => setMoreWont(true)}>+ {WONTS.length - shown(WONTS, 7, false, wont).length} more</button>}
          </div>

          <label className="lbl" style={{ marginTop: 24 }}>Any places already in mind?</label>
          <p className="hint">Up to 3. The group will see who suggested them.</p>
          <div className="chip-input">
            {places.map((p) => (
              <span key={p} className="chip static"><MapPin size={14} /> {p}
                <button type="button" className="x" aria-label={`Remove ${p}`} style={{ background: "none", border: 0, cursor: "pointer", padding: 2 }} onClick={() => setPlaces(places.filter((x) => x !== p))}><XIcon size={14} /></button>
              </span>
            ))}
            {places.length < 3 && (
              <input type="text" value={placeDraft} placeholder={places.length ? "Add another…" : "e.g. Gokarna, Bali"} maxLength={40}
                onChange={(e) => { if (e.target.value.endsWith(",")) { setPlaceDraft(e.target.value.slice(0, -1)); setTimeout(addPlace); } else setPlaceDraft(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPlace(); } }} onBlur={addPlace} />
            )}
          </div>

          <div className="mini-picks">
            {PICKS.filter((p) => !places.some((x) => x.toLowerCase() === p.place.toLowerCase())).map((p) => (
              <button type="button" key={p.place} className="mini-pick" disabled={places.length >= 3} onClick={() => setPlaces([...places, p.place])}>
                <img src={p.src} alt="" loading="lazy" /><span>+ {p.place}</span>
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

      {step !== 1 && <div className="privacy" style={{ marginTop: 18 }}><Lock size={14} /> Private. Others only see whether each option works for you, never your budget or deal-breakers.</div>}
      <p className="tiny muted" style={{ textAlign: "center" }}>
        Not {props.member}? <button type="button" className="linkbtn tiny" onClick={props.onSwitch}>Switch person</button>
      </p>

      <div className="actionbar">
        <div className="actionbar-in">
          {step > 0 && (
            <button type="button" className="btn ghost" onClick={() => setStep(step - 1)} aria-label="Back" style={{ background: "#fff" }}><ArrowLeft size={18} /></button>
          )}
          {step < last ? (
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
