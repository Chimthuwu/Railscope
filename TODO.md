# RailScope — TODO

## 🗺️ Live service simulation on the map (BIG — own work session)

DONE (basic): `Map.tsx` now eases each vehicle marker from its previous fix
toward the latest one via a rAF loop (straight-line lerp over ~16s, off-screen
markers skipped, big jumps snap). Trains glide instead of teleporting.

Still to do:
- Route-shape following: snap the train to the line's polyline and advance along
  it instead of straight-line lerp — needs GTFS `shapes.txt` / a shapes endpoint.
  Looks much better on curves and around stations.
- Add a **"Show all services"** toggle on the map (default to a cleaner/filtered
  view, expand to the full network on demand).
- On the **Service Details** page (`LiveFeed.tsx`) add a **"View in map"** button
  that deep-links to the map focused on that specific train (pan/zoom, highlight,
  hide the rest). Needs the selected-train id lifted to `App.tsx`, and a check
  that Trip Planner's `RealtimeTripId` / `gtfsTripId` line up with the vehicle
  feed's `trip.tripId`.

## 🧹 Clear the Network Feed

The feed is Firestore-backed; there's already a hidden admin tool for this:
sign in as the admin account, tap the **"Network Feed"** header 7 times, then hit
**"Clear Feed"**. No code change needed — just needs to be run by the admin.
(If we want a one-shot script instead, add a small Firebase Admin SDK script.)

## ☁️ Backend hosting decision

- Native (Android / Electron) builds now point at `https://railscope-l98d.onrender.com`
  (see `src/lib/config.ts`).
- The **web** app (`railscope.pages.dev`) uses its own same-origin Cloudflare Pages
  Functions (`functions/api/*`) for stations/journeys/departures/trip_details —
  no cold start, keep these.
- Decide whether Cloudflare is being retired too. If so, point web `API_BASE` at
  Render as well and drop `functions/`.

## ⚠️ Missing Cloudflare function: `/api/vehicles`

There is no `functions/api/vehicles.ts`, so on `railscope.pages.dev` the live
vehicle map used to get the SPA HTML back and silently render nothing. Stopgap:
`VEHICLES_API_BASE` in `config.ts` now routes the web map's vehicle polling to
the Render backend (which has the endpoint). Downside: first load of the Map tab
can cold-start Render (~50s).

Proper fix: add `functions/api/vehicles.ts` porting the `/api/vehicles` handler
from `server.ts`. It decodes GTFS-Realtime protobuf via `gtfs-realtime-bindings`,
so the Pages project needs `nodejs_compat` — add a root `wrangler.toml` with
`compatibility_flags = ["nodejs_compat"]` and a recent `compatibility_date`, then
switch `VEHICLES_API_BASE` back to same-origin.

## 🧰 Code-health backlog (from the review)

- **Bundle is one 1.6 MB chunk** (~460 KB gzip). Lazy-load the heavy tabs:
  `Map.tsx` (Leaflet) and `Feed.tsx` (Firebase) behind `React.lazy` so the
  first paint doesn't ship them.
- **Map tab remounts on every tab switch** — loses pan/zoom and restarts the
  poll + rAF each visit. Keep `<TrainMap>` mounted and toggle with `hidden`.
- **Unused / misplaced deps**: `@google/genai`, `react-window`,
  `react-virtualized-auto-sizer` are unused; `shadcn` (a CLI) is in
  `dependencies`. Remove / move to devDependencies.
- **Scratch files committed**: `test-gtfs.ts`, `trip.json`, `find_stops.cjs`.
  Move to a `scripts/` dir or gitignore.
- **`LiveFeed` "Alerts" tab is hardcoded** "No Active Alerts" — not wired to the
  TfNSW alerts API.
- **`server.ts`**: `startServer()` has no `.catch()` — a startup failure becomes
  an unhandled rejection.
- **Header download links** point at the hardcoded `fushigi` release tag
  (`App.tsx`), while the README points at `/releases`. Pick one.
- Note: `firebase-applet-config.json` in git is **fine** — Firebase web config
  is public by design; security is the Firestore rules + authorized domains.
