# 🏗️ RailScope Architecture & Developer Guide

This document provides a high-level overview of the architectural design, codebase structure, data flow, and key patterns used in **RailScope**. It is designed to help new contributors quickly get up to speed.

---

## 📐 System Overview

RailScope is a single-page web application (SPA) built with React, TypeScript, and Vite. It communicates with Transport for NSW (TfNSW) Open Data APIs through a proxy layer and leverages Firebase for community network features.

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (React App)                    │
│   App.tsx ──► Map.tsx | Feed.tsx | LiveFeed.tsx           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐    ┌─────────────────────────┐
│     Express / Cloudflare     │    │    Firebase Services    │
│         Proxy Layer          │    │   Auth & Firestore DB   │
│  (/api/vehicles, /stations)  │    └─────────────────────────┘
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  TfNSW Open Data Hub (GTFS)  │
└──────────────────────────────┘
```

---

## 📁 Repository Structure

```
Railscope/
├── functions/             # Cloudflare Pages Functions (Production API routes)
├── src/
│   ├── components/
│   │   ├── Feed.tsx       # Community Feed & Hidden Admin Controls
│   │   ├── LiveFeed.tsx   # Live departures & trip planner views
│   │   ├── Map.tsx        # Leaflet interactive train/bus map
│   │   └── ui/            # Reusable UI primitives (shadcn/Radix)
│   ├── data/
│   │   └── stations.ts    # Bundled Sydney/NSW station dataset for instant search
│   ├── lib/
│   │   └── firebase.ts    # Firebase client initialization
│   ├── App.tsx            # Application entry, state routing & station search
│   ├── index.css          # Global CSS & Tailwind configuration
│   └── main.tsx           # React DOM root
├── server.ts              # Express API Proxy server (Development server)
├── vite.config.ts         # Vite build configuration
└── package.json           # Dependencies and scripts
```

---

## 🔑 Core Architecture Concepts

### 1. Hybrid Station Search (`App.tsx` & `src/data/stations.ts`)
- **Problem**: Querying external APIs on every keystroke introduces latency and API quota fatigue.
- **Solution**: RailScope uses a hybrid approach:
  - **Instant Local Filtering**: `src/data/stations.ts` holds pre-indexed metadata for all Sydney & NSW stations. Results are filtered and sorted instantly on client side (ranked by prefix match).
  - **API Fallback**: For queries $\ge 3$ characters, a debounced background request queries `/api/stations` to fetch secondary stops (bus stops, regional platforms) and appends them dynamically.

### 2. Live Map Engine (`src/components/Map.tsx`)
- Built using `react-leaflet` and `Leaflet.js`.
- Tile Provider: **CartoDB Basemaps** (unmetered, fast OpenStreetMap render).
- Marker Optimization: Custom DivIcons rendered with inline CSS and Lucide icons to reduce image asset requests.
- Real-Time Polling: Vehicle positions are polled every 15 seconds from `/api/vehicles`.

### 3. API Proxy Layer (`server.ts` & `functions/api/`)
- Direct client calls to TfNSW endpoints are blocked by CORS and would expose API keys.
- **Development**: `server.ts` runs an Express server wrapping Vite middleware.
- **Production**: Cloudflare Pages Functions serve the endpoints from `/functions/api/*`, keeping secrets safe without needing a paid backend server.

### 4. Community Feed & Moderation (`src/components/Feed.tsx`)
- Powered by Firebase Auth (anonymous sessions + Google OAuth) and Firestore.
- Image uploads are downscaled in-browser to compressed JPEG Base64 strings before upload to stay within zero-cost storage tiers.
- **Admin System**: A hidden multi-tap gesture on the header activates moderation tools for authorized admin emails, supporting batch deletes.

---

## 🛠️ Performance & Mobile Optimization Rules

When adding new features or editing code, please follow these guidelines:

1. **Mobile-First Interactions**: Always test click events on mobile Safari/iOS. Use `onPointerDown` with `preventDefault()` on list items if active input focus threatens to swallow tap events.
2. **Bundle & Asset Management**: Prefer SVG icons (Lucide) over image files. Compress static assets before committing.
3. **TypeScript Safety**: Maintain explicit interfaces for TfNSW response mappings.

---

## 🤝 Need Help?

If you encounter issues or have architectural proposals, please open a Github Issue or Discussion in the repository!
