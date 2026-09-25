// INPUT: each person submits (or edits) their private preferences.
import { getStore } from "@/lib/store";
import { fail, json, newId } from "@/lib/view";
import { DESTINATION_TYPES, WONT_DO_OPTIONS, type Preference } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const trip = await store.getTrip(id);
  if (!trip) return fail("Trip not found", 404);
  if (trip.status !== "collecting" && trip.status !== "reopened")
    return fail("Options are already out, so preferences are locked. Use the vote instead.", 409);

  const b = await req.json().catch(() => null);
  if (!b) return fail("Invalid request");
  const member = String(b.member ?? "");
  if (!trip.members.includes(member)) return fail("Pick your name from the list");

  const existing = (await store.getPreferences(id)).find((p) => p.member === member);
  if (existing && existing.edit_token !== b.edit_token)
    return fail(`${member} has already submitted from another device. Ask ${trip.organiser} if this is a mistake.`, 403);

  const windowIds = new Set(trip.date_windows.map((w) => w.id));
  const available: string[] = (Array.isArray(b.available_windows) ? b.available_windows : []).filter((w: string) => windowIds.has(w));
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
    destination_types: (Array.isArray(b.destination_types) ? b.destination_types : []).filter((t: string) =>
      (DESTINATION_TYPES as readonly string[]).includes(t)
    ),
    wont_do: (Array.isArray(b.wont_do) ? b.wont_do : []).filter((t: string) =>
      (WONT_DO_OPTIONS as readonly string[]).includes(t)
    ),
    notes: String(b.notes ?? "").slice(0, 300),
    updated_at: new Date().toISOString(),
  };
  await store.upsertPreference(pref);
  return json({ edit_token: pref.edit_token });
}
