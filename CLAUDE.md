# TripSync: notes for Claude

Group-trip decider: one link → private preferences → 3 ranked options with per-person fit → the group locks one in.

## Stack
Next.js 16 (App Router, TS) · Supabase (server-side only, RLS on) · Gemini Flash via REST · Vercel.

## Map
- `app/page.tsx`: create trip (organiser)
- `app/t/[id]/page.tsx`: the one shared link (share → identity → 3-step form → waiting → options → vote → decided)
- `components/`: `RangeCalendar` (range pick + holidays + long weekends), `NameChips`, `CityPicker` (GPS → nearest city, local search, OSM backup), `PrefWizard` (3 steps, autosave), `Options` (matrix + photo cards), `ui` (avatars, scenes, ring, toast)
- `lib/cities.ts`: bundled Indian cities + nearest-city / search (shared by browser and server)
- `lib/holidays.ts`: public holidays, long-weekend suggestions, leave-day maths
- `lib/images.ts`: Wikipedia destination photo (server, 3.5s timeout, optional)
- `app/api/places`: city search backup (Photon / OpenStreetMap, optional)
- `app/api/trips/...`: create, read, preferences, generate, vote, admin
- `lib/engine.ts`: rules: gate, date overlap, per-person scoring, ranking, lock
- `lib/gemini.ts`: the only AI call; proposes candidates + estimates, never ranks or decides
- `lib/catalogue.ts`: rules-only fallback destinations
- `lib/view.ts`: privacy boundary: what the browser may see
- `lib/store.ts`: Supabase, or a local JSON file when no keys are set. Newer preference fields (abroad, styles, must-haves, places) are packed into `destination_types` as prefixed entries, and newer option fields into `estimates["~meta"]`, so no migration was needed
- `lib/photos.ts`: curated Wikimedia photos for the landing page, trip banners and fallbacks
- `components/TripMap.tsx`: "Getting to X" map (Leaflet + OpenStreetMap tiles). Shows home *cities* only, never who lives where or exact locations
- `components/BudgetRange.tsx`: two-handle budget (comfortable → absolute max). No tier names
- `supabase/schema.sql`: run once in Supabase

## Rules that must not break
- Never send budgets, won't-dos, or other people's cost estimates to the browser.
- Text the whole group sees (summary, why, season) never mentions money: `publicText()` in `lib/gemini.ts` strips any such sentence.
- Abroad trips need the organiser's "Include trips abroad?" switch AND at least half the group open to it.
- Phone = one column; laptop (≥980px) = side-by-side layouts (`.landing`, `.wiz`, `.wait-grid`, `.overview`, 3-up `.opts-grid`).
- The app never picks the trip. It locks only when everyone is in (or the organiser locks with a majority in and zero "can't").
- Options unlock only when all members have answered, or when the organiser chooses to go ahead (at least 2 answers, any time).
- Going abroad is only suggested when at least half the group is open to it; then one of the three options is abroad. People who said "India only" see "Prefers India" on it.
- Every "Doesn't work" / "Stretch" shows a short public reason (`fit.short`). Budget and deal-breaker details stay in `fit.mine`, for that person only.
- Anyone can suggest extra date windows (max 6 total) while answers are open. People who answered before a window was added count as "hasn't answered", not "can't".
- Keys only in `.env.local` / Vercel env vars. Never in code.
- The UX click budget: a friend goes from opening the link to submitting in about 10 taps with no typing. Don't add required text fields.
- After a reopen (`status: "reopened"`) only the organiser rebuilds options, so the first edit doesn't instantly regenerate them.
