// AI layer (API). Gemini's only job: propose candidate destinations that fit the
// group and estimate travel/cost per person. It does NOT rank or decide -
// ranking is done by lib/engine.ts, the decision is made by the group.

import { windowCoverage, windowNights, groupNights, type Candidate } from "./engine";
import { DESTINATION_TYPES, MUST_HAVES, TRIP_STYLES, type MemberEstimate, type Preference, type Trip } from "./types";

const API = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM = `You are a trip-planning analyst for a group of friends in India.
You receive each person's private constraints and return candidate trips as JSON.
Rules:
- Propose exactly 6 distinct destinations. Prefer places reachable within the group's budgets from their home cities.
- Use only the date window ids you are given. Prefer windows where the most people are free ("maybe" counts as half).
- For EVERY person, estimate an all-in per-person cost range in INR (return travel from their city + stay + food + local transport, mid-range) and the one-way travel mode/time.
- Respect "won't do" items. If a destination still clashes with one, set "conflict" to a short neutral phrase (e.g. "Long journey"), otherwise null. Never mention anyone's budget amount.
- Going abroad: each person says "abroad": yes, maybe or no. Only if at least half the group says yes or maybe,
  include 1-2 short-haul international destinations (e.g. Thailand, Sri Lanka, Nepal, Bhutan, Vietnam, Bali, Dubai,
  Maldives) that fit the budgets. Mark them "international": true, and "visa": true if an Indian passport holder must
  arrange a visa or e-visa before travelling (visa-free or visa on arrival = false). Everything else in India.
- "places_in_mind" are places people already want to go. Include each one that is realistic for the dates and budgets.
- "styles" is the kind of trip each person wants (relaxed, party, sightseeing, ...). Balance the group, not the majority.
- "has": which of the group's must-haves the place clearly offers, chosen only from: ${MUST_HAVES.join(", ")}.
- Be realistic. Do not invent festivals, prices you are unsure of, or bookings. These are estimates.
- tags must come from: ${[...DESTINATION_TYPES, ...TRIP_STYLES].join(", ")}.
Return ONLY JSON of the form:
{"candidates":[{"destination":"","region":"","window_id":"","nights":3,"summary":"one line","why":"one or two lines on why it suits this group","tags":[""],
"international":false,"visa":false,"has":[""],
"estimates":{"<person name>":{"cost_min":0,"cost_max":0,"travel":"~2h flight","conflict":null}}}]}`;

function brief(trip: Trip, prefs: Preference[]) {
  const cov = windowCoverage(trip, prefs);
  const maxN = Math.max(...trip.date_windows.map((w) => windowNights(w.start, w.end)));
  return JSON.stringify(
    {
      trip: trip.name,
      suggested_nights: groupNights(prefs, maxN),
      date_windows: cov.map((c) => ({
        ...c.window,
        nights_available: windowNights(c.window.start, c.window.end),
        free: c.available,
        maybe: c.maybe,
      })),
      people: prefs.map((p) => ({
        name: p.member,
        home_city: p.origin_city,
        home_coords: p.origin_lat != null ? [p.origin_lat, p.origin_lon] : undefined,
        max_budget_inr_per_person: p.budget_max,
        preferred_nights: p.trip_nights,
        wants: p.destination_types,
        styles: p.styles?.length ? p.styles : undefined,
        must_haves: p.must_haves?.length ? p.must_haves : undefined,
        abroad: p.abroad ?? "no",
        places_in_mind: p.places?.length ? p.places : undefined,
        wont_do: p.wont_do,
        notes: p.notes || undefined,
      })),
    },
    null,
    1
  );
}

async function resolveModel(key: string): Promise<string> {
  // Model names change often. Ask the API which flash model is available.
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) throw new Error(`Gemini models list failed (${r.status})`);
  const j = await r.json();
  const names: string[] = (j.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m: any) => String(m.name).replace("models/", ""));
  const flash = names.filter((n) => n.includes("flash") && !n.includes("image") && !n.includes("tts") && !n.includes("live"));
  if (!flash.length) throw new Error("No Gemini flash model available for this key");
  return flash.find((n) => n.includes("latest")) ?? flash[flash.length - 1];
}

