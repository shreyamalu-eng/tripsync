// Read the trip as the current viewer is allowed to see it.
import { getStore } from "@/lib/store";
import { fail, json, publicState } from "@/lib/view";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const trip = await getStore().getTrip(id);
  if (!trip) return fail("Trip not found", 404);
  const u = new URL(req.url);
  return json(
    await publicState(trip, {
      member: u.searchParams.get("member"),
      token: u.searchParams.get("token"),
      admin: u.searchParams.get("admin"),
    })
  );
}
