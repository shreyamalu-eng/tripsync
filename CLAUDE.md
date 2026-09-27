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
- `lib/store.ts`: Supabase, or a local JSON file when no keys are set
- `supabase/schema.sql`: run once in Supabase

## Rules that must not break
- Never send budgets, won't-dos, or other people's cost estimates to the browser.
- The app never picks the trip. It locks only when everyone is in (or the organiser locks with a majority in and zero "can't").
- Options unlock only when all members have answered, or when the organiser chooses to go ahead (at least 2 answers, any time).
- Anyone can suggest extra date windows (max 6 total) while answers are open. People who answered before a window was added count as "hasn't answered", not "can't".
- Keys only in `.env.local` / Vercel env vars. Never in code.
- The UX click budget: a friend goes from opening the link to submitting in about 10 taps with no typing. Don't add required text fields.
- After a reopen (`status: "reopened"`) only the organiser rebuilds options, so the first edit doesn't instantly regenerate them.
