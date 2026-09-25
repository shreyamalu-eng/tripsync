"use client";
// Home city: one tap on "Use my location" or a popular city, or type 2 letters.
// Location → nearest city is computed on the device from the bundled city list (no API key).
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search, Loader2, Pencil } from "lucide-react";
import { POPULAR_CITIES, nearestCity, searchCities } from "@/lib/cities";

export type CityValue = { name: string; lat: number | null; lon: number | null; state?: string };
type Hit = { name: string; state: string; lat: number; lon: number };

export default function CityPicker({ value, onChange }: { value: CityValue | null; onChange: (v: CityValue | null) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!q.trim()) return setHits([]);
    const local = searchCities(q, 6);
    setHits(local);
    setActive(0);
    if (local.length >= 3 || q.trim().length < 3) return;
    // Backup: live map search for towns not in the bundled list.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (Array.isArray(j.results) && j.results.length) setHits(j.results);
      } catch {}
    }, 300);
  }, [q]);

  function pick(h: Hit | CityValue) {
    onChange({ name: h.name, lat: h.lat ?? null, lon: h.lon ?? null, state: (h as Hit).state });
    setQ("");
    setOpen(false);
  }

  function locate() {
    setGeoErr("");
    if (!navigator.geolocation) return setGeoErr("Location isn't available on this device. Pick a city below.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = nearestCity(pos.coords.latitude, pos.coords.longitude);
        onChange({ name: c.name, state: c.state, lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => { setLocating(false); setGeoErr("Couldn't get your location. Pick a city below."); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }

  if (value) {
    return (
      <div className="city-chosen">
        <MapPin size={18} />
        <div className="grow">
          {value.name}
          {value.state && <div className="tiny muted" style={{ fontWeight: 600 }}>{value.state}</div>}
        </div>
        <button type="button" className="btn sm ghost" onClick={() => onChange(null)}><Pencil size={14} /> Change</button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="btn soft block" onClick={locate} disabled={locating} style={{ marginBottom: 10 }}>
        {locating ? <Loader2 size={17} className="spin" /> : <LocateFixed size={17} />} {locating ? "Finding you…" : "Use my location"}
      </button>
      {geoErr && <p className="tiny" style={{ color: "var(--no)", marginBottom: 8 }}>{geoErr}</p>}
      <div className="city-box">
        <div style={{ position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: 15, color: "var(--muted)" }} />
          <input type="search" value={q} placeholder="Search your city" style={{ paddingLeft: 40 }} autoComplete="off"
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); if (hits[active]) pick(hits[active]); else if (q.trim()) pick({ name: q.trim(), lat: null, lon: null }); }
            }}
            aria-label="Search your city" />
        </div>
        {open && q.trim() && (
          <div className="city-list" role="listbox">
            {hits.map((h, i) => (
              <button type="button" key={h.name + h.lat} className={`city-item ${i === active ? "active" : ""}`} onMouseDown={() => pick(h)}>
                <MapPin size={16} color="var(--forest-2)" />
                <span><b>{h.name}</b><div className="st">{h.state}</div></span>
              </button>
            ))}
            {!hits.length && (
              <button type="button" className="city-item" onMouseDown={() => pick({ name: q.trim(), lat: null, lon: null })}>
                <MapPin size={16} /> Use “{q.trim()}”
              </button>
            )}
          </div>
        )}
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        {POPULAR_CITIES.map((c) => (
          <button type="button" key={c.name} className="chip" onClick={() => pick(c)}>{c.name}</button>
        ))}
      </div>
    </div>
  );
}
