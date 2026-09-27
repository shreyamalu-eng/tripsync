"use client";
// The one shared link. Same URL for everyone; the screen follows the stage:
// share (organiser, once) → who are you → private answers → waiting → options + vote → decided.
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Copy, MessageCircle, ArrowRight, Pencil, Loader2, Lock, CalendarPlus, Share2, RotateCcw, PartyPopper, Clock3, Sparkles, Info,
} from "lucide-react";
import PrefWizard from "@/components/PrefWizard";
import { Matrix, OptionCard, type Opt } from "@/components/Options";
import { Avatar, Ring, Scene, sceneFor, useToast, safeGet, safeSet, safeDel, waLink } from "@/components/ui";
import { addDays, rangeLabel } from "@/lib/holidays";

type W = { id: string; label: string; start: string; end: string; added_by?: string; added_at?: string };
type State = {
  trip: { id: string; name: string; organiser: string; members: string[]; date_windows: W[]; deadline: string; status: "collecting" | "reopened" | "options" | "decided"; decided_option_id: string | null };
  submitted: { name: string; done: boolean }[];
  all_submitted: boolean; deadline_passed: boolean;
  date_coverage: { window_id: string; free: string[]; maybe: string[] }[];
  options: Opt[];
  me: null | {
    member: string; updated_at?: string; origin_city: string; origin_lat: number | null; origin_lon: number | null; budget_max: number;
    available_windows: string[]; maybe_windows: string[]; trip_nights: number; destination_types: string[]; wont_do: string[]; notes: string;
    my_votes: Record<string, "in" | "cant">;
  };
  is_admin: boolean; storage: string;
};
type Who = { member: string; token: string | null };

