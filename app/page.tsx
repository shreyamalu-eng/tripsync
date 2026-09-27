"use client";
// TRIGGER: landing + organiser setup on one screen (who · when · deadline) → one link.
import { useRef, useState } from "react";
import { Users, CalendarRange, Sparkles, ArrowRight, Loader2, Lock, Vote, Clock3, Link2 } from "lucide-react";
import RangeCalendar, { type Win } from "@/components/RangeCalendar";
import NameChips from "@/components/NameChips";
import { Avatar, safeSet } from "@/components/ui";
import { HERO, SHOWCASE } from "@/lib/photos";

const DEADLINES = [
  { id: "24h", label: "24 hours", days: 1 },
  { id: "2d", label: "2 days", days: 2 },
  { id: "3d", label: "3 days", days: 3 },
  { id: "1w", label: "1 week", days: 7 },
];
function deadlineFor(days: number) {
  if (days === 1) return new Date(Date.now() + 86400000);
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(21, 0, 0, 0);
  return d;
}
const fmtDeadline = (d: Date) =>
  d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function Home() {
  const [name, setName] = useState("");
  const [organiser, setOrganiser] = useState("");
  const [friends, setFriends] = useState<string[]>([]);
  const [windows, setWindows] = useState<Win[]>([]);
  const [dl, setDl] = useState("2d");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);

  const days = DEADLINES.find((d) => d.id === dl)!.days;
  const missing = [
    !organiser.trim() && "your name",
    friends.length < 1 && "at least one friend",
    windows.length < 1 && "one date option",
  ].filter(Boolean) as string[];

  async function create() {
    if (missing.length) {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
      return missing.length === 3 ? undefined : setErr(`Add ${missing.join(", ")}`);
    }
    setErr("");
    setBusy(true);
    const org = organiser.trim();
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || `${org}'s group trip`,
        organiser: org,
        members: [org, ...friends],
        date_windows: windows,
        deadline: deadlineFor(days).toISOString(),
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setErr(j.error || "Something went wrong"); }
    safeSet(`admin:${j.id}`, j.admin_token);
    safeSet(`me:${j.id}`, JSON.stringify({ member: org, token: null }));
    window.location.href = `/t/${j.id}?new=1`;
  }

  return (
    <>
      <section className="hero">
        <img className="bg" src={HERO.big} alt="" />
        <div className="glass-row">
          <span className="glass"><Lock size={13} /> Private answers</span>
          <span className="glass"><Clock3 size={13} /> 1 minute</span>
          <span className="glass"><Link2 size={13} /> One link</span>
        </div>
        <span className="glass dark" style={{ alignSelf: "flex-start", marginBottom: 14 }}>1,200 messages. Zero plans?</span>
        <h1>Turn group chaos<br />into <span style={{ color: "var(--lime)" }}>one trip.</span></h1>
        <p className="lede">Everyone answers privately through one link. You get three trips that work for the whole group, and see exactly where each person stands.</p>
        <div className="cta">
          <button className="btn primary" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}>
            Plan a trip <ArrowRight size={17} />
          </button>
          <button className="btn glassy" onClick={() => howRef.current?.scrollIntoView({ behavior: "smooth" })}>How it works</button>
        </div>
        <div className="peek glass dark">
          <span className="stackav">{["Riya", "Siddharth", "Karan", "Aisha", "Preethi"].map((n) => <Avatar key={n} name={n} size="sm" />)}</span>
          <span className="small" style={{ fontWeight: 650 }}>5 friends · 3 trips · 1 decision</span>
        </div>
        <span className="credit">{HERO.place}, {HERO.region} · Wikimedia Commons</span>
      </section>

      <div className="section-head">
        <h2>Where groups are heading</h2>
      </div>
      <div className="showcase">
        {SHOWCASE.map((p) => (
          <div className="shot" key={p.place}>
            <img src={p.src} alt={p.place} loading="lazy" />
            <span className="glass dark">{p.tags[0][0].toUpperCase() + p.tags[0].slice(1)}</span>
            <b>{p.place}</b>
            <span className="tiny" style={{ opacity: 0.85 }}>{p.region}</span>
          </div>
        ))}
      </div>

      <div className="how" ref={howRef} style={{ scrollMarginTop: 70 }}>
        {[
          { ic: <Lock size={18} />, t: "Everyone answers in private", d: "Dates, city, budget, vibe. About a minute, no typing. Nobody sees anyone's budget." },
          { ic: <Sparkles size={18} />, t: "We find the overlap", d: "Three options that work for everyone, not just the loudest in the chat." },
          { ic: <Vote size={18} />, t: "The group locks it in", d: "Each person taps I'm in or Can't do. It locks when all of you are in." },
        ].map((x) => (
          <div className="how-item" key={x.t}>
            <div className="ic">{x.ic}</div>
            <div><h3>{x.t}</h3><p className="small muted">{x.d}</p></div>
          </div>
        ))}
      </div>

      <div ref={formRef} style={{ scrollMarginTop: 70 }}>
        <p className="eyebrow" style={{ marginTop: 26 }}>Set up in under a minute</p>
        <h2 style={{ fontSize: 28, letterSpacing: "-0.035em" }}>Start your trip</h2>

        <div className="card">
          <div className="section-title"><span className="step-num">1</span><h3><Users size={16} style={{ verticalAlign: -2 }} /> Who&apos;s going?</h3></div>
          <label className="lbl" style={{ marginTop: 0 }}>Your name</label>
          <input type="text" value={organiser} placeholder="Riya" maxLength={40} onChange={(e) => setOrganiser(e.target.value)} autoComplete="given-name" />
          <label className="lbl">Friends</label>
          <p className="hint">Press Enter after each name, or paste them all: “Siddharth, Karan, Aisha, Preethi”</p>
          <NameChips names={friends} onChange={setFriends} exclude={organiser} />
          <label className="lbl">Trip name <span className="muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input type="text" value={name} maxLength={80} placeholder={organiser ? `${organiser}'s group trip` : "College gang reunion"} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="card">
          <div className="section-title"><span className="step-num">2</span><h3><CalendarRange size={16} style={{ verticalAlign: -2 }} /> When could you go?</h3></div>
          <p className="hint" style={{ marginTop: -4 }}>Add up to 6 date options. Tap the first day, then the last day. Friends just tick which ones they can do.</p>
          <RangeCalendar windows={windows} onChange={setWindows} />
        </div>

        <div className="card">
          <div className="section-title"><span className="step-num">3</span><h3><Clock3 size={16} style={{ verticalAlign: -2 }} /> Answers due in</h3></div>
          <div className="chips">
            {DEADLINES.map((d) => (
              <button type="button" key={d.id} className={`chip ${dl === d.id ? "on" : ""}`} onClick={() => setDl(d.id)}>{d.label}</button>
            ))}
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>
            Due {fmtDeadline(deadlineFor(days))}. Options unlock the moment everyone&apos;s in. Friends can suggest extra dates too. You can go ahead early with whoever has answered.
          </p>
        </div>
        {err && <div className="error">{err}</div>}
      </div>

      <p className="foot">TripSync suggests. Your group decides. Nothing is ever booked for you.</p>

      <div className="actionbar">
        <div className="actionbar-in">
          <button className="btn primary block" onClick={create} disabled={busy}>
            {busy ? <><Loader2 size={17} className="spin" /> Creating…</> : missing.length === 3 ? <>Start planning <ArrowRight size={17} /></> : missing.length ? <>Add {missing[0]}</> : <>Create trip &amp; get link <ArrowRight size={17} /></>}
          </button>
        </div>
      </div>
    </>
  );
}
