# 🚆 RailScope

> **A fast, free, open-source, and ad-free Sydney & NSW transport tracking web application.**

🔗 **Live Web App:** [https://railscope.pages.dev](https://railscope.pages.dev)

---

## 💡 Why RailScope?

Let’s be honest: **TripView is terrible.** 

The official timetable apps for Sydney's rail network are bloated with invasive ads, charge you money just to save basic daily trips or remove advertising, and feel sluggish to navigate on modern smartphones. 

**RailScope** was built out of pure frustration with that paywalled, ad-ridden status quo. RailScope is 100% free, fast, responsive, and completely open-source. No subscriptions, no ads, and no artificial paywalls for saving your favorite stations or daily commute routes.

---

## ✨ Features

- 🔍 **Conversational & Instant Station Search**:
  - Guided step-by-step flow (*"Where are you travelling from?"* ➔ *"Where are you travelling to?"*).
  - Ultra-fast zero-latency local fuzzy matching — find your station in just 1–2 keypresses.
- 🗺️ **Live Interactive Vehicle Map**:
  - Real-time map powered by Leaflet & CartoDB tiles.
  - Live location tracking for Sydney Trains and buses with speed and route badges.
- ⭐️ **Unlimited Saved Journeys & Stations**:
  - Save your home station, frequent stops, and routine trips with a single tap.
  - No paywall to bookmark your routes.
- 🗣️ **Network Feed**:
  - A modern community feed for real-time commuter updates, delay reports, and photo sharing.
  - Integrated with Firebase Firestore for live sync.
- 📱 **Native Mobile Experience**:
  - Optimized for iPhone Safari, Android, and Desktop browsers.
  - Full safe-area support (Notch / Dynamic Island), smooth gestures, and dark mode integration.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Maps**: Leaflet, React-Leaflet, CartoDB tiles
- **Backend / Proxy**: Node.js, Express, Cloudflare Pages Functions
- **Realtime Data**: Transport for NSW (TfNSW) Open Data GTFS Realtime & Trip Planner APIs
- **Database & Auth**: Firebase Auth & Firestore

---

## 🚀 Getting Started

### Prerequisites

You will need Node.js (v18+) and a free **TfNSW API key** from the [TfNSW Open Data Hub](https://opendata.transport.nsw.gov.au/).

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/railscope.git
   cd railscope
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the project root:
   ```env
   TFNSW_API_KEY=YOUR_TFNSW_API_KEY
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

---

## ☁️ Deployment

RailScope is pre-configured for **Cloudflare Pages** with serverless Cloudflare Functions (`/functions/api`) acting as secure proxies for the TfNSW APIs.

1. Connect your repository to **Cloudflare Pages**.
2. **Build Settings**:
   - **Framework Preset**: None
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
3. **Environment Variables**: Add `TFNSW_API_KEY` under Settings -> Environment Variables.

---

## 🤝 Contributing

Contributions are welcome! Whether you want to improve performance, enhance UI components, add support for light rail / ferries, or fix bugs, feel free to open a Pull Request or issue.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.