// HUMAN DECISION: each person marks each option "I'm in" or "Can't do".
// When everyone is in on one option, it locks - no more changing minds the next day.
import { getStore } from "@/lib/store";
import { fail, json } from "@/lib/view";
import { canLock } from "@/lib/engine";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const trip = await store.getTrip(id);
  if (!trip) return fail("Trip not found", 404);
  if (trip.status === "decided") return fail("This trip is locked in already", 409);
  if (trip.status !== "options") return fail("Options aren't ready yet", 409);

  const b = await req.json().catch(() => null);
  const member = String(b?.member ?? "");
  if (!trip.members.includes(member)) return fail("Pick your name first");
  const pref = (await store.getPreferences(id)).find((p) => p.member === member);
  // The edit token proves who you are, so only people who answered can vote.
  // Late joiners add their answers first (the preferences route allows that for them).
  if (!pref) return fail("Add your answers first, then you can vote", 403);
  if (pref.edit_token !== b.edit_token) return fail("You can only vote as yourself", 403);

  const options = await store.getOptions(id);
  if (!options.some((o) => o.id === b.option_id)) return fail("Unknown option");
  if (b.vote !== "in" && b.vote !== "cant") return fail("Vote must be in or cant");

  await store.upsertVote({ trip_id: id, member, option_id: b.option_id, vote: b.vote, updated_at: new Date().toISOString() });

  const votes = await store.getVotes(id);
  if (canLock(trip, votes, b.option_id, false)) {
    await store.updateTrip(id, { status: "decided", decided_option_id: b.option_id });
    return json({ ok: true, locked: true });
  }
  return json({ ok: true, locked: false });
}