async function callGemini(key: string, model: string, userText: string, ms: number) {
  return fetch(`${API}/models/${model}:generateContent`, {
    signal: AbortSignal.timeout(ms),
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
}

// Models sometimes wrap the JSON in ``` fences, add text after it, or return a bare list.
// Take the first complete JSON object or array.
function firstJson(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start < 0) throw new Error("Gemini returned no JSON");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if ((c === "}" || c === "]") && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("Gemini returned incomplete JSON");
}

// Accept {"candidates":[...]}, a bare [...], or an object with any one list of candidates in it.
function candidateList(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.candidates)) return raw.candidates;
  const lists = Object.values(raw ?? {}).filter(Array.isArray) as any[][];
  return lists.find((l) => l.some((c) => c && typeof c.destination === "string")) ?? [];
}

function num(x: unknown, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

// Never trust model output blindly: validate every field before it reaches the database.
function clean(raw: any, trip: Trip, prefs: Preference[]): Candidate[] {
  const ids = new Set(trip.date_windows.map((w) => w.id));
  const list = candidateList(raw);
  return list
    .filter((c) => c && typeof c.destination === "string" && ids.has(c.window_id))
    .map((c) => {
      const estimates: Record<string, MemberEstimate> = {};
      for (const p of prefs) {
        const e = c.estimates?.[p.member];
        if (!e) continue;
        const lo = num(e.cost_min);
        const hi = Math.max(lo, num(e.cost_max, lo));
        estimates[p.member] = {
          cost_min: lo,
          cost_max: hi,
          travel: String(e.travel ?? "").slice(0, 40),
          conflict: e.conflict ? String(e.conflict).slice(0, 60) : null,
        };
      }
      return {
        destination: c.destination.slice(0, 60),
        region: String(c.region ?? "").slice(0, 60),
        window_id: c.window_id,
        nights: Math.max(1, num(c.nights, 3)),
        summary: String(c.summary ?? "").slice(0, 160),
        why: String(c.why ?? "").slice(0, 300),
        tags: (Array.isArray(c.tags) ? c.tags : []).map(String)
          .filter((t: string) => (DESTINATION_TYPES as readonly string[]).includes(t) || (TRIP_STYLES as readonly string[]).includes(t)).slice(0, 6),
        estimates,
        source: "gemini" as const,
        international: c.international === true,
        visa: c.international === true && c.visa === true,
        has: Array.isArray(c.has) ? c.has.filter((h: string) => (MUST_HAVES as readonly string[]).includes(h)) : undefined,
      };
    });
}

export async function geminiCandidates(trip: Trip, prefs: Preference[]): Promise<Candidate[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  // Gemini models get overloaded ("high demand", 503) or slow at busy times. Try a few Flash models
  // in turn within a 45s budget, so AI + photos stay under Vercel's 60s limit. If all fail, the
  // caller falls back to the rules planner.
  const models = [...new Set([process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"])];
  const until = Date.now() + 45000;
  const prompt = brief(trip, prefs);
  let res: Response | null = null;
  let lastErr = "";
  for (let model of models) {
    const left = until - Date.now();
    if (left < 4000) break;
    try {
      res = await callGemini(key, model, prompt, Math.min(20000, left));
      if (res.status === 404) {
        model = await resolveModel(key);
        res = await callGemini(key, model, prompt, Math.min(20000, until - Date.now()));
      }
      if (res.ok) break;
      lastErr = `${model} returned ${res.status}`;
    } catch (e) {
      lastErr = `${model}: ${(e as Error).message}`;
      res = null;
    }
    console.warn(`[gemini] ${lastErr}, trying the next model`);
  }
  if (!res) throw new Error(`Gemini unavailable (${lastErr})`);
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  const parsed = firstJson(text);
  let out = clean(parsed, trip, prefs);
  // Enforce the abroad rule even if the model ignores it.
  const openAbroad = prefs.filter((p) => p.abroad === "yes" || p.abroad === "maybe").length >= prefs.length / 2;
  if (!openAbroad) out = out.filter((c) => !c.international);
  if (out.length < 3) {
    const raw = candidateList(parsed);
    throw new Error(`Gemini returned too few usable options (${out.length} of ${raw.length}; windows ${JSON.stringify(raw.map((c: any) => c?.window_id)).slice(0, 80)})`);
  }
  return out;
}
