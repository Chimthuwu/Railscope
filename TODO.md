# RailScope — TODO

## 🗺️ Live service simulation on the map (BIG — own work session)

Right now `Map.tsx` renders every vehicle from `/api/vehicles` as a static "blip"
that jumps on each 15s poll. The map feels cluttered and you can't follow a single
train.

Goal:
- Interpolate vehicle positions between polls so a train visibly *glides* from one
  station toward the next instead of teleporting.
- Add a **"Show all services"** toggle button on the map itself (default to a
  cleaner/filtered view, expand to the full network on demand).
- On the **Service Details** page (`LiveFeed.tsx`, the stop-sequence view) add a
  **"View in map"** button that deep-links to the map focused on that specific
  train (pan/zoom to it, highlight it, hide the rest).

Implementation notes / open questions:
- `/api/vehicles` returns GTFS-realtime `VehiclePosition` entities (lat/lng + a
  `trip.tripId`). Service Details is built from the Trip Planner API, which keys
  legs by `RealtimeTripId` / `gtfsTripId` — need to confirm those IDs line up with
  the vehicle feed's `tripId` so "View in map" can find the right vehicle.
- For smooth movement between polls, either (a) lerp along the straight line
  between last two known positions, or (b) snap the train to the route shape
  polyline and advance along it. (b) looks much better but needs shape data.
- Selected-train state needs to be lifted so `App.tsx` can switch to the `map`
  tab with a target vehicle id.

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
