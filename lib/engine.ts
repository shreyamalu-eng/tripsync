// SYSTEM logic (backend). Deterministic rules - no AI here.
// - which date windows work for the most people
// - per-person fit for each option (budget, dates, vibe, won't-dos)
// - ranking into the top 3
// - decision lock
// Budgets and won't-dos stay private: reasons are phrased without numbers.

import { PLACES, distanceKm, type Place } from "./catalogue";
import { findCity } from "./cities";
import type { MemberEstimate, MemberFit, Preference, Trip, TripOption, Vote } from "./types";

export type Candidate = Omit<TripOption, "id" | "trip_id" | "rank" | "fit" | "group_score" | "created_at" | "image">;

export function windowCoverage(trip: Trip, prefs: Preference[]) {
  return trip.date_windows
    .map((w) => ({
      window: w,
      available: prefs.filter((p) => p.available_windows.includes(w.id)).map((p) => p.member),
      maybe: prefs.filter((p) => (p.maybe_windows ?? []).includes(w.id)).map((p) => p.member),
    }))
    .sort(
      (a, b) =>
        b.available.length + b.maybe.length / 2 - (a.available.length + a.maybe.length / 2) ||
        a.window.start.localeCompare(b.window.start)
    );
}

export function windowNights(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export function groupNights(prefs: Preference[], maxNights: number) {
  const n = prefs.map((p) => p.trip_nights).sort((a, b) => a - b);
  const median = n.length ? n[Math.floor((n.length - 1) / 2)] : 3;
  return Math.max(1, Math.min(median, maxNights));
}

// ---------- per-person fit ----------
// `reasons` are shown to the whole group, so budget and won't-do details are folded into one
// neutral line. `mine` holds the full detail and is only ever sent to that person (lib/view.ts).
export function scoreMember(c: Candidate, member: string, pref: Preference | undefined): MemberFit {
  if (!pref) return { level: "stretch", score: 50, reasons: ["Hasn't shared preferences yet"], mine: [] };
  const reasons: string[] = [];
  const mine: string[] = [];
  let score = 0;
  let hardFail = false;
  let soft = false;
  let privateNo = false;
  let privateSoft = false;

  if (pref.available_windows.includes(c.window_id)) {
    reasons.push("Free on these dates");
  } else if ((pref.maybe_windows ?? []).includes(c.window_id)) {
    soft = true;
    reasons.push("Dates might work");
  } else {
    hardFail = true;
    reasons.push("Not free on these dates");
  }

  const est = c.estimates[member];
  if (est) {
    if (est.cost_max <= pref.budget_max) {
      score += 40;
      mine.push("Within your budget");
    } else if (est.cost_min <= pref.budget_max * 1.15) {
      score += 20;
      privateSoft = true;
      mine.push("A bit over your budget");
    } else {
      privateNo = true;
      mine.push("Over your budget");
    }
    if (est.conflict) {
      privateSoft = true;
      mine.push(`Clashes with something you'd rather avoid (${est.conflict.toLowerCase()})`);
    } else score += 30;

    // A journey that eats the trip is not a "stretch": 36h each way for 2 nights doesn't work.
    const hrs = Number(/(\d+(?:\.\d+)?)\s*h/.exec(est.travel)?.[1] ?? 0);
    const tooFar = Math.max(16, c.nights * 6);
    if (hrs > tooFar) {
      hardFail = true;
      reasons.push(`Journey too long for ${c.nights} night${c.nights > 1 ? "s" : ""} (${est.travel.replace("~", "")} each way)`);
    } else if (hrs > 12) {
      soft = true;
      score -= 10;
      reasons.push(`Long journey (${est.travel.replace("~", "")})`);
    }
  } else {
    score += 35;
    soft = true;
    reasons.push("Cost not estimated");
  }

  if (privateNo) {
    hardFail = true;
    reasons.push("Doesn't fit their private limits");
  } else if (privateSoft) {
    soft = true;
    reasons.push("A stretch on their private limits");
  }

  const vibeMatch = c.tags.filter((t) => pref.destination_types.includes(t));
  if (vibeMatch.length) {
    score += 30;
    reasons.push(`Matches their vibe (${vibeMatch.slice(0, 2).join(", ")})`);
  } else {
    score += 10;
    soft = true;
    reasons.push("Not their first-choice vibe");
  }

  const level = hardFail ? "no" : !soft && score >= 75 ? "works" : "stretch";
  return { level, score: hardFail ? Math.min(score, 30) : score, reasons, mine };
}

// "Goa (North)", "North Goa" and "South Goa" are the same trip as far as the group is concerned.
const baseName = (d: string) =>
  d.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\b(north|south|east|west|old|new|central)\b/g, " ").replace(/\s+/g, " ").trim();

export function rankCandidates(trip: Trip, prefs: Preference[], cands: Candidate[]): TripOption[] {
  const byMember = new Map(prefs.map((p) => [p.member, p]));
  const scored = cands.map((c) => {
    const fit: Record<string, MemberFit> = {};
    for (const m of trip.members) fit[m] = scoreMember(c, m, byMember.get(m));
    const fits = Object.values(fit);
    const noCount = fits.filter((f) => f.level === "no").length;
    const avg = fits.reduce((s, f) => s + f.score, 0) / fits.length;
    return { c, fit, noCount, group_score: Math.round(Math.max(0, avg - noCount * 25)) };
  });
  scored.sort((a, b) => a.noCount - b.noCount || b.group_score - a.group_score);

  const seen = new Set<string>();
  const top = [];
  for (const s of scored) {
    if (seen.has(baseName(s.c.destination))) continue;
    seen.add(baseName(s.c.destination));
    top.push(s);
    if (top.length === 3) break;
  }
  const now = new Date().toISOString();
  return top.map((s, i) => ({
    ...s.c,
    id: `o${i + 1}`,
    trip_id: trip.id,
    rank: i + 1,
    fit: s.fit,
    group_score: s.group_score,
    image: null,
    created_at: now,
  }));
}

// ---------- rules-only candidate generation (fallback / no AI key) ----------
function originOf(pref: Preference): [number, number] | null {
  if (pref.origin_lat != null && pref.origin_lon != null) return [pref.origin_lat, pref.origin_lon];
  const c = findCity(pref.origin_city);
  return c ? [c.lat, c.lon] : null;
}

function travelFor(pref: Preference, place: Place, wontDo: string[]) {
  const from = originOf(pref);
  const d = from ? distanceKm(from, [place.lat, place.lon]) : 900;
  const noFlights = wontDo.includes("flights");
  let mode: string, hours: number, cost: number;
  if (d < 60) [mode, hours, cost] = ["local", 1, 400];
  else if (d < 250) [mode, hours, cost] = ["drive", d / 50, d * 2 * 5];
  else if (d < 750 || noFlights) [mode, hours, cost] = ["train", d / 55, Math.max(1200, d * 2 * 1.6)];
  else [mode, hours, cost] = ["flight", 2.5 + d / 750, 5000 + d * 2 * 3];
  return { mode, hours: Math.round(hours), cost: Math.round(cost / 100) * 100 };
}

function conflictFor(place: Place, wontDo: string[], hours: number, mode: string): string | null {
  if (wontDo.includes("more than 8h one-way travel") && hours > 8) return "Long journey";
  if (wontDo.includes("cold weather") && place.tags.includes("mountains") && place.lat > 25) return "Cold weather";
  if (wontDo.includes("trekking / hikes") && place.tags.includes("adventure")) return "Hike-heavy spot";
  if (wontDo.includes("crowded party spots") && place.tags.includes("nightlife")) return "Party crowd";
  if (wontDo.includes("long road trips") && mode === "drive" && hours > 5) return "Long drive";
  return null;
}

export function estimateFor(place: Place, pref: Preference, nights: number): MemberEstimate {
  const t = travelFor(pref, place, pref.wont_do);
  const stay = nights * place.perNight;
  return {
    cost_min: Math.round((t.cost + stay * 0.8) / 500) * 500,
    cost_max: Math.round((t.cost * 1.25 + stay * 1.2) / 500) * 500,
    travel: t.mode === "local" ? "Local" : `~${t.hours}h ${t.mode}`,
    conflict: conflictFor(place, pref.wont_do, t.hours, t.mode),
  };
}

export function rulesCandidates(trip: Trip, prefs: Preference[]): Candidate[] {
  const windows = windowCoverage(trip, prefs).slice(0, 2);
  const out: Candidate[] = [];
  for (const { window } of windows) {
    const nights = groupNights(prefs, windowNights(window.start, window.end));
    for (const place of PLACES) {
      const estimates: Record<string, MemberEstimate> = {};
      for (const p of prefs) estimates[p.member] = estimateFor(place, p, nights);
      const wanted = prefs.filter((p) => p.destination_types.some((t) => place.tags.includes(t))).length;
      out.push({
        destination: place.name,
        region: place.region,
        window_id: window.id,
        nights,
        summary: place.blurb,
        why: `Matches the vibe for ${wanted} of ${prefs.length} people on the dates most of you are free.`,
        tags: place.tags,
        estimates,
        source: "rules",
      });
    }
  }
  return out;
}

// ---------- decision ----------
export function tally(trip: Trip, votes: Vote[], optionId: string) {
  const v = votes.filter((x) => x.option_id === optionId);
  const inList = v.filter((x) => x.vote === "in").map((x) => x.member);
  const cantList = v.filter((x) => x.vote === "cant").map((x) => x.member);
  return { in: inList, cant: cantList, pending: trip.members.filter((m) => !inList.includes(m) && !cantList.includes(m)) };
}

// An option locks automatically when everyone is "in".
// The organiser may lock earlier only if a majority is in AND nobody said "can't".
export function canLock(trip: Trip, votes: Vote[], optionId: string, byOrganiser: boolean) {
  const t = tally(trip, votes, optionId);
  if (t.in.length === trip.members.length) return true;
  return byOrganiser && t.cant.length === 0 && t.in.length > trip.members.length / 2;
}
