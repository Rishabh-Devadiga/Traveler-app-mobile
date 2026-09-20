# TourFlow Traveler App (frontend)

Mobile-first React + Vite + Tailwind frontend for the TourFlow AI travel companion.
The UI keeps the original Stitch-converted design language; all screens below are
wired to the real TourFlow backend — **no mock user data** anywhere in rendered flows.

## Stack

- React 18 + react-router-dom 6 + TypeScript (~5.5)
- Vite 5 (`npm run dev` / `npm run build` = `tsc && vite build` / `npm run preview`)
- Tailwind CSS 3, three.js (3D globe), Leaflet 1.9 (lazy-loaded trip map), jsPDF (trip PDF)
- Lint: `npm run lint` (`eslint src --ext .ts,.tsx`)

## Environment

Copy `.env.example` to `.env` (gitignored):

| Variable | Purpose |
|---|---|
| `VITE_TOURFLOW_API_URL` | Backend base (scheme + host + port, **no** `/api` suffix). Unset → built-in mock flows |
| `VITE_SUPPORT_PHONE_PRIMARY` / `_SECONDARY` | Tap-to-call numbers on Profile → Help. Unset → "Not configured" state, never a fake number |

Mic input needs a secure context (HTTPS; localhost counts).

## Backend contract (base prefix `/api`)

All calls go through `src/api/client.ts` (`apiClient`). Authenticated variants
(`authGet/authPost/authPut/authPatch`) attach `Authorization: Bearer <traveler-JWT>`
when a session exists; without a token the same calls stay anonymous. `ApiError`
carries `status`, `detail` (verbatim backend message) and `raw` (full body, e.g.
guide-404 `active_trip`). 401 → clear session → `/login` everywhere.

| Area | Endpoints (`src/api/`) |
|---|---|
| Auth (`auth.ts`) | `POST /auth/traveler/signup {full_name,email,password}` → 201 `{user,token}`; `POST /auth/traveler/login` → 200 same envelope; `GET /auth/traveler/me` (startup session restore); token key is exactly `token`, stored under one localStorage key |
| Traveler (`traveler.ts`) | `GET /traveler/profile`, `PATCH /traveler/profile` (changed keys only); avatar: `POST /traveler/avatar` (multipart `file`), `DELETE /traveler/avatar`, `GET /traveler/avatar/{full-user-id}` (public, no auth header) |
| Trips (`trips.ts`) | `POST /trips` (dates authoritative: `duration_days=(end-start)+1` + ISO datetimes), `GET /trips/{id}`, `PUT /trips/{id}` (dates/pace), `POST …/optimize`, `…/confirm` (idempotent), `…/change-accommodation`, `…/change-day-accommodation`, `…/swap-activity`, `…/add-activity`, `…/delete-activity`, `…/edit-activity`, `…/toggle-activity`, `GET /trips/{id}/map`, `GET /traveler/trips` (own trips only — never the open list for pickers), `GET /possible-options` |
| Guide (`guide.ts`) | `GET /guide/greeting`, `GET /guide/history`, `POST /guide/chat` (alias `POST /chat` only when routeless-404 without tripId); 404 bodies carry `active_trip` → auto-adopt once |
| AI (`ai.ts`) | `POST /ai/extract-preferences {text}` (best-effort enrichment) |

## Pages & behavior

- **Onboarding (`/`)** — session-aware landing: logged-out sees START YOUR JOURNEY + equal-weight **Sign In** / **Create Account** (`/login`, signup-preselect via `?mode=signup` or location state) + subtle Browse as Guest; logged-in sees initial-avatar + `full_name` chip → Profile, plus Logout; skeleton while restoring (no state flash).
- **Login (`/login`)** — real login/signup only, inline 409/422 backend messages, returns to origin page.
- **Plan (`/plan`)** — freeform textarea starts **empty** with placeholder; chips + "Great detail" line appear only after typing/voice/inspiration; **Speak instead** is live Web Speech (`en-IN`, interim in textarea, finals appended, friendly mic errors, auto-hide when unsupported/insecure); Clear resets text + chips + status.
- **Checklist / Loading** — dates/duration stay consistent (dates win); Adjust Dates routes here on 422s.
- **Itinerary (`/itinerary`)** — header names the real destination; day tabs `1..duration_days`; leisure stops get relaxed free-time cards; per-stop Change stay / Swap / Remove; per-day Add activity (live catalog); Adjust Dates (PUT, or PUT + optimize = Generate Again); Pace selector (Relaxed/Balanced/Packed + hints → PUT pace + optimize); over-budget warning + Make it cheaper (optimize); Confirm Trip CTA always at end → persistent "✓ Trip Confirmed" (per-trip flag + backend status, survives refresh via trip restore); **Map** button → lazy Leaflet/OSM view (day chips, numbered type-colored pins, dotted routes, unmapped honesty list, itinerary-coordinate fallback on map-404).
- **AI Guide (`/ai-guide`)** — greeting verbatim + history as-is; tripId from the single selected-trip source, omitted when stale (backend resolves active); trip picker fed only by own-trips; 404 `active_trip` auto-adopted once (state + storage); suggestions → chips; `trip_card` → Budget/Bookings panels; every question gets a visible answer slot; Retry without duplicating bubbles.
- **Profile (`/profile`)** — token-gated; `full_name`/email/phone/bio/style/dietary/fitness/currency/language from backend ("Not set" fallbacks, crash-proof coercion); edits via PATCH + data reload; trips count + list, tap opens trip; avatar = initial circle or server photo (`has_avatar` only, `onError` fallback, optimistic instant photo, persistent cache-buster, no request when `has_avatar` false); real Logout; Help/About sheets; page-level `ErrorBoundary` (dev shows message + stack).

