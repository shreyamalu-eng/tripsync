// SYSTEM logic (backend). Deterministic rules - no AI here.
// - which date windows work for the most people
// - per-person fit for each option (budget, dates, vibe, won't-dos)
// - ranking into the top 3
// - decision lock
// Budgets and won't-dos stay private: reasons are phrased without numbers.

import { PLACES, distanceKm, featuresOf, type Place } from "./catalogue";
import { findCity } from "./cities";
import type { DateWindow, MemberEstimate, MemberFit, Preference, Trip, TripOption, Vote } from "./types";

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
// `short` is the one main reason, shown at a glance next to "Doesn't work" / "Stretch".

// Interest tags imply trip styles, so a "party" person matches a nightlife place even without explicit styles.
const STYLE_FROM_TAG: Record<string, string[]> = {
  nightlife: ["party"], food: ["food trail"], heritage: ["sightseeing", "culture"], city: ["shopping", "sightseeing"],
  adventure: ["adventurous", "exploring"], chill: ["relaxed", "wellness"], beach: ["relaxed"], nature: ["exploring", "photography"],
  mountains: ["adventurous", "photography"], spiritual: ["culture", "wellness"], wildlife: ["exploring", "photography"],
  lakes: ["relaxed", "photography"], islands: ["relaxed"], desert: ["exploring"], snow: ["adventurous"],
};
export const stylesOf = (tags: string[]) => [...new Set([...tags, ...tags.flatMap((t) => STYLE_FROM_TAG[t] ?? [])])];

