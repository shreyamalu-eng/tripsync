"use client";
// OUTPUT: where everyone stands (matrix) + three photo cards with per-person fit and the vote.
import { useState } from "react";
import { Check, X, Wallet, Route, CalendarDays, Moon, ChevronDown, Lock, Users } from "lucide-react";
import { Avatar, inrK } from "./ui";
import { photoForTags } from "@/lib/photos";
import { leaveDays, rangeLabel } from "@/lib/holidays";

export type Fit = { level: "works" | "stretch" | "no"; score: number; reasons: string[]; mine?: string[] };

// Your own row shows your private detail (budget, deal-breakers) instead of the neutral line everyone else sees.
const reasonsFor = (f: Fit) => (f.mine ? [...f.reasons.filter((r) => !r.includes("private limits")), ...f.mine] : f.reasons);
export type Opt = {
  id: string; rank: number; destination: string; region: string; window_id: string; nights: number;
  summary: string; why: string; tags: string[]; group_score: number; source: string; image: string | null;
  works_count: number; no_count: number;
  fit: Record<string, Fit>;
  my_estimate: { cost_min: number; cost_max: number; travel: string; conflict: string | null } | null;
  votes: { in: string[]; cant: string[]; pending: string[] };
};
type W = { id: string; label: string; start: string; end: string };

const LEVEL = { works: "Works", stretch: "Stretch", no: "Doesn't work" } as const;

export function Matrix({ options, members, me }: { options: Opt[]; members: string[]; me?: string }) {
  return (
    <div className="card">
      <div className="between" style={{ marginBottom: 6 }}>
        <h3><Users size={16} style={{ verticalAlign: -2 }} /> Where everyone stands</h3>
      </div>
      <table className="matrix">
        <thead>
          <tr>
            <th />
            {options.map((o) => <th key={o.id}>{o.rank}. {o.destination.replace(/\s*\(.*\)/, "")}</th>)}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m}>
              <td><span className="row" style={{ gap: 8, flexWrap: "nowrap" }}><Avatar name={m} size="sm" /> <b style={{ fontWeight: m === me ? 800 : 600 }}>{m}{m === me ? " (you)" : ""}</b></span></td>
              {options.map((o) => {
                const f = o.fit[m];
                const v = o.votes.in.includes(m) ? "in" : o.votes.cant.includes(m) ? "cant" : null;
                return (
                  <td key={o.id} title={f ? `${LEVEL[f.level]}: ${reasonsFor(f).join(", ")}` : ""}>
                    <span className={`dot ${f?.level ?? "none"}`} />
                    {v && <span style={{ marginLeft: 4, color: v === "in" ? "var(--works)" : "var(--no)" }}>{v === "in" ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="small">Works for</td>
            {options.map((o) => <td key={o.id} className="small">{o.works_count}/{members.length}</td>)}
          </tr>
        </tfoot>
      </table>
      <div className="cal-legend" style={{ marginTop: 10 }}>
        <span><i style={{ background: "var(--works)" }} />Works</span>
        <span><i style={{ background: "#e5a524" }} />Stretch</span>
        <span><i style={{ background: "var(--no)" }} />Doesn&apos;t work</span>
        <span><Check size={11} strokeWidth={3} /> voted in</span>
      </div>
    </div>
  );
}

export function OptionCard(props: {
  o: Opt; w?: W; members: string[]; me?: string; myVote?: "in" | "cant"; canVote: boolean; busy: boolean;
  onVote?: (v: "in" | "cant") => void; isAdmin?: boolean; onLock?: () => void; won?: boolean; locked?: boolean;
}) {
  const { o, w } = props;
  const [open, setOpen] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(true);
  const leave = w ? leaveDays(w.start, w.end) : 0;
  const total = props.members.length;
  const canOrganiserLock = props.isAdmin && !props.locked && o.votes.cant.length === 0 && o.votes.in.length > total / 2;

  return (
    <article className={`opt ${props.won ? "won" : ""}`}>
      <div className="opt-hero">
        <img src={o.image && imgOk ? o.image : photoForTags(o.tags).src} alt={o.destination} loading="lazy" onError={() => setImgOk(false)} />
        <span className="rank glass dark">{props.won ? "Locked in" : `Option ${o.rank}`}</span>
        <span className="fitbadge glass lime">Works for {o.works_count}/{total}</span>
        <h2>{o.destination}</h2>
        <div className="glass-row">
          {o.region && <span className="glass clip">{o.region}</span>}
          {o.tags.slice(0, o.region ? 1 : 2).map((t) => <span className="glass" key={t}>{t[0].toUpperCase() + t.slice(1)}</span>)}
        </div>
      </div>
      <div className="opt-body">
        <p style={{ fontWeight: 600 }}>{o.summary}</p>
        <p className="small muted">{o.why}</p>

        <div className="facts" style={{ marginTop: 12 }}>
          <div className="fact"><div className="k"><CalendarDays size={13} /> Dates</div><div className="v">{w ? rangeLabel(w.start, w.end) : "—"}</div><div className="tiny muted">{w?.label}</div></div>
          <div className="fact"><div className="k"><Moon size={13} /> Length</div><div className="v">{o.nights} night{o.nights > 1 ? "s" : ""}</div><div className="tiny muted">{leave ? `${leave} leave day${leave > 1 ? "s" : ""}` : "no leave needed"}</div></div>
          {o.my_estimate && (
            <>
              <div className="fact mine"><div className="k"><Wallet size={13} /> Your cost (est.)</div><div className="v">{inrK(o.my_estimate.cost_min)}–{inrK(o.my_estimate.cost_max)}</div><div className="tiny muted">all-in, per person</div></div>
              <div className="fact mine"><div className="k"><Route size={13} /> Your travel</div><div className="v">{o.my_estimate.travel || "—"}</div><div className="tiny muted">one way</div></div>
            </>
          )}
        </div>
        {o.my_estimate?.conflict && <div className="heads-up">Heads-up for you: {o.my_estimate.conflict.toLowerCase()}</div>}

        <div className="stand">
          <div className="eyebrow" style={{ margin: "14px 0 4px" }}>Where each person stands</div>
          {props.members.map((m) => {
            const f = o.fit[m];
            const v = o.votes.in.includes(m) ? "in" : o.votes.cant.includes(m) ? "cant" : null;
            return (
              <div key={m}>
                <div className="stand-row" onClick={() => setOpen(open === m ? null : m)} role="button" aria-expanded={open === m}>
                  <Avatar name={m} size="sm" ring={f?.level} />
                  <span className="nm">{m}{m === props.me ? " (you)" : ""}</span>
                  {v && <span className={`lvl ${v === "in" ? "works" : "no"}`} style={{ background: "transparent" }}>{v === "in" ? <><Check size={12} strokeWidth={3} /> In</> : <><X size={12} strokeWidth={3} /> Can&apos;t</>}</span>}
                  <span className={`lvl ${f?.level}`}>{f ? LEVEL[f.level] : "—"}</span>
                  <ChevronDown size={15} color="var(--muted)" style={{ transform: open === m ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
                </div>
                {open === m && f && <div className="reasons">{reasonsFor(f).join(" · ")}{f.mine && f.mine.length > 0 && <span className="tiny muted"> · only you see the budget part</span>}</div>}
              </div>
            );
          })}
        </div>

        <div className="tally">
          <b>{o.votes.in.length}/{total} in</b>
          <div className="progress"><div style={{ width: `${(o.votes.in.length / total) * 100}%` }} /></div>
          {o.votes.cant.length > 0 && <span className="small" style={{ color: "var(--no)", fontWeight: 700 }}>{o.votes.cant.length} can&apos;t</span>}
        </div>

        {props.canVote && !props.locked && (
          <div className="vote-row">
            <button className={`btn ${props.myVote === "in" ? "in-on" : "soft"}`} disabled={props.busy} onClick={() => props.onVote?.("in")}>
              <Check size={17} /> I&apos;m in
            </button>
            <button className={`btn ${props.myVote === "cant" ? "cant-on" : "ghost"}`} disabled={props.busy} onClick={() => props.onVote?.("cant")}>
              <X size={17} /> Can&apos;t do
            </button>
          </div>
        )}
        {canOrganiserLock && (
          <button className="btn dark block" style={{ marginTop: 8 }} disabled={props.busy} onClick={props.onLock}>
            <Lock size={15} /> Lock this one ({o.votes.in.length}/{total} in, nobody against)
          </button>
        )}
        {o.my_estimate && <p className="tiny muted" style={{ marginTop: 10 }}>Costs are {o.source === "gemini" ? "AI" : "rough"} estimates to help you compare, not quotes. Nothing gets booked.</p>}
      </div>
    </article>
  );
}
