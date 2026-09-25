# TripSync

Everyone submits trip preferences through one link. You get the three trip options that work best for the whole group, with where each person stands, and the group locks one in.

Why it's built this way (Nine Checks, The Cut, components map, workflow): see **BUILD_PLAN.md**.
Why it looks and flows the way it does (touchpoints, click budget, what we took from the sample app): see **UX_REVIEW.md**.

## What's in the redesign
- **Organiser setup on one screen:** names as chips, a range calendar (tap the first day, then the last), public holidays marked, one-tap long-weekend suggestions showing leave days, and deadline chips.
- **Share on WhatsApp** straight after creating. The organiser then goes directly into her own answers.
- **Friend form in 3 steps, ~10 taps, no typing:** ✓ / Maybe / ✕ on each date card; city via *Use my location* (nearest city is worked out on the phone, no API key), popular-city chips or autocomplete (150+ Indian cities stored in the app, plus an OpenStreetMap search as backup); budget and nights as presets; icon tiles for vibe; deal-breaker chips. Answers autosave on the device.
- **Waiting room:** progress ring, avatars, a *Nudge on WhatsApp* message that names only the people still pending, and a date heat-bar.
- **Decision screen:** a "Where everyone stands" matrix, photo cards (Wikipedia photo or an illustration) with *your* cost and travel, and big I'm in / Can't do buttons.
- **Decided:** Add to calendar (.ics) and Tell the group.

## Run it on your laptop (5 min, no accounts needed)
```bash
npm install
npm run dev
```
Open http://localhost:3000. With no keys it runs in **local test mode**: answers are saved to `.data/db.json`, and options come from the rules-only planner. To test as 5 people, open the trip link in 5 different browser profiles or incognito windows.

## Connect the real services

### 1. Gemini key (free)
aistudio.google.com → **Get API key** → Create key → copy it.

### 2. Supabase (free)
1. supabase.com → New project.
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. It's safe to re-run: the `alter table … add column if not exists` lines at the bottom upgrade tables created by the first version.
3. **Project Settings → API**: copy the **Project URL** and the **secret key** (`sb_secret_…`, or the older `service_role` key).

### 3. `.env.local`
Copy `.env.example` to `.env.local` and fill it in:
```
GEMINI_API_KEY=...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```
Restart `npm run dev`. The "local test mode" label disappears once Supabase is connected.

## Push to GitHub
In Claude Code: *"Connect this project to GitHub and push my code."*
Check first that `.env.local` is **not** in the list of files being pushed. It's already covered by `.gitignore`.

## Deploy on Vercel
1. vercel.com → Sign in with GitHub → **Add New → Project** → import the repo.
2. **Environment Variables**: add the same 3 keys: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
3. **Deploy**. Open the URL on your phone.

Every later push to GitHub redeploys automatically.

## Test checklist (test the purpose, not just "does it load")
- [ ] Create a trip with 5 names and 3 date windows.
- [ ] 4 people answer → options are still locked, and the page shows who's pending.
- [ ] Someone else tries to answer as "Riya" from another device → blocked.
- [ ] 5th person answers → 3 options appear automatically.
- [ ] Search the page for a budget number → it's nowhere (you only see your own estimate).
- [ ] All 5 tap "I'm in" on one option → "It's decided" appears and votes stop.
- [ ] On a phone: tap *Use my location* → your city fills in. Tap a long-weekend suggestion → it appears in the list with its leave-day count.
- [ ] Close the tab halfway through the form, reopen the link → your answers are still there.
