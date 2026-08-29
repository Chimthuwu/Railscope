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
- The **web** app (`railscope.pages.dev`) still uses its own same-origin Cloudflare
  Pages Functions (`functions/api/*`). Left as-is because the free Render instance
  cold-starts after inactivity (~50s), which would hurt the web UX.
- Decide whether Cloudflare is being retired too. If so, point web `API_BASE` at
  Render as well and drop `functions/`.