export function scoreMember(c: Candidate, member: string, pref: Preference | undefined, win?: DateWindow): MemberFit {
  if (!pref) return { level: "stretch", score: 50, reasons: ["Hasn't shared preferences yet"], mine: [], short: "Hasn't answered yet" };
  const reasons: string[] = [];
  const mine: string[] = [];
  const hard: string[] = []; // short labels, in order of importance
  const softs: string[] = [];
  let score = 0;
  let privateNo = false;
  let privateSoft = false;
  const no = (long: string, short: string) => { reasons.push(long); hard.push(short); };
  const meh = (long: string, short: string) => { reasons.push(long); softs.push(short); };

  // Dates
  if (pref.available_windows.includes(c.window_id)) reasons.push("Free on these dates");
  else if ((pref.maybe_windows ?? []).includes(c.window_id)) meh("Dates might work", "Dates unsure");
  else if (win?.added_at && pref.updated_at < win.added_at) meh("Hasn't answered these dates yet", "Hasn't seen these dates");
  else no("Not free on these dates", "Not free these dates");

  // Abroad
  if (c.international) {
    if ((pref.abroad ?? "no") === "no") no("Prefers to stay in India", "Prefers India");
    else if (pref.abroad === "maybe") meh("Unsure about going abroad", "Unsure about abroad");
    else if (!pref.passport) no("No valid passport yet", "No passport yet");
    if (c.visa && pref.wont_do.includes("visa hassle")) { privateSoft = true; mine.push("Needs a visa, which you'd rather avoid"); }
  }

  // Cost, deal-breakers, journey
  const est = c.estimates[member];
  if (est) {
    const comfy = pref.budget_min ?? pref.budget_max;
    if (est.cost_max <= comfy) {
      score += 40;
      mine.push("Within your budget");
    } else if (est.cost_max <= pref.budget_max) {
      score += 32;
      mine.push("Above your comfortable spend, within your max");
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
    if (hrs > tooFar) no(`Journey too long for ${c.nights} night${c.nights > 1 ? "s" : ""} (${est.travel.replace("~", "")} each way)`, "Journey too long");
    else if (hrs > 12) { score -= 10; meh(`Long journey (${est.travel.replace("~", "")})`, "Long journey"); }
    if (pref.must_haves?.includes("short travel") && hrs > 6) { privateSoft = true; mine.push("Longer travel than you wanted"); }
  } else {
    score += 35;
    meh("Cost not estimated", "Cost unknown");
  }

  // Must-haves (only when we know what the place offers)
  const wants = (pref.must_haves ?? []).filter((m) => m !== "short travel");
  if (c.has && wants.length) {
    const missing = wants.filter((m) => !c.has!.includes(m));
    if (missing.length) { privateSoft = true; mine.push(`Missing your must-have${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`); }
  }

  if (privateNo) no("Doesn't fit their private limits", "Over their limits");
  else if (privateSoft) meh("A stretch on their private limits", "Stretches their limits");

  // Vibe and kind of trip
  const offer = stylesOf(c.tags);
  const match = [...pref.destination_types, ...(pref.styles ?? [])].filter((t) => offer.includes(t));
  if (match.length) {
    score += 30;
    reasons.push(`Matches their vibe (${match.slice(0, 2).join(", ")})`);
  } else {
    score += 10;
    meh("Not their first-choice vibe", "Not their vibe");
  }

  const hardFail = hard.length > 0;
  const soft = softs.length > 0;
  const level = hardFail ? "no" : !soft && score >= 75 ? "works" : "stretch";
  return { level, score: hardFail ? Math.min(score, 30) : score, reasons, mine, short: hard[0] ?? softs[0] };
}

const samePlace = (a: string, b: string) => {
  const x = baseName(a), y = baseName(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

// "Goa (North)", "North Goa" and "South Goa" are the same trip as far as the group is concerned.
const baseName = (d: string) =>
  d.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\b(north|south|east|west|old|new|central)\b/g, " ").replace(/\s+/g, " ").trim();

/** Abroad is on the table only if the organiser allowed it and at least half the group is open to it. */
export function abroadOpen(trip: Trip, prefs: Preference[]) {
  if (trip.settings?.abroad === false) return false;
  return prefs.filter((p) => p.abroad === "yes" || p.abroad === "maybe").length >= prefs.length / 2;
}

export function rankCandidates(trip: Trip, prefs: Preference[], cands: Candidate[]): TripOption[] {
  const byMember = new Map(prefs.map((p) => [p.member, p]));
  const scored = cands.map((c) => {
    const fit: Record<string, MemberFit> = {};
    const win = trip.date_windows.find((w) => w.id === c.window_id);
    for (const m of trip.members) fit[m] = scoreMember(c, m, byMember.get(m), win);
    const fits = Object.values(fit);
    const noCount = fits.filter((f) => f.level === "no").length;
    const avg = fits.reduce((s, f) => s + f.score, 0) / fits.length;
    // Someone already had this place in mind: credit them, and use it as a small tie-break.
    const suggested_by = prefs.filter((p) => (p.places ?? []).some((pl) => samePlace(pl, c.destination) || samePlace(pl, c.region))).map((p) => p.member);
    return { c: { ...c, suggested_by }, fit, noCount, group_score: Math.round(Math.max(0, avg - noCount * 25 + (suggested_by.length ? 5 : 0))) };
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
  // If the group is open to going abroad, make sure one of the three is abroad (the best one),
  // so it's on the table even when someone would rather stay in India. Their row says why.
  if (abroadOpen(trip, prefs) && top.length === 3 && !top.some((t) => t.c.international)) {
    const best = scored.find((x) => x.c.international && !seen.has(baseName(x.c.destination)));
    if (best) top[2] = best;
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
  const noFlights = wontDo.includes("flights") && (!place.intl || place.byLand);
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
  if (wontDo.includes("flights") && place.intl && !place.byLand) return "Needs a flight";
  if (wontDo.includes("hot weather") && (place.tags.includes("desert") || (place.lat < 20 && place.lat > -10 && !place.tags.includes("mountains")))) return "Hot weather";
  if (wontDo.includes("high altitude") && place.tags.includes("mountains") && place.lat > 27) return "High altitude";
  if (wontDo.includes("very touristy spots") && ["Goa (North)", "Manali", "Dubai", "Phuket & Krabi", "Bali"].includes(place.name)) return "Very touristy";
  return null;
}

const STAY_COST = { budget: 0.75, boutique: 1, comfort: 1.4 } as const;

export function estimateFor(place: Place, pref: Preference, nights: number): MemberEstimate {
  const t = travelFor(pref, place, pref.wont_do);
  const stay = nights * place.perNight * STAY_COST[pref.stay ?? "boutique"];
  return {
    cost_min: Math.round((t.cost + stay * 0.8) / 500) * 500,
    cost_max: Math.round((t.cost * 1.25 + stay * 1.2) / 500) * 500,
    travel: t.mode === "local" ? "Local" : `~${t.hours}h ${t.mode}`,
    conflict: conflictFor(place, pref.wont_do, t.hours, t.mode),
  };
}

export function rulesCandidates(trip: Trip, prefs: Preference[]): Candidate[] {
  const windows = windowCoverage(trip, prefs).slice(0, 2);
  // Only consider going abroad if at least half the group is open to it.
  const openAbroad = abroadOpen(trip, prefs);
  const out: Candidate[] = [];
  for (const { window } of windows) {
    const nights = groupNights(prefs, windowNights(window.start, window.end));
    for (const place of PLACES.filter((p) => !p.intl || openAbroad)) {
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
        international: !!place.intl,
        visa: !!place.visa,
        has: featuresOf(place),
        lat: place.lat,
        lon: place.lon,
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
