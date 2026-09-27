"use client";
// "Getting to X" map: everyone's home city (city names only) with a dashed line to the destination.
// Leaflet with OpenStreetMap tiles (softened in CSS): plain images, no API key, works on every browser.
// Loaded only in the browser, only when shown.
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Pt = { city: string; lat: number; lon: number };

// Cities close together (Mumbai and Pune) share one label so pins don't sit on top of each other.
function cluster(points: Pt[], km = 350): Pt[] {
  const out: (Pt & { n: number })[] = [];
  for (const p of points) {
    const near = out.find((o) => Math.hypot((o.lat - p.lat) * 111, (o.lon - p.lon) * 111 * Math.cos((p.lat * Math.PI) / 180)) < km);
    if (near) { near.city += ` · ${p.city}`; near.lat = (near.lat * near.n + p.lat) / (near.n + 1); near.lon = (near.lon * near.n + p.lon) / (near.n + 1); near.n++; }
    else out.push({ ...p, n: 1 });
  }
  return out;
}

export default function TripMap({ dest, origins }: { dest: { name: string; lat: number; lon: number }; origins: Pt[] }) {
  const box = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([dest, origins]);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current) return;
      const from = cluster(origins.filter((o) => Math.abs(o.lat - dest.lat) + Math.abs(o.lon - dest.lon) > 0.05));
      map = L.map(box.current, { zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 12,
        className: "soft-tiles",
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const pin = (text: string, cls: string) =>
        L.divIcon({ className: "", html: `<div class="map-pin ${cls}">${text.replace(/[<>&]/g, "")}</div>`, iconSize: [0, 0], iconAnchor: [0, 0] });
      for (const o of from) {
        L.polyline([[o.lat, o.lon], [dest.lat, dest.lon]], { color: "#1a3a2a", weight: 2.5, dashArray: "6 7", opacity: 0.75 }).addTo(map);
        L.circleMarker([o.lat, o.lon], { radius: 4, color: "#fff", weight: 2, fillColor: "#1a3a2a", fillOpacity: 1 }).addTo(map);
        L.marker([o.lat, o.lon], { icon: pin(o.city, "from"), interactive: false }).addTo(map);
      }
      L.circleMarker([dest.lat, dest.lon], { radius: 6, color: "#fff", weight: 2, fillColor: "#8fb82c", fillOpacity: 1 }).addTo(map);
      L.marker([dest.lat, dest.lon], { icon: pin(dest.name, "to"), interactive: false, zIndexOffset: 1000 }).addTo(map);

      const pts: [number, number][] = [[dest.lat, dest.lon], ...from.map((o) => [o.lat, o.lon] as [number, number])];
      if (pts.length > 1) map.fitBounds(pts, { padding: [46, 46], maxZoom: 7 });
      else map.setView([dest.lat, dest.lon], 6);
    })();
    return () => { cancelled = true; map?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={box} className="trip-map" role="img" aria-label={`Map of routes to ${dest.name}`} />;
}
