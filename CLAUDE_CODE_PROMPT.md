# First prompt for Claude Code

Paste this into Claude Code in an empty project folder to build TripSync from scratch. If you're starting from the code already in this folder, use the shorter prompt at the bottom.

---

I am building **TripSync, a group-trip decider** for five college friends in different cities who can't agree on a trip through WhatsApp. The goal: everyone answers privately through ONE link in under a minute, the app shows the THREE options that work best for the whole group with where each person stands on each, and the group locks one in.

**Before writing any code, show me a plan** (files, database tables, API routes, screens) and wait for my OK.

Stack: Next.js (App Router, TypeScript), Supabase (database), Gemini API (Flash model), deployed on Vercel. Keys in `.env.local`: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY. Add `.env*` to `.gitignore` before anything else. The browser must never get any key; all database and AI calls happen on the server.

**UX rule:** a friend goes from opening the link to submitting in about 10 taps with no typing. Mobile-first. Light nature-green look with a lime accent for the main button, rounded cards, pill chips, destination photos.

Flow:
1. **Organiser setup (one screen):**
   - Her name, and friends' names as chips (Enter/comma or paste a list).
   - A **range calendar**: tap the first day, tap the last, and the days between fill in. Indian public holidays are marked, and **long-weekend suggestions** can be added with one tap, each showing how many leave days it needs. Up to 6 date options.
   - Deadline as chips (24h / 2 days / 3 days / 1 week).
   - Then a **Share on WhatsApp** screen, then straight into her own answers.
2. **The one link:** each person taps their name (avatar grid), then a **3-step form** that autosaves on the device:
   - (a) Each date option shows a ✓ Can go / Maybe / ✕ Can't card with its holiday and leave days.
   - (b) Home city: *Use my location* (nearest city from a bundled Indian city list), popular-city chips, or autocomplete. Save the coordinates. Max all-in budget as preset chips plus a slider. Nights as chips.
   - (c) Vibe as icon tiles (beach, mountains, nature, heritage, city, adventure, chill, nightlife, food), deal-breaker chips (overnight bus, 8h+ travel, flights, treks, cold weather, party crowds, hostels, long road trips) with a "Nothing, I'm easy" shortcut, and an optional note.
   - Give each person a private edit token so nobody can overwrite someone else.
3. **Waiting room:** a progress ring and avatars showing who has answered (names only), a **Nudge on WhatsApp** message that names only the people still pending, and a date heat-bar.
4. **Gate:** options unlock only when ALL members have answered. After the deadline, the organiser may go ahead with whoever has answered.
5. **AI step (one Gemini call):**
   - Send the group brief and get 6 candidate destinations as JSON, with a per-person cost range, travel time, and any clash with their won't-dos.
   - Validate the JSON. If Gemini fails, fall back to a rules-based catalogue of Indian destinations.
   - Fetch one destination photo per option from Wikipedia (optional, with a timeout).
6. **Rules step (no AI):** score each candidate for each person on dates (a Maybe counts as a stretch), budget, vibe, won't-dos and travel time → Works / Stretch / Doesn't work, with neutral reasons. Rank the top 3 by what works for EVERYONE, not the majority.
7. **Show options:**
   - A "Where everyone stands" matrix (people × options, coloured dots).
   - 3 photo cards with place, dates, nights, leave days, why it fits, "Works for X/5", and the viewer's OWN cost and travel.
   - A row per person showing their fit and reasons.
   - **Never show anyone's budget or won't-do list to others.**
8. **Decide:**
   - Each person marks each option "I'm in" / "Can't do". The trip auto-locks when everyone is in on one option.
   - The organiser can lock early only if a majority is in and nobody said "can't". Once locked, votes can't change.
   - Show Add to calendar and Tell the group.
   - **The app never picks the trip itself.**

After building, run it locally and test with 5 fake people.

---

### Shorter prompt (if you're starting from the code in this folder)

Read CLAUDE.md, BUILD_PLAN.md and UX_REVIEW.md. Then: 1) check `.env.local` exists and `.env*` is in `.gitignore`, 2) run the app locally and walk me through testing it with 5 people, 3) connect this project to GitHub and push my code.
