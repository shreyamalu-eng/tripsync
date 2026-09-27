// What the browser is allowed to see. This is the privacy boundary:
// budgets, won't-dos and other people's cost estimates never leave the server.

import crypto from "crypto";
import { getStore } from "./store";
import { tally, windowCoverage } from "./engine";
import type { Preference, Trip } from "./types";

export const newId = (n = 8) => crypto.randomBytes(n).toString("base64url").slice(0, n);
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
export const fail = (msg: string, status = 400) => json({ error: msg }, status);

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
      summary: o.summary,
      why: o.why,
      tags: o.tags,
      group_score: o.group_score,
      image: o.image ?? null,
      works_count: Object.values(o.fit).filter((f) => f.level === "works").length,
      no_count: Object.values(o.fit).filter((f) => f.level === "no").length,
      source: o.source,
      // Levels + neutral reasons for everyone; the private detail only for the viewer's own row.
      fit: Object.fromEntries(
        Object.entries(o.fit).map(([m, f]) => [
          m,
          { level: f.level, score: f.score, reasons: f.reasons, ...(mine?.member === m ? { mine: f.mine ?? [] } : {}) },
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
