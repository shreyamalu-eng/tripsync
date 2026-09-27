// INPUT: each person submits (or edits) their private preferences.
import { getStore } from "@/lib/store";
import { fail, json, newId, safe } from "@/lib/view";
import { DESTINATION_TYPES, MUST_HAVES, TRIP_STYLES, WONT_DO_OPTIONS, type Preference } from "@/lib/types";

const pickFrom = (list: readonly string[], v: unknown) =>
  [...new Set((Array.isArray(v) ? v : []).filter((t): t is string => list.includes(t)))];

async function handle(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const trip = await store.getTrip(id);
  if (!trip) return fail("Trip not found", 404);
  if (trip.status === "decided") return fail("This trip is locked in already", 409);

  const b = await req.json().catch(() => null);
  if (!b) return fail("Invalid request");
  const member = String(b.member ?? "");
  if (!trip.members.includes(member)) return fail("Pick your name from the list");

  const existing = (await store.getPreferences(id)).find((p) => p.member === member);
  // Once options are out, answers are locked. Someone who never answered may still join late so they can vote.
  if (trip.status === "options" && existing)
    return fail("Options are already out, so preferences are locked. Use the vote instead.", 409);
  if (existing && existing.edit_token !== b.edit_token)
    return fail(`${member} has already submitted from another device. Ask ${trip.organiser} if this is a mistake.`, 403);

  // Anyone can suggest extra dates while answers are open. They join the shared list so the
  // whole group can answer them, and count as "Can go" for the person who suggested them.
  const suggestedIds: string[] = [];
  if (Array.isArray(b.new_windows) && b.new_windows.length && (trip.status === "collecting" || trip.status === "reopened")) {
    const fresh = (await store.getTrip(id)) ?? trip; // re-read so two people suggesting at once don't clobber each other
    const windows = [...fresh.date_windows];
    const today = new Date().toISOString().slice(0, 10);
    let next = Math.max(0, ...windows.map((w) => Number(w.id.slice(1)) || 0)) + 1;
    for (const w of b.new_windows as any[]) {
      if (windows.length >= 6) break;
      const start = String(w?.start ?? "").slice(0, 10);
      const end = String(w?.end ?? "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start || end < today) continue;
      const dup = windows.find((x) => x.start === start && x.end === end);
      if (dup) { suggestedIds.push(dup.id); continue; }
      const win = { id: `w${next++}`, label: String(w.label || "Suggested dates").slice(0, 40), start, end, added_by: member, added_at: new Date().toISOString() };
      windows.push(win);
      suggestedIds.push(win.id);
    }
    if (windows.length !== fresh.date_windows.length) {
      await store.updateTrip(id, { date_windows: windows });
      trip.date_windows = windows;
    }
  }

  const windowIds = new Set(trip.date_windows.map((w) => w.id));
  const available: string[] = [
    ...new Set([...(Array.isArray(b.available_windows) ? b.available_windows : []), ...suggestedIds]),
  ].filter((w: string) => windowIds.has(w));
  const maybe: string[] = (Array.isArray(b.maybe_windows) ? b.maybe_windows : []).filter(
    (w: string) => windowIds.has(w) && !available.includes(w)
  );
  const lat = Number(b.origin_lat);
  const lon = Number(b.origin_lon);
  const hasCoords = b.origin_lat != null && b.origin_lon != null && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const budget = Math.round(Number(b.budget_max));
  const nights = Math.round(Number(b.trip_nights));
  const origin = String(b.origin_city ?? "").trim().slice(0, 40);

  if (!origin) return fail("Which city will you travel from?");
  if (!Number.isFinite(budget) || budget < 2000 || budget > 500000) return fail("Enter a budget between ₹2,000 and ₹5,00,000");
  if (!Number.isFinite(nights) || nights < 1 || nights > 14) return fail("Trip length should be 1 to 14 nights");

  const pref: Preference = {
    trip_id: id,
    member,
    edit_token: existing?.edit_token ?? newId(16),
    origin_city: origin,
    origin_lat: hasCoords ? lat : null,
    origin_lon: hasCoords ? lon : null,
    budget_max: budget,
    available_windows: available,
    maybe_windows: maybe,
    trip_nights: nights,
    destination_types: pickFrom(DESTINATION_TYPES, b.destination_types),
    wont_do: pickFrom(WONT_DO_OPTIONS, b.wont_do),
    styles: pickFrom(TRIP_STYLES, b.styles),
    must_haves: pickFrom(MUST_HAVES, b.must_haves),
    abroad: b.abroad === "yes" || b.abroad === "maybe" ? b.abroad : "no",
    // Places people already have in mind: short, plain names only (no ":" so storage stays unambiguous).
    places: [...new Set((Array.isArray(b.places) ? b.places : [])
      .map((x: unknown) => String(x).replace(/[:<>]/g, "").trim().slice(0, 40)).filter(Boolean))].slice(0, 3) as string[],
    notes: String(b.notes ?? "").slice(0, 300),
    updated_at: new Date().toISOString(),
  };
  await store.upsertPreference(pref);
  return json({ edit_token: pref.edit_token });
}

export const POST = safe(handle);
