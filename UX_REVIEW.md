# TripSync: UX review (before the redesign)

Reviewed: the first TripSync build (`app/page.tsx`, `app/t/[id]/page.tsx`), the 14-screen TripTogether sample, and the 8 inspiration shots.

The problem we're designing against: people *start* planning in the group and then stop. Every extra field, every bit of typing and every unclear screen is a place where one of the five drops off, and the Google Form already showed that 3 out of 5 isn't enough. **The design goal is time-to-submit under 60 seconds with zero typing.**

---

## 1. Journey and touchpoints

| # | Who | Touchpoint | Where it happens | Risk of drop-off |
|---|-----|-----------|------------------|------------------|
| 1 | Riya | Sets up the trip (names, possible dates, deadline) | TripSync home | Medium. It's long, but she's motivated |
| 2 | Riya | Shares the link | WhatsApp | Low, if it's one tap |
| 3 | Friends | Opens the link from WhatsApp | Phone browser | **High.** The first screen has to explain itself in 3 seconds |
| 4 | Friends | Says who they are | TripSync | Low |
| 5 | Friends | Private answers | TripSync | **Highest.** This is where the Google Form died |
| 6 | Everyone | Waits and sees who's pending | TripSync + WhatsApp nudge | Medium |
| 7 | Everyone | Compares 3 options | TripSync | Medium. It has to be scannable |
| 8 | Everyone | Votes In / Can't | TripSync | Low |
| 9 | Everyone | Sees the decision and adds it to their calendar | TripSync → Calendar / WhatsApp | Low |

## 2. What the first build asks for, and what it costs

| Input | v1 control | Taps / typing (v1) | Problem |
|---|---|---|---|
| Friends' names | One textarea | Type 4 names with commas | Hard to see or fix a typo; no chips |
| Date windows | 3 inputs per window (label + 2 native date pickers) | ~7 taps + typing, per window | No calendar; no idea which dates are holidays; she has to type a label |
| Deadline | `datetime-local` | 4–6 fiddly taps | Native picker is painful on iOS |
| Home city | Free text | Typing | Typos break the distance maths ("Bangalore" vs "Bengaluru"); only 28 cities were recognised |
| Budget | Number field | Typing | Numeric keyboard, no sense of what's "normal" |
| Nights | Number field | Typing | A 1–14 number field for what's really 4 choices |
| Vibe / won't-dos | 17 grey text chips | Taps | Fine, but a wall of identical grey pills; no icons, so harder to scan |
| Organiser's own answers | Pick her own name again | +1 screen | She just told us who she is |

Riya's setup in v1 is **~25 taps plus typing**. Each friend's form is **~12 taps plus 3 typed fields** on one long scroll.

**The sample app (TripTogether)** fixes typing but goes the other way: **8 steps**, and "must have / nice to have / don't care" on 9 vibes is **27 decisions**. Comfortable budget, absolute max *and* flexibility is three questions for one idea. It's too long, and it's the Google-Form problem again.

## 3. What we keep from the sample
- A calendar with **holidays and long weekends marked**, plus a suggestion list ("2–4 Oct is a 3-day weekend").
- **City search with suggestions** instead of free text.
- **"Save for later"** (we autosave instead, so there's no button).
- The honest story on the landing page: "It shows you the disagreement, not just the answer."
- A step counter with a progress bar.

## 4. What we change (the redesign)

**Organiser setup: one screen, three blocks, about 8 taps**
1. **Names as chips.** Type a name and press Enter or comma, or paste "Siddharth, Karan, Aisha, Preethi" and it splits. You can remove any chip with ✕.
2. **Range calendar.** Tap the first day, tap the last day, and everything in between fills in. Holidays are marked with a dot. **Long-weekend suggestions** sit above the calendar and go in with one tap (for example "Diwali · 7–10 Nov · 1 leave day"). The label is written for you.
3. **Deadline as chips:** 24 hours · 2 days · 3 days · 1 week.
4. After creating, the next screen is **Share on WhatsApp** (the message is pre-written), and then she goes **straight into her own answers**, with no name to pick again.

**Friend form: 3 short steps instead of 1 long scroll or 8 screens, about 10 taps and no typing**
1. **When:** each date window is a card showing its dates, nights, holiday name and **leave days needed**. Each card has one tap: ✓ Can go · ~ Maybe · ✕ Can't. ("Maybe" gives the scoring a Stretch instead of a hard No, so the group isn't blocked by people being cautious.)
2. **From where, and how much:**
   - **City:** "📍 Use my location" (browser GPS → nearest city, no API key needed), or one tap on a popular city, or type 2 letters into the autocomplete (150+ Indian cities stored in the app, plus a live map search as backup). The coordinates are saved, so travel time uses the real distance.
   - **Budget:** tap a preset (₹8k · 12k · 15k · 20k · 30k · 50k), with a slider for fine-tuning.
   - **Nights:** tap a chip (2 · 3 · 4 · 5 · 6+). Only lengths that fit the chosen windows are shown.
3. **Vibe and deal-breakers:** icon tiles you can multi-select (beach, mountains …) plus deal-breaker chips, with a **"Nothing, I'm easy"** shortcut. The note field stays tucked away (optional).

Every answer **autosaves** on the device, so closing the tab loses nothing. The 🔒 privacy line stays visible the whole way through.

**Waiting**
- A big "3 of 5 in" progress ring and avatars that turn green when each person answers.
- **"Nudge on WhatsApp"** opens WhatsApp with a message already written that names only the people still pending.
- A date heat-bar shows how many people are free for each window. This is a small early win that keeps the group engaged.

**Options (the decision screen)**
- A **"Where everyone stands" matrix** at the top: people × 3 options, with a green/amber/red dot in each cell. This is the whole answer to Riya's ask on one screen.
- Three **photo cards** (a destination photo from Wikipedia, with an illustrated fallback): place, dates, nights, **your** cost and travel, and "Works for 4 of 5". Tap a person to see their neutral reasons.
- The meaningless "group score 73" number is gone. It's replaced by "Works for X of 5".
- Big **I'm in / Can't do** buttons on each card, with a live "3 of 5 in" bar.

**Decided**
- A celebration card, **Add to calendar** (.ics), **Share on WhatsApp**, and "Next: book it" nudges.

## 5. What the design deliberately does *not* do
- No auto-pick, no hidden "best" answer. The Cut still holds.
- Nobody sees anyone else's budget, won't-dos or cost, and the matrix only shows fit labels.
- No logins. The link plus a private edit token on the device is the identity.

## 6. Visual direction (from the inspiration folder)
Light, nature-green, photo-led: forest green `#1F3D2F` for text and primary actions, a **lime accent** `#C9F26B` for the one main call to action, and warm paper `#F5F3EC` for the background. 24px rounded cards, pill chips, full-bleed destination photos with a dark gradient for readable titles, and Plus Jakarta Sans for type.

## 7. Click budget (target vs v1)

| Flow | v1 | Sample | **Redesign** |
|---|---|---|---|
| Riya: set up the trip | ~25 taps + typing | n/a | **~8 taps + names** |
| Friend: open → submitted | ~12 taps + 3 typed fields | 8 screens, 40+ taps | **~10 taps, 0 typing** |
| Friend: vote | 3 taps | n/a | 3 taps |
