// TRIGGER: the organiser creates a trip and gets one shareable link.
import { getStore } from "@/lib/store";
import { fail, json, newId } from "@/lib/view";
import type { DateWindow, Trip } from "@/lib/types";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return fail("Invalid request");

  const name = String(b.name ?? "").trim().slice(0, 80);
  const organiser = String(b.organiser ?? "").trim().slice(0, 40);
  const members: string[] = Array.from(
    new Set<string>((Array.isArray(b.members) ? b.members : []).map((m: unknown) => String(m).trim().slice(0, 40)).filter(Boolean))
  );
  if (organiser && !members.includes(organiser)) members.unshift(organiser);

  const windows: DateWindow[] = (Array.isArray(b.date_windows) ? b.date_windows : [])
    .filter((w: any) => w?.start && w?.end && w.end >= w.start)
    .slice(0, 6)
    .map((w: any, i: number) => ({
      id: `w${i + 1}`,
      label: String(w.label || `Option ${i + 1}`).slice(0, 40),
      start: String(w.start).slice(0, 10),
      end: String(w.end).slice(0, 10),
    }));

  if (!name) return fail("Give the trip a name");
  if (!organiser) return fail("Add your name");
  if (members.length < 2 || members.length > 12) return fail("Add 2 to 12 people");
  if (!windows.length) return fail("Add at least one date window");
  const deadline = new Date(b.deadline || Date.now() + 2 * 86400000);
  if (isNaN(deadline.getTime())) return fail("Invalid deadline");

  const trip: Trip = {
    id: newId(8),
    name,
    organiser,
    members,
    date_windows: windows,
    deadline: deadline.toISOString(),
    admin_token: newId(16),
    status: "collecting",
    decided_option_id: null,
    created_at: new Date().toISOString(),
  };
  await getStore().createTrip(trip);
  return json({ id: trip.id, admin_token: trip.admin_token });
}
