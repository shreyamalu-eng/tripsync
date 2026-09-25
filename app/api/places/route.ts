// City search. The bundled Indian city list answers instantly; if it has too few
// matches we ask OpenStreetMap (Photon, free, no key) as a backup. Never required.
import { searchCities } from "@/lib/cities";
import { json } from "@/lib/view";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const local = searchCities(q, 6).map((c) => ({ name: c.name, state: c.state, lat: c.lat, lon: c.lon }));
  if (local.length >= 3 || q.length < 3) return json({ results: local });

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&osm_tag=place:city&osm_tag=place:town`,
      { signal: ctl.signal, headers: { "user-agent": "TripSync/1.0" } }
    );
    const j = await r.json();
    const remote = (j.features ?? [])
      .filter((f: any) => f.properties?.countrycode === "IN")
      .map((f: any) => ({
        name: f.properties.name,
        state: f.properties.state ?? "",
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }));
    const seen = new Set(local.map((c) => c.name));
    return json({ results: [...local, ...remote.filter((c: any) => !seen.has(c.name))].slice(0, 6) });
  } catch {
    return json({ results: local });
  } finally {
    clearTimeout(t);
  }
}