const fmtDue = (s: string) => new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function ics(tripName: string, place: string, w: W) {
  const d = (s: string) => s.replace(/-/g, "");
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TripSync//EN", "BEGIN:VEVENT",
    `UID:${Date.now()}@tripsync`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d(w.start)}`, `DTEND;VALUE=DATE:${d(addDays(w.end, 1))}`,
    `SUMMARY:${tripName}: ${place}`, "DESCRIPTION:Locked in on TripSync. Time to book!", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${place.replace(/\W+/g, "-")}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<State | null>(null);
  const [who, setWho] = useState<Who | null>(null);
  const [admin, setAdmin] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [shared, setShared] = useState(true);
  const [building, setBuilding] = useState(false);
  const genTried = useRef(false);
  const { toast, node: toastNode } = useToast();

  useEffect(() => {
    const saved = safeGet(`me:${id}`);
    if (saved) try { setWho(JSON.parse(saved)); } catch {}
    setAdmin(safeGet(`admin:${id}`));
    setShared(new URLSearchParams(window.location.search).get("new") !== "1" || safeGet(`shared:${id}`) === "1");
    setReady(true);
  }, [id]);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (who?.member) q.set("member", who.member);
    if (who?.token) q.set("token", who.token);
    if (admin) q.set("admin", admin);
    try {
      const r = await fetch(`/api/trips/${id}?${q}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) return setErr(j.error || "Could not load trip");
      setS(j);
    } catch { /* offline blip: keep last state */ }
  }, [id, who, admin]);

  useEffect(() => {
    if (!ready) return;
    load();
    const t = setInterval(load, 8000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [load, ready]);

  async function post(path: string, body: object) {
    setErr("");
    setBusy(true);
    try {
      const r = await fetch(`/api/trips/${id}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Something went wrong"); return null; }
      return j;
    } finally { setBusy(false); }
  }

  const generate = useCallback(async (asAdmin = false) => {
    setBuilding(true);
    setErr("");
    try {
      const r = await fetch(`/api/trips/${id}/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(asAdmin ? { admin_token: admin } : {}),
      });
      // 409 means someone else already built them (or it isn't time yet): just refresh.
      if (!r.ok && r.status !== 409) throw new Error();
    } catch {
      // Another phone may have built them while this one failed: only complain if there are still no options.
      const st = await fetch(`/api/trips/${id}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (!st?.trip || st.trip.status === "collecting" || st.trip.status === "reopened")
        setErr("Couldn't build the options. Check your connection and try again.");
    } finally { setBuilding(false); load(); }
  }, [id, admin, load]);

  // Gate: the moment everyone has answered, whoever has the page open builds the options.
  useEffect(() => {
    if (s && s.all_submitted && s.trip.status === "collecting" && !genTried.current) {
      genTried.current = true;
      generate();
    }
  }, [s, generate]);

  // The moment the trip locks, jump up to the celebration card.
  const status = s?.trip.status;
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current && prevStatus.current !== "decided" && status === "decided") window.scrollTo({ top: 0, behavior: "smooth" });
    prevStatus.current = status;
  }, [status]);

  if (!s) return <div className="card" style={{ marginTop: 20 }}>{err || <><Loader2 size={16} className="spin" /> Loading your trip…</>}</div>;

  const { trip } = s;
  const reopened = trip.status === "reopened";
  const collecting = trip.status === "collecting" || reopened;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/t/${trip.id}` : "";
  const doneCount = s.submitted.filter((x) => x.done).length;
  const pending = s.submitted.filter((x) => !x.done).map((x) => x.name);
  const isOrganiser = who?.member === trip.organiser;
  const winById = (wid: string) => trip.date_windows.find((w) => w.id === wid);
  const inviteText = `Let's finally lock our trip! 🧳 Takes 1 min, it's private, and it's one time: ${shareUrl} . Options unlock once all ${trip.members.length} of us answer.`;
  const nudgeText = `${pending.join(", ")}: you're the last ${pending.length === 1 ? "one" : pending.length} for "${trip.name}" 🙏 1 min, private: ${shareUrl}`;
  const choose = (m: string) => {
    const v = { member: m, token: null };
    setWho(v); safeSet(`me:${id}`, JSON.stringify(v));
    setEditing(!s.submitted.find((x) => x.name === m)?.done);
  };
  const switchPerson = () => { setWho(null); safeDel(`me:${id}`); setEditing(false); };
  const copy = (t: string, m: string) => { navigator.clipboard?.writeText(t).then(() => toast(m), () => toast("Couldn't copy. Long-press to copy instead.")); };

  // The private 3-step form. Also used by a late joiner once options are out, so they can vote.
  const wizard = (who: Who) => (
    <>
      {err && <div className="error">{err}</div>}
      {trip.status === "options" && <div className="note">The options are already out. Add your answers so you can vote.</div>}
      <PrefWizard
        key={who.member + (s.me ? "1" : "0")}
        tripId={id}
        member={who.member}
        windows={trip.date_windows}
        initial={s.me}
        busy={busy}
        isOrganiser={isOrganiser}
        onSwitch={switchPerson}
        onSubmit={async (body) => {
          const j = await post("preferences", { ...body, member: who.member, edit_token: who.token });
          if (!j) return;
          const v = { member: who.member, token: j.edit_token };
          safeDel(`draft:${id}:${who.member}`);
          setWho(v); safeSet(`me:${id}`, JSON.stringify(v)); setEditing(false);
          toast("Saved. Your answers are private 🔒");
          window.scrollTo({ top: 0 });
        }}
      />
      {toastNode}
    </>
  );

  const Header = (
    <div style={{ margin: "10px 0 6px" }}>
      <div className="between">
        <div>
          <p className="eyebrow">{trip.status === "decided" ? "Decided" : trip.status === "options" ? "Time to decide" : reopened ? "Answers reopened" : "Collecting answers"}</p>
          <h1 style={{ fontSize: 26, margin: "2px 0" }}>{trip.name}</h1>
          <p className="tiny muted">By {trip.organiser}{collecting ? ` · answers due ${fmtDue(trip.deadline)}` : ""}{s.storage === "local" ? " · local test mode" : ""}</p>
        </div>
        {who && (
          <button className="chip person" onClick={switchPerson} title="Switch person" style={{ flex: "none" }}>
            <Avatar name={who.member} size="sm" /> {who.member}
          </button>
        )}
      </div>
    </div>
  );

  // ---------- 1. Organiser's first visit: share the link ----------
  if (collecting && s.is_admin && !shared) {
    return (
      <>
        {Header}
        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--moss)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--forest)" }}>
            <Share2 size={28} />
          </div>
          <h2>Your trip link is ready</h2>
          <p className="muted small">Post it once in the group. Everyone taps their name and answers in private.</p>
          <div className="stack" style={{ marginTop: 16 }}>
            <a className="btn wa block" href={waLink(inviteText)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Share on WhatsApp</a>
            <button className="btn ghost block" onClick={() => copy(shareUrl, "Link copied")}><Copy size={16} /> Copy link</button>
          </div>
          <p className="tiny muted" style={{ marginTop: 10, wordBreak: "break-all" }}>{shareUrl}</p>
        </div>
        <div className="actionbar"><div className="actionbar-in">
          <button className="btn primary" onClick={() => { safeSet(`shared:${id}`, "1"); setShared(true); setEditing(!s.me); }}>
            Now add your own answers <ArrowRight size={17} />
          </button>
        </div></div>
        {toastNode}
      </>
    );
  }

  // ---------- Building options ----------
  if (building || (s.all_submitted && trip.status === "collecting" && !err)) {
    return (
      <>
        {Header}
        <div className="card building">
          <Loader2 size={34} className="spin" color="var(--forest-2)" />
          <h2 style={{ marginTop: 12 }}>Everyone&apos;s in! Finding your best trips…</h2>
          <p className="muted small">Checking dates, budgets, travel time and vibes for all {trip.members.length} of you. Takes about 15 seconds.</p>
        </div>
      </>
    );
  }

  // ---------- 2. Collecting ----------
  if (collecting) {
    if (!who) {
      return (
        <>
          {Header}
          <div className="card">
            <h2>Who are you?</h2>
            <p className="muted small">Tap your name to add your answers. It takes about a minute.</p>
            <div className="people-grid" style={{ marginTop: 14 }}>
              {s.submitted.map((m) => (
                <button key={m.name} className="person-tile" onClick={() => choose(m.name)}>
                  <Avatar name={m.name} size="lg" status={m.done ? "done" : "wait"} />
                  {m.name}
                  <span className="sub">{m.done ? "Answered" : m.name === trip.organiser ? "Organiser" : "Waiting"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="privacy"><Lock size={14} /> Nobody sees your budget or deal-breakers. Only whether each option works for you.</div>
        </>
      );
    }

    if (editing || (!s.me && !s.submitted.find((x) => x.name === who.member)?.done)) return wizard(who);

    // Organiser tool: clear one person's answers when someone answered as the wrong person.
    const resetPanel = s.is_admin && doneCount > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>Someone answered as the wrong person?</summary>
            <p className="tiny muted" style={{ margin: "8px 0" }}>Clear their answers so the right person can answer from their own phone.</p>
            <div className="chips">
              {s.submitted.filter((m) => m.done).map((m) => (
                <button key={m.name} type="button" className="chip person" disabled={busy} onClick={async () => {
                  if (!window.confirm(`Clear ${m.name}'s answers so they can answer again?`)) return;
                  if (await post("admin", { admin_token: admin, action: "reset", member: m.name })) {
                    if (who.member === m.name) switchPerson();
                    toast(`${m.name} can answer again`);
                    load();
                  }
                }}>
                  <RotateCcw size={13} /> {m.name}
                </button>
              ))}
            </div>
          </details>
    );

    // Waiting room
    return (
      <>
        {Header}
        {err && <div className="error">{err}</div>}
        <div className="card">
          <div className="status-card">
            <Ring done={doneCount} total={trip.members.length} />
            <div>
              <h2 style={{ fontSize: 18 }}>{pending.length ? `Waiting on ${pending.length} ${pending.length === 1 ? "person" : "people"}` : "Everyone's in!"}</h2>
              <p className="small muted">Options unlock the moment all {trip.members.length} of you have answered.</p>
            </div>
          </div>
          <div className="avatars" style={{ marginTop: 16 }}>
            {s.submitted.map((m) => (
              <div className="av-col" key={m.name}><Avatar name={m.name} status={m.done ? "done" : "wait"} dim={!m.done} />{m.name}</div>
            ))}
          </div>
          {pending.length > 0 && (
            <div className="stack" style={{ marginTop: 16 }}>
              <a className="btn wa block" href={waLink(nudgeText)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Nudge {pending.length === 1 ? pending[0] : `${pending.length} people`} on WhatsApp</a>
              <button className="btn ghost block" onClick={() => copy(shareUrl, "Link copied")}><Copy size={16} /> Copy trip link</button>
            </div>
          )}
        </div>

        {s.me && trip.date_windows.some((w) => w.added_at && s.me!.updated_at && w.added_at > s.me!.updated_at) && (
          <div className="note between" style={{ gap: 10 }}>
            <span><b>New dates suggested</b> by {[...new Set(trip.date_windows.filter((w) => w.added_at && w.added_at > s.me!.updated_at!).map((w) => w.added_by))].join(", ")}. Do they work for you?</span>
            <button className="btn sm primary" onClick={() => setEditing(true)}>Answer</button>
          </div>
        )}
        {s.me ? (
          <div className="card flat between">
            <div><b>Your answers are in ✓</b><div className="tiny muted">Change anything until the options are out.</div></div>
            <button className="btn sm ghost" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
          </div>
        ) : (
          <div className="note"><Info size={14} style={{ verticalAlign: -2 }} /> {who.member} already answered on another device. Open the link there to edit or vote.</div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Dates so far</h3>
          <div className="heat">
            {trip.date_windows.map((w) => {
              const c = s.date_coverage.find((x) => x.window_id === w.id);
              const y = c?.free.length ?? 0;
              const m = c?.maybe.length ?? 0;
              const n = trip.members.length;
              return (
                <div className="heat-row" key={w.id}>
                  <span className="small"><b>{w.label}</b> <span className="muted">· {rangeLabel(w.start, w.end)}{w.added_by ? ` · from ${w.added_by}` : ""}</span></span>
                  <span className="tiny muted">{y} can{m ? ` · ${m} maybe` : ""}</span>
                  <div className="heat-bar"><div className="y" style={{ width: `${(y / n) * 100}%` }} /><div className="m" style={{ width: `${(m / n) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {reopened && (
          <div className="note">Answers are open again, so anyone can edit theirs. {s.is_admin ? "Rebuild the options when everyone's done." : `${trip.organiser} will rebuild the options.`}</div>
        )}
        {s.is_admin && reopened && resetPanel && <div className="card flat">{resetPanel}</div>}
        {s.is_admin && reopened && (
          <button className="btn primary block" disabled={busy || doneCount < 2} onClick={() => generate(true)} style={{ marginBottom: 12 }}>
            <Sparkles size={16} /> Rebuild options with {doneCount} people
          </button>
        )}
        {s.all_submitted && err && (
          <button className="btn primary block" disabled={building} onClick={() => generate()} style={{ marginBottom: 12 }}>
            <Sparkles size={16} /> Try building the options again
          </button>
        )}
        {s.is_admin && !reopened && (
          <div className="card flat">
            <h3><Clock3 size={15} style={{ verticalAlign: -2 }} /> Organiser</h3>
            <p className="small muted">
              {doneCount < 2
                ? "Once at least 2 people have answered, you can go ahead without waiting for the rest."
                : `Don't want to wait? Go ahead now with the ${doneCount} who answered. ${pending.length ? `${pending.join(", ")} can still join and vote after.` : ""}`}
            </p>
            <button className="btn soft sm" style={{ marginTop: 8 }} disabled={busy || doneCount < 2} onClick={() => {
              if (pending.length && !window.confirm(`Build the options now with ${doneCount} people? ${pending.join(", ")} haven't answered yet.`)) return;
              generate(true);
            }}>
              <Sparkles size={14} /> Go ahead with {doneCount} {doneCount === 1 ? "person" : "people"}
            </button>
            {resetPanel}
          </div>
        )}
        {toastNode}
      </>
    );
  }

  // ---------- 3. Options & 4. Decided ----------
  // Someone who never answered picks their name: they answer first, then vote.
  if (trip.status === "options" && who && editing) return wizard(who);

  const decided = trip.status === "decided" ? s.options.find((o) => o.id === trip.decided_option_id) : null;
  const dw = decided ? winById(decided.window_id) : undefined;
  const canVote = !!s.me && trip.status === "options";
  // Be honest when no option works for the whole group, and say who it's blocked on.
  const best = s.options[0];
  const blockedOn = best ? trip.members.filter((m) => best.fit[m]?.level === "no") : [];

  return (
    <>
      {Header}
      {err && <div className="error">{err}</div>}

      {decided && dw && (
        <div className="decided">
          <div className="img">
            {decided.image ? <img src={decided.image} alt={decided.destination} /> : <Scene kind={sceneFor(decided.tags)} />}
          </div>
          <div className="body">
            <p className="eyebrow" style={{ color: "var(--lime)" }}><PartyPopper size={14} style={{ verticalAlign: -2 }} /> It&apos;s decided</p>
            <h1>{decided.destination}</h1>
            <p style={{ opacity: 0.9 }}>{dw.label} · {rangeLabel(dw.start, dw.end)} · {decided.nights} nights</p>
            <p className="small" style={{ opacity: 0.8 }}>Locked in by {decided.votes.in.join(", ")}. Next step: book it.</p>
            <div className="btns">
              <button className="btn primary block" onClick={() => ics(trip.name, decided.destination, dw)}><CalendarPlus size={17} /> Add to calendar</button>
              <a className="btn wa block" href={waLink(`It's decided! 🎉 ${decided.destination}, ${rangeLabel(dw.start, dw.end)} (${decided.nights} nights). Let's book: ${shareUrl}`)} target="_blank" rel="noreferrer">
                <MessageCircle size={17} /> Tell the group
              </a>
            </div>
          </div>
        </div>
      )}

      {trip.status === "options" && (
        <div className="card flat" style={{ background: "var(--moss)", border: 0 }}>
          <h3>Your top {s.options.length} trips</h3>
          <p className="small" style={{ color: "var(--forest-2)" }}>
            Ranked by what works for <b>everyone</b>, not the majority. Mark each one <b>I&apos;m in</b> or <b>Can&apos;t do</b>. It locks as soon as all {trip.members.length} of you are in on one.
          </p>
          {s.options[0]?.source === "rules" && <p className="tiny muted" style={{ marginTop: 6 }}>Built with the rules-only planner (AI was unavailable). Costs are rough estimates.</p>}
        </div>
      )}

      {trip.status === "options" && blockedOn.length > 0 && (
        <div className="note">
          <b>None of these work for all {trip.members.length} of you yet.</b> Even the top option doesn&apos;t work for {blockedOn.join(", ")}. Tap their row on a card to see why.
          {s.is_admin ? " You can reopen answers below so people can change their dates or preferences." : ` ${trip.organiser} can reopen answers so people can adjust.`}
        </div>
      )}

      {who && !s.me && trip.status === "options" && s.submitted.find((x) => x.name === who.member)?.done && (
        <div className="note"><Info size={14} style={{ verticalAlign: -2 }} /> {who.member} answered on another device. Open the link there to vote.</div>
      )}

      {!who && trip.status === "options" && (
        <div className="card">
          <h3>Who are you?</h3>
          <div className="chips" style={{ marginTop: 10 }}>
            {trip.members.map((m) => <button key={m} className="chip person" onClick={() => choose(m)}><Avatar name={m} size="sm" /> {m}</button>)}
          </div>
        </div>
      )}

      <Matrix options={s.options} members={trip.members} me={who?.member} />

      <div className="opts-grid">
        {s.options.map((o) => (
          <OptionCard
            key={o.id}
            o={o}
            w={winById(o.window_id)}
            members={trip.members}
            me={who?.member}
            myVote={s.me?.my_votes[o.id]}
            canVote={canVote}
            busy={busy}
            locked={trip.status === "decided"}
            won={trip.decided_option_id === o.id}
            isAdmin={s.is_admin}
            onVote={async (v) => {
              const j = await post("vote", { member: who!.member, edit_token: who!.token, option_id: o.id, vote: v });
              if (j?.locked) toast("Everyone's in. Trip locked! 🎉");
              else if (j) toast(v === "in" ? `You're in on ${o.destination}` : "Noted");
              load();
            }}
            onLock={async () => {
              if (!window.confirm(`Lock ${o.destination} for the group?`)) return;
              await post("admin", { admin_token: admin, action: "lock", option_id: o.id });
              load();
            }}
          />
        ))}
      </div>

      {s.is_admin && trip.status === "options" && (
        <div className="card flat">
          <p className="small muted">Organiser: you can lock an option early only if most people are in and nobody has said they can&apos;t. The decision stays with the group.</p>
          <button className="btn danger sm" style={{ marginTop: 8 }} disabled={busy} onClick={async () => {
            if (!window.confirm("Clear the options and votes so people can change their answers?")) return;
            await post("admin", { admin_token: admin, action: "reopen" });
            load();
          }}><RotateCcw size={14} /> Reopen answers</button>
        </div>
      )}
      {toastNode}
    </>
  );
}
