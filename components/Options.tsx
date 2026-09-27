"use client";
// OUTPUT: where everyone stands (grid), the "getting there" map, and three option cards with the vote.
// Card order follows what people decide on: what it is → why → when → cost → what it means for you → vote.
import { useState } from "react";
import dynamic from "next/dynamic";
import { Check, X, Minus, Wallet, CalendarDays, ChevronDown, Lock, Users, Globe, Lightbulb, CloudSun, Route } from "lucide-react";
import { Avatar, inrK } from "./ui";
import { photoForTags } from "@/lib/photos";
import { leaveDays, rangeLabel } from "@/lib/holidays";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false, loading: () => <div className="trip-map" /> });

export type Fit = { level: "works" | "stretch" | "no"; score: number; reasons: string[]; mine?: string[]; short?: string };

// Your own row shows your private detail (budget, deal-breakers) instead of the neutral line everyone else sees.
const reasonsFor = (f: Fit) => (f.mine ? [...f.reasons.filter((r) => !r.includes("private limits")), ...f.mine] : f.reasons);
export type Opt = {
  id: string; rank: number; destination: string; region: string; window_id: string; nights: number;
  summary: string; why: string; tags: string[]; group_score: number; source: string; image: string | null;
  works_count: number; no_count: number;
  international?: boolean; visa?: boolean; suggested_by?: string[];
  lat?: number | null; lon?: number | null; season?: string | null;
  cost_range?: { min: number; max: number } | null;
  origins?: { city: string; lat: number; lon: number }[];
  fit: Record<string, Fit>;
  my_estimate: { cost_min: number; cost_max: number; travel: string; conflict: string | null } | null;
  votes: { in: string[]; cant: string[]; pending: string[] };
};
type W = { id: string; label: string; start: string; end: string };

const LEVEL = { works: "Works", stretch: "Stretch", no: "No" } as const;
const ICON = { works: <Check size={13} strokeWidth={3} />, stretch: <Minus size={13} strokeWidth={3} />, no: <X size={13} strokeWidth={3} /> };
const place = (d: string) => d.replace(/\s*\(.*\)/, "");

export function Matrix({ options, members, me }: { options: Opt[]; members: string[]; me?: string }) {
  const [cell, setCell] = useState<{ m: string; o: string } | null>(null);
  const picked = cell ? options.find((o) => o.id === cell.o) : null;
  const pf = picked && cell ? picked.fit[cell.m] : null;
  return (
    <div className="card">
      <h3 style={{ marginBottom: 10 }}><Users size={16} style={{ verticalAlign: -2 }} /> Where everyone stands</h3>
      <div className="grid-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th />
              {options.map((o) => <th key={o.id}>{place(o.destination)}</th>)}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m}>
                <td className="who"><Avatar name={m} size="sm" /> <b style={{ fontWeight: m === me ? 800 : 600 }}>{m === me ? "You" : m}</b></td>
                {options.map((o) => {
                  const f = o.fit[m];
                  const voted = o.votes.in.includes(m) ? "in" : o.votes.cant.includes(m) ? "cant" : null;
                  const on = cell?.m === m && cell?.o === o.id;
                  return (
                    <td key={o.id}>
                      {f ? (
                        <button type="button" className={`fitpill ${f.level} ${on ? "on" : ""}`} onClick={() => setCell(on ? null : { m, o: o.id })} aria-label={`${m}, ${place(o.destination)}: ${LEVEL[f.level]}`}>
                          {ICON[f.level]} {LEVEL[f.level]}
                          {voted && <span className={`voted ${voted}`}>{voted === "in" ? "in" : "✕"}</span>}
                        </button>
                      ) : <span className="muted">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pf && cell && picked ? (
        <div className={`cell-why ${pf.level}`}>
          <b>{cell.m === me ? "You" : cell.m} · {place(picked.destination)}:</b> {reasonsFor(pf).join(" · ")}
        </div>
      ) : (
        <p className="tiny muted" style={{ marginTop: 10 }}><ChevronDown size={12} style={{ verticalAlign: -2 }} /> Tap any cell to see why</p>
      )}
    </div>
  );
}

/** "Getting to …": pick an option, see everyone's home cities joined to it. */
export function MapSection({ options, pickId }: { options: Opt[]; pickId?: string }) {
  const mappable = options.filter((o) => o.lat != null && o.lon != null && (o.origins?.length ?? 0) > 0);
  const [sel, setSel] = useState(pickId && mappable.some((o) => o.id === pickId) ? pickId : mappable[0]?.id);
  const o = mappable.find((x) => x.id === sel) ?? mappable[0];
  if (!o) return null;
  return (
    <div className="card map-card">
      <div className="between" style={{ flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <h3><Route size={16} style={{ verticalAlign: -2 }} /> Getting to {place(o.destination)}</h3>
        {mappable.length > 1 && (
          <div className="seg sm">
            {mappable.map((x) => (
              <button type="button" key={x.id} className={x.id === o.id ? "on" : ""} onClick={() => setSel(x.id)}>{place(x.destination)}</button>
            ))}
          </div>
        )}
      </div>
      <TripMap dest={{ name: place(o.destination), lat: o.lat!, lon: o.lon! }} origins={o.origins ?? []} />
    </div>
  );
}

export function OptionCard(props: {
  o: Opt; w?: W; members: string[]; me?: string; myVote?: "in" | "cant"; canVote: boolean; busy: boolean;
  onVote?: (v: "in" | "cant") => void; isAdmin?: boolean; onLock?: () => void; won?: boolean; locked?: boolean;
}) {
  const { o, w } = props;
  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const leave = w ? leaveDays(w.start, w.end) : 0;
  const total = props.members.length;
  const canOrganiserLock = props.isAdmin && !props.locked && o.votes.cant.length === 0 && o.votes.in.length > total / 2;
  const label = props.won ? "Locked in" : o.rank === 1 ? "#1 · Fairest for everyone" : `#${o.rank}`;

  return (
    <article className={`opt ${props.won ? "won" : ""}`}>
      <div className="opt-hero">
        <img src={o.image && imgOk ? o.image : photoForTags(o.tags).src} alt={o.destination} loading="lazy" onError={() => setImgOk(false)} />
        <div className="opt-badges">
          <span className="glass dark">{label}</span>
          <span className="glass lime">Works for {o.works_count}/{total}</span>
        </div>
        <h2>{place(o.destination)}</h2>
        <div className="region">
          {o.region}
          {o.international && <span className="glass"><Globe size={12} /> Abroad{o.visa ? " · visa needed" : ""}</span>}
        </div>
      </div>

      <div className="opt-body">
        {!!o.suggested_by?.length && (
          <div className="suggested"><Lightbulb size={14} /> Suggested by {o.suggested_by.map((m) => (m === props.me ? "you" : m)).join(", ")}</div>
        )}
        <h3 className="pitch">{o.summary}</h3>
        {o.why && <p className="small muted">{o.why}</p>}

        <div className="info-rows">
          <div className="info"><CalendarDays size={17} />
            <div><b>{w ? rangeLabel(w.start, w.end) : "—"} · {o.nights} night{o.nights > 1 ? "s" : ""}</b>
              <span>{w?.label}{leave ? ` · ${leave} leave day${leave > 1 ? "s" : ""}` : " · no leave needed"}</span></div>
          </div>
          {o.cost_range && (
            <div className="info"><Wallet size={17} />
              <div><b>{inrK(o.cost_range.min)}–{inrK(o.cost_range.max)} per person, all-in</b>
                <span>Estimate. Check live prices before booking</span></div>
            </div>
          )}
        </div>

        {o.my_estimate && (
          <div className="for-you">
            <span className="muted">For you:</span> ≈ <b>{inrK(o.my_estimate.cost_max)}</b>{o.my_estimate.travel ? <> · {o.my_estimate.travel.replace(/^~/, "")}</> : null}
            {o.my_estimate.conflict && <div className="tiny" style={{ color: "var(--stretch)", marginTop: 4 }}>Heads-up: {o.my_estimate.conflict.toLowerCase()}</div>}
          </div>
        )}
        {o.season && <p className="season"><CloudSun size={15} /> {o.season}</p>}

        <button type="button" className="stand-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="stackav">{props.members.slice(0, 6).map((m) => <Avatar key={m} name={m} size="sm" ring={o.fit[m]?.level} />)}</span>
          Where each person stands
          <ChevronDown size={16} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
        </button>
        {open && (
          <div className="stand">
            {props.members.map((m) => {
              const f = o.fit[m];
              const v = o.votes.in.includes(m) ? "in" : o.votes.cant.includes(m) ? "cant" : null;
              return (
                <div className="stand-row" key={m} title={f ? reasonsFor(f).join(" · ") : ""}>
                  <Avatar name={m} size="sm" ring={f?.level} />
                  <span className="nm">
                    {m}{m === props.me ? " (you)" : ""}
                    {f && (f.level !== "works" || m === props.me) && <span className="why">{m === props.me ? reasonsFor(f).slice(0, 3).join(" · ") : f.short}</span>}
                  </span>
                  {v && <span className={`lvl ${v === "in" ? "works" : "no"}`} style={{ background: "transparent" }}>{v === "in" ? <><Check size={12} strokeWidth={3} /> In</> : <><X size={12} strokeWidth={3} /> Can&apos;t</>}</span>}
                  <span className={`lvl ${f?.level}`}>{f ? LEVEL[f.level] : "—"}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="tally">
          <span><b>{place(o.destination)}</b> · {o.votes.in.length} in{o.votes.cant.length ? ` · ${o.votes.cant.length} can't` : ""}</span>
          <span className="muted">of {total}</span>
        </div>
        <div className="progress"><div style={{ width: `${(o.votes.in.length / total) * 100}%` }} /></div>

        {props.canVote && !props.locked && (
          <div className="vote-row">
            <button className={`btn block ${props.myVote === "in" ? "in-on" : "primary"}`} disabled={props.busy} onClick={() => props.onVote?.("in")}>
              <Check size={17} /> {props.myVote === "in" ? "You're in" : "I'm in"}
            </button>
            <button className={`btn ${props.myVote === "cant" ? "cant-on" : "ghost"}`} disabled={props.busy} onClick={() => props.onVote?.("cant")}>
              Can&apos;t do
            </button>
          </div>
        )}
        {canOrganiserLock && (
          <button className="btn dark block" style={{ marginTop: 8 }} disabled={props.busy} onClick={props.onLock}>
            <Lock size={15} /> Lock this one ({o.votes.in.length}/{total} in, nobody against)
          </button>
        )}
      </div>
    </article>
  );
}
