// CONTEXT + PROCESSING + AI: turn everyone's preferences into the top 3 options.
// Gate: runs when everyone has submitted - or, after the deadline, when the organiser forces it.
import { getStore } from "@/lib/store";
import { allSubmitted, fail, json, safe } from "@/lib/view";
import { rankCandidates, rulesCandidates, type Candidate } from "@/lib/engine";
import { geminiCandidates } from "@/lib/gemini";
import { destinationImage } from "@/lib/images";

export const maxDuration = 60;

async function handle(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const trip = await store.getTrip(id);
  if (!trip) return fail("Trip not found", 404);
  if (trip.status !== "collecting" && trip.status !== "reopened") return fail("Options already generated", 409);

  const b = await req.json().catch(() => ({}));
  const prefs = await store.getPreferences(id);
  const isAdmin = b?.admin_token && b.admin_token === trip.admin_token;
  const deadlinePassed = new Date(trip.deadline).getTime() < Date.now();

  // After a reopen, only the organiser rebuilds (so the first edit doesn't instantly regenerate).
  if (trip.status === "reopened" && !isAdmin) return fail("Waiting for the organiser to rebuild the options", 409);
  if (trip.status === "reopened" && prefs.length < 2) return fail("Need at least 2 people's preferences", 409);
  if (trip.status === "collecting" && !allSubmitted(trip, prefs)) {
    if (!isAdmin) return fail("Waiting for everyone to submit", 409);
    if (!deadlinePassed) return fail("Deadline hasn't passed yet", 409);
    if (prefs.length < 2) return fail("Need at least 2 people's preferences", 409);
  }

  let cands: Candidate[] = [];
  let note: string | null = null;
  try {
    cands = await geminiCandidates(trip, prefs);
  } catch (e) {
    console.error("[generate] AI unavailable, using rules planner:", (e as Error).message);
    note = "ai_unavailable";
    cands = rulesCandidates(trip, prefs);
  }
  const ranked = rankCandidates(trip, prefs, cands);
  // Photos are a nice-to-have: fetched in parallel, never allowed to block or break generation.
  const images = await Promise.all(ranked.map((o) => destinationImage(o.destination, o.region).catch(() => null)));
  const options = ranked.map((o, i) => ({ ...o, image: images[i] }));

  // Another tab may have generated while we were waiting on the AI. First one wins.
  const fresh = await store.getTrip(id);
  if (fresh?.status !== "collecting" && fresh?.status !== "reopened") return json({ ok: true, source: options[0]?.source, note: "already generated" });

  await store.clearVotes(id);
  await store.replaceOptions(id, options);
  await store.updateTrip(id, { status: "options" });
  return json({ ok: true, source: options[0]?.source, note });
}

export const POST = safe(handle);
