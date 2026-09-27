// What the browser is allowed to see. This is the privacy boundary:
// budgets, won't-dos and other people's cost estimates never leave the server.

import crypto from "crypto";
import { getStore } from "./store";
import { tally, windowCoverage } from "./engine";
import { findCity } from "./cities";
import { publicText } from "./gemini";
import type { Preference, Trip } from "./types";

export const newId = (n = 8) => crypto.randomBytes(n).toString("base64url").slice(0, n);
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
export const fail = (msg: string, status = 400) => json({ error: msg }, status);

function groupRange(est: Record<string, { cost_min: number; cost_max: number }>) {
  const v = Object.values(est ?? {}).filter((e) => e && Number.isFinite(e.cost_min));
  return v.length ? { min: Math.min(...v.map((e) => e.cost_min)), max: Math.max(...v.map((e) => e.cost_max)) } : null;
}

function originsFor(prefs: Preference[]) {
  const seen = new Map<string, { city: string; lat: number; lon: number }>();
  for (const p of prefs) {
    const c = findCity(p.origin_city);
    // City-level coordinates only (never someone's exact location).
    const lat = c?.lat ?? (p.origin_lat != null ? Math.round(p.origin_lat * 10) / 10 : null);
    const lon = c?.lon ?? (p.origin_lon != null ? Math.round(p.origin_lon * 10) / 10 : null);
    if (lat != null && lon != null && !seen.has(p.origin_city.toLowerCase())) seen.set(p.origin_city.toLowerCase(), { city: p.origin_city, lat, lon });
  }
  return [...seen.values()];
}

export function allSubmitted(trip: Trip, prefs: Preference[]) {
  return trip.members.every((m) => prefs.some((p) => p.member === m));
}

export async function publicState(trip: Trip, who?: { member?: string | null; token?: string | null; admin?: string | null }) {
  const store = getStore();
  const [prefs, options, votes] = await Promise.all([
    store.getPreferences(trip.id),
    store.getOptions(trip.id),
    store.getVotes(trip.id),
  ]);
  const mine =
    who?.member && who?.token ? prefs.find((p) => p.member === who.member && p.edit_token === who.token) : undefined;
  const isAdmin = !!who?.admin && who.admin === trip.admin_token;
  const deadlinePassed = new Date(trip.deadline).getTime() < Date.now();

  return {
    trip: {
      id: trip.id,
      name: trip.name,
      organiser: trip.organiser,
      members: trip.members,
      date_windows: trip.date_windows,
      deadline: trip.deadline,
      status: trip.status,
      decided_option_id: trip.decided_option_id,
      abroad: trip.settings?.abroad !== false, // older trips (no setting) keep asking
    },
    submitted: trip.members.map((m) => ({ name: m, done: prefs.some((p) => p.member === m) })),
    all_submitted: allSubmitted(trip, prefs),
    deadline_passed: deadlinePassed,
    date_coverage: windowCoverage(trip, prefs).map((c) => ({ window_id: c.window.id, free: c.available, maybe: c.maybe })),
    options: options.map((o) => ({
      id: o.id,
      rank: o.rank,
      destination: o.destination,
      region: o.region,
      window_id: o.window_id,
      nights: o.nights,
      // Shared text never talks money (also cleans options saved before this rule existed).
      summary: publicText(o.summary, 160),
      why: publicText(o.why, 300),
      tags: o.tags,
      group_score: o.group_score,
      image: o.image ?? null,
      works_count: Object.values(o.fit).filter((f) => f.level === "works").length,
      no_count: Object.values(o.fit).filter((f) => f.level === "no").length,
      source: o.source,
      international: !!o.international,
      visa: !!o.visa,
      suggested_by: o.suggested_by ?? [],
      lat: o.lat ?? null,
      lon: o.lon ?? null,
      season: o.season ? publicText(o.season, 140) || null : null,
      // Group cost range (lowest to highest estimate across people): safe, nobody's own number.
      cost_range: groupRange(o.estimates),
      // Home cities for the "getting there" map: city names only, never who lives where.
      origins: originsFor(prefs),
      // Levels + neutral reasons for everyone; the private detail only for the viewer's own row.
      fit: Object.fromEntries(
        Object.entries(o.fit).map(([m, f]) => [
          m,
          { level: f.level, score: f.score, reasons: f.reasons, short: f.short, ...(mine?.member === m ? { mine: f.mine ?? [] } : {}) },
        ])
      ),
      my_estimate: mine ? o.estimates[mine.member] ?? null : null,
      votes: tally(trip, votes, o.id),
    })),
    me: mine
      ? {
          member: mine.member,
          origin_city: mine.origin_city,
          origin_lat: mine.origin_lat ?? null,
          origin_lon: mine.origin_lon ?? null,
          maybe_windows: mine.maybe_windows ?? [],
          updated_at: mine.updated_at,
          budget_max: mine.budget_max,
          available_windows: mine.available_windows,
          trip_nights: mine.trip_nights,
          destination_types: mine.destination_types,
          wont_do: mine.wont_do,
          abroad: mine.abroad ?? "no",
          styles: mine.styles ?? [],
          must_haves: mine.must_haves ?? [],
          places: mine.places ?? [],
          budget_min: mine.budget_min ?? null,
          pace: mine.pace ?? null,
          stay: mine.stay ?? null,
          passport: !!mine.passport,
          notes: mine.notes,
          my_votes: Object.fromEntries(votes.filter((v) => v.member === mine.member).map((v) => [v.option_id, v.vote])),
        }
      : null,
    is_admin: isAdmin,
    storage: store.kind,
  };
}

// Wrap a route so a crash returns a readable JSON error instead of a blank 500.
// Database messages (e.g. "Invalid API key") are safe to show and make setup problems obvious.
export function safe<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (e) {
      const msg = (e as Error)?.message ?? "Unknown error";
      console.error("[api]", msg);
      return fail(msg.startsWith("Database error") ? msg : "Server error. Please try again.", 500);
    }
  };
}
