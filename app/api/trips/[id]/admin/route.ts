// Organiser-only actions. The organiser runs the process; she does not own the decision.
//  - lock: only if a majority is in and nobody said "can't do"
//  - reopen: clear options + votes so people can edit preferences again
import { getStore } from "@/lib/store";
import { fail, json } from "@/lib/view";
import { canLock } from "@/lib/engine";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const trip = await store.getTrip(id);
  if (!trip) return fail("Trip not found", 404);
  const b = await req.json().catch(() => null);
  if (!b?.admin_token || b.admin_token !== trip.admin_token) return fail("Organiser only", 403);

  if (b.action === "lock") {
    if (trip.status !== "options") return fail("Nothing to lock", 409);
    const votes = await store.getVotes(id);
    if (!canLock(trip, votes, b.option_id, true))
      return fail("Can only lock when most people are in and nobody has said they can't", 409);
    await store.updateTrip(id, { status: "decided", decided_option_id: b.option_id });
    return json({ ok: true });
  }
  if (b.action === "reopen") {
    if (trip.status === "decided") return fail("The trip is locked. Decisions don't get undone the next day.", 409);
    await store.clearVotes(id);
    await store.replaceOptions(id, []);
    await store.updateTrip(id, { status: "reopened", decided_option_id: null });
    return json({ ok: true });
  }
  return fail("Unknown action");
}