## Conventions

- `safeText()` coercion on all backend-rendered values; `dietaryDisplay()` handles string-or-array.
- `localStorage` keys: `tourflow.travelerToken.v1`, `tourflow.activeTripId.v1`, `tourflow.confirmedTripIds.v1`, `tourflow.avatarVersion.v1`, `tourflow.profile.v1` (legacy local prefs).
- Money: `formatINR` (draft, always INR) vs `formatMoney(n, currency)` (backend card, no conversion).
- Verification used here: esbuild-bundled node harnesses against the real modules (stubbed fetch/storage), `npm run lint`, `npm run build`, production-bundle string checks.



# Recent Changes 

1. AUTH (already live — verify, don't rebuild)
   Signup {full_name, email, password 8-72} → 201 {user, token}; login
   {email, password} → 200. Token key is exactly "token". Missing/401 →
   /login. Home shows Sign In + Create Account when logged out, user chip
   (full_name) when in. No hardcoded names anywhere.

2. TRIP CREATION (any place name)
   POST /api/trips accepts destination_id OR free-text destination_name,
   WITH Bearer token (else the trip orphans to a fallback user and the
   Guide rejects it). Always send start_date/end_date ISO + matching
   duration_days. 422 means: unknown place + providers down (read detail),
   end<start, or budget too low for anything — surface backend detail,
   don't invent. On 422 with "provider quota" hint, show retry-later.

3. ITINERARY PAGE
   - Render every item's image_url; leisure/note stops get relaxed cards.
   - Day tabs 1..duration_days; never count the departure note as an activity.
   - Pace selector (Relaxed ~1/day, Balanced ~2/day, Packed full): PUT
     /trips/{id} {pace} then POST /trips/{id}/optimize → re-render.
   - Change hotel (lists in trip payload) → change-accommodation;
     swap/add/remove activity → matching endpoints; all return the full
     trip — re-render from it, never patch local state.
   - Confirm Trip button at the end → POST /trips/{id}/confirm → persistent
     confirmed state (idempotent; 422 = dates missing → Adjust Dates).
   - Over-budget trip (total > budget) → warning + "Make it cheaper"
     (→ optimize). Regenerate after Adjust Dates = PUT + optimize.
   - MAP button → GET /api/trips/{id}/map; Leaflet+OSM (no key), center
     from response, numbered badges by order_index, color by item_type,
     day filter chips, dotted route polyline, invalidateSize on show,
     lazy-load Leaflet; has_coordinates=false → "no map pin" note.

4. AI GUIDE
   - Greeting/history/chat per contract; tripId = selected trip's FULL
     UUID (never truncated/stale); trip switch reloads guide; single
     selection source for header/panel/guide.
   - Render backend suggestions as chips; action.applied → refresh trip
     data; 404 body carries active_trip → auto-switch to it once, then
     reload (fixes stale IDs permanently).
   - Render trip_card into side panels (destination/days/travelers,
     budget total/spent/remaining, bookings_count).

5. PROFILE + AVATAR
   - Profile from GET /traveler/profile (has_avatar decides img vs
     initial; <img src="{BASE}/api/traveler/avatar/{full-uuid}">, public,
     onError → initial). Edit via PATCH (changed keys only). Trips via
     GET /traveler/trips (use for ALL pickers — never the open trip list).
   - Avatar edit: gallery/camera → POST multipart {file} (≤5MB, image/*,
     Bearer) → reload profile; Delete → DELETE endpoint → initial.
     Surface 422 text verbatim.
   - Null-safe rendering everywhere (safeText-style coercion); page error
     boundary; loading/error/retry states, never blank.

6. VOICE ("Speak instead")
   - Web Speech API en-IN + interim; final text appends (never replaces);
     POST /api/ai/extract-preferences {text} (or {text_prompt}) refreshes
     chips; local parser remains as failsafe. Hide button where
     unsupported/insecure; mic-denied/no-speech friendly messages.
   - Planner textarea starts EMPTY (placeholder only); inspirations fill
     on tap.

DONE WHEN, end to end on the live backend: signup → profile shows you;
speak or type any place → trip builds with photos, 2/day stops, within
budget; map pins it; confirm locks it; Guide discusses it by name;
avatar survives refresh; no mock string or hardcoded name anywhere —
grep the bundle for "Aarav", "lorem", "TODO" to prove it.