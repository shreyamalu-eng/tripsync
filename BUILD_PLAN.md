# TripSync: build plan, step by step

The problem: five friends, 1,200+ WhatsApp messages, zero plans. Riya's ask: *"Build me a tool where everyone submits their preferences through one link, and it gives us our best trip options with everything we need to decide, including where each person stands on each option."*

Every step below says **Goal · Where · Why · How**.

---

## Step 0: One-line description
- **Goal:** pin down what we're building before touching anything.
- **Where:** Claude chat (thinking, no code).
- **Why:** every later check is tested against this line.
- **How:**
  > I am building **a group-trip decider** for **five friends in different cities who can't agree through WhatsApp**, so that **everyone answers privately once, sees three options that work for the whole group with where each person stands, and locks in one trip**.

## Step 1: Why test (Pain · User · Outcome)
| | |
|---|---|
| **Pain** | 3 months, 1,200+ messages, 0 plans. There's no record of what anyone wants. The form got 3/5 answers. The poll collapsed when 2 people changed their minds. |
| **User** | Riya (coordinator, now being blamed) plus 4 friends who each hold a piece of the answer. |
| **Outcome** | One locked trip. Riya is no longer the bottleneck or the scapegoat. |

## Step 2: The Nine Checks
**Kill switches** (any No = don't build)
- **01 Problem real? YES.** 1,200+ messages, zero plans, 3 months of postponing, two failed attempts.
- **02 Workflow repeated? YES.** The same loop repeats every ~2 weeks (suggest → emojis → "can't do that weekend" → silence). The same group will plan the next trip too.
- **03 Input available? YES, with a condition.** Nobody has written their preferences down yet. The Form proved that 3/5 answers is useless. **Design response:** options stay locked until all 5 answer, and everyone can see who's still pending.

**Sizing** (any No = build smaller)
- **04 Output valuable? YES.** Three concrete trips (place, dates, nights, estimated cost) plus a Works / Stretch / Doesn't-work row per person. That's exactly what she asked for.
- **05 Impact measurable? YES.** Baseline: 0 decisions in 3 months. Targets: all 5 answer within 48h, a trip locked within a week, no more planning messages.
- **08 ROI worth it? YES.** A few hours to build. Free tiers (Gemini, Supabase, Vercel). One AI call per trip. Reusable for every future group trip.

**Boundary** (any No = put a human exactly here)
- **06 Failure risk OK? YES.** Worst case is a bad suggestion the group ignores. The costs are AI *estimates*, so they're labelled as estimates and nothing gets booked automatically.
- **07 Judgment protected? YES, but only after cutting part of the ask** (see The Cut).
- **09 Owner clear? YES.** Each person owns their own answers (a private edit token means nobody can overwrite anyone else). **The group owns the final call.** Riya owns the process and the deadline, not the decision.

## Step 3: The Cut
**What 07 kills:** the tool **choosing the trip for the group** ("presents a clear recommendation" read as the final answer). It also kills **showing everyone's raw answers** (budgets, won't-dos) in the "where each person stands" view.

- Auto-pick = the algorithm makes the decision → the group doesn't own it → the poll-collapse repeats, and Riya gets blamed again.
- Raw budgets on screen = someone with a lower budget gets exposed, so people fudge their answers, and the input goes bad.

| Automated (system + AI) | Stays human |
|---|---|
| Collecting answers, chasing who's pending, date overlap, generating candidates, cost estimates, scoring, ranking | Each person's own answers, the vote on each option, the final lock, booking |

**The one sentence to Riya:**
> "It'll narrow it down to the three trips that work best for all five of you and show how each one works for each person, but it won't pick for you: the trip locks only when all five of you say 'I'm in', so the decision is the group's, not yours."

## Step 4: Human · AI · System split
| System (rules) | AI (Gemini) | Human |
|---|---|---|
| Gate (all 5 in), date overlap, budget/date/vibe/won't-do scoring, ranking, privacy filter, lock rule | Suggest 6 destinations, estimate cost + travel time per person, write a one-line "why" | Answer privately, vote in / can't, lock, book |

Why this split: anything that must be **fair or private** is plain rules you can check. AI only does what rules can't do well: knowing places and estimating costs.

Human-in-the-loop level: **L2 Prepare → L3 Approve.** AI prepares options, humans approve. It never executes a booking.

## Step 5: Components map
See `diagrams/components-map.png`: swimlanes (Riya · Friends · App · Gemini · Supabase) × stages (Trigger → Input → Context → Processing → Output).

## Step 6: The 5 parts
| Part | In TripSync |
|---|---|
| **Frontend** | `app/page.tsx` (create trip), `app/t/[id]/page.tsx` (the one link: pick name → form → status → options → vote) |
| **Backend** | `app/api/trips/...` routes + `lib/engine.ts` (gate, overlap, scoring, lock) + `lib/view.ts` (privacy filter) |
| **Database** | Supabase: `trips`, `preferences`, `options`, `votes` (`supabase/schema.sql`) |
| **API** | Gemini (`lib/gemini.ts`) and Supabase |
| **Version control** | GitHub |

## Step 7: System workflow / API call flow
See `diagrams/system-workflow.png`. There are 10 steps and **only one AI call per trip** (step 7). Swiping through options, overlap, scoring and lock are all local, so they're free and instant.

## Step 8: Stack and model
- **Gemini Flash**: cheapest model that can do the job. Ranking isn't done by AI, so a small model is fine. The app auto-picks the current Flash model if the default name is retired.
- **Fallback:** if Gemini fails, a rules-only planner with 16 hand-checked Indian destinations still produces options.
- **Supabase** with Row Level Security ON and no public policies. Only the server's secret key can read preferences.
- **Vercel** for hosting, **GitHub** for checkpoints.

## Step 8.5: UX pass (before building)
- **Goal:** get each person from "opened the link" to "submitted" in under a minute, because drop-off is what killed the Google Form.
- **Where:** `UX_REVIEW.md` (touchpoints, inputs, click budget, what we took from the TripTogether sample and the inspiration folder).
- **Why:** 3/5 answers is useless, and every typed field is a place someone quits.
- **How:** replace typing with taps (range calendar + holidays, name chips, GPS/city chips, budget and night presets, icon tiles), keep it to 3 short steps with autosave, and nudge on WhatsApp with a message that names only the people still pending.

## Step 9: Build (Claude Code)
The prompt is in `CLAUDE_CODE_PROMPT.md`. Plan first, then code: "a wrong plan takes 10 seconds to fix, wrong code takes 20 minutes."

## Step 10: Secure
1. Keys go in `.env.local` only (copy `.env.example`).
2. `.env*` is already in `.gitignore`. Check this before your first push.
3. If a key leaks, rotate it immediately.

## Step 11: Connect and test
- Run locally (`npm install`, `npm run dev`). With no keys it runs in **local test mode** (a JSON file stands in for the database, and the rules planner stands in for Gemini).
- Add the keys and restart. The page footer stops saying "local test mode".
- **Test against the purpose, not just "does it run":**
  - Can 5 people answer from 5 phones without overwriting each other?
  - Do options stay locked at 4/5?
  - Does anyone's budget appear anywhere on the page? (It shouldn't.)
  - Does the trip lock when all 5 are in, and stay locked?

## Step 12: Push and deploy
GitHub → Vercel → add the env vars in the Vercel dashboard → Deploy → open the live URL on your phone. Every push redeploys automatically.
