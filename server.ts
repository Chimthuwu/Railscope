import express from "express";
import path from "path";
import axios from "axios";
import gtfs from "gtfs-realtime-bindings";
import { stations } from "./src/data/stations";

// Station names, fed to AssemblyAI as keyterms so voice search nails proper
// nouns like "Hurstville", "Woy Woy", "Warrawee" instead of guessing.
const STATION_KEYTERMS = Array.from(new Set(stations.map((s) => s.name)));

// Render (and most hosts) inject PORT and expect the app to bind to it.
// Render also always sets RENDER=true, which we use as a "serve the built app" signal
// so `npm run dev` keeps using the Vite middleware locally without extra env setup.
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";

async function startServer() {
  const app = express();

  // CORS: the native apps (Capacitor / Electron) call this server cross-origin.
  // Mirrors functions/api/_middleware.ts on the Cloudflare deployment.
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Short-lived cache: the GTFS-Realtime feed only refreshes every ~15-30s, so
  // serving a cached copy for a few seconds collapses many polling clients into
  // one upstream request and makes responses near-instant.
  const vehicleCache = new Map<string, { at: number; body: any }>();
  const VEHICLE_TTL_MS = 8000;

  // TfNSW API Route - Vehicle Positions
  app.get("/api/vehicles", async (req, res) => {
    try {
      const apiKey = process.env.TFNSW_API_KEY;
      const type = String(req.query.type || "trains"); // "trains", "buses", "both"

      const cached = vehicleCache.get(type);
      if (cached && Date.now() - cached.at < VEHICLE_TTL_MS) {
        return res.json(cached.body);
      }

      if (!apiKey || apiKey === "YOUR_TFNSW_API_KEY") {
        // Return dummy data for preview when key is missing
        return res.json({
          status: "mock",
          message: "Please configure TFNSW_API_KEY for live data",
          entities: [
            {
              id: "MOCK_TRAIN_1",
              vehicle: {
                position: { latitude: -33.8688, longitude: 151.2093 },
                trip: { routeId: "T1", tripId: "T1_Mock" },
                timestamp: Math.floor(Date.now() / 1000)
              },
              _type: "train"
            },
             {
              id: "MOCK_TRAIN_2",
              vehicle: {
                position: { latitude: -33.8188, longitude: 151.0093 },
                trip: { routeId: "T1", tripId: "T1_Mock_2" },
                timestamp: Math.floor(Date.now() / 1000)
              },
              _type: "train"
            },
            {
              id: "MOCK_BUS_1",
              vehicle: {
                position: { latitude: -33.8788, longitude: 151.2193 },
                trip: { routeId: "333", tripId: "333_Mock" },
                timestamp: Math.floor(Date.now() / 1000)
              },
              _type: "bus"
            }
          ]
        });
      }

      const fetchFeed = async (url: string, vehicleType: string, customHeaders = {}) => {
        try {
          const response = await axios.get(url, {
            headers: { Authorization: `apikey ${apiKey}`, ...customHeaders },
            responseType: "arraybuffer", // Important for protobuf
            timeout: 5000,
          });
          const feed = gtfs.transit_realtime.FeedMessage.decode(new Uint8Array(response.data));
          return feed.entity.map((e: any) => ({
            ...(e.toJSON ? e.toJSON() : e),
            _type: vehicleType
          }));
        } catch (err) {
          console.error(`Failed to fetch ${vehicleType} feed:`, err instanceof Error ? err.message : err);
          return [];
        }
      };

      const promises: Promise<any[]>[] = [];
      
      if (type === "trains" || type === "both") {
        promises.push(fetchFeed("https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains", "train"));
        promises.push(fetchFeed("https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains", "train_update"));
      }
      
      if (type === "buses" || type === "both") {
        promises.push(fetchFeed("https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/buses", "bus"));
        // promises.push(fetchFeed("https://api.transport.nsw.gov.au/v1/gtfs/tripupdates/buses", "bus_update")); // optional, might be slow for buses
      }

      const results = await Promise.all(promises);
      const allEntities = results.flat();

      const body = { status: "live", entities: allEntities };
      vehicleCache.set(type, { at: Date.now(), body });
      res.json(body);
    } catch (error) {
      console.log("[Info] Live feed unavailable, falling back to mock data. Reason:", error instanceof Error ? error.message : "Unknown");
      res.json({
        status: "mock",
        error: "Live feed failed, falling back to mock data",
        entities: []
      });
    }
  });

  // TfNSW API Route - Stop Search
  app.get("/api/stations", async (req, res) => {
    try {
      const apiKey = process.env.TFNSW_API_KEY;
      if (!apiKey || apiKey === "YOUR_TFNSW_API_KEY") {
        return res.json({ status: "mock", locations: [] });
      }

      const q = req.query.q as string;
      if (!q) {
        return res.json({ status: "ok", locations: [] });
      }

      const url = `https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&type_sf=any&coordOutputFormat=EPSG:4326&name_sf=${encodeURIComponent(q)}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `apikey ${apiKey}` },
        timeout: 8000,
      });

      // Filter and map locations to return valid station stops
      const locs = response.data?.locations || [];
      const stations = locs
        .filter((l: any) => l.type === 'stop' && l.properties?.stopId && l.modes?.includes(1))
        .map((l: any) => ({
          id: l.properties.stopId,
          tfnsw_id: l.id,
          name: l.name?.split(',')[0].replace(' Station', ''),
          lat: l.coord[0],
          lng: l.coord[1]
        }));

      // Filter unique by tfnsw_id or id
      const uniqueStations = Array.from(new Map(stations.map((s: any) => [s.tfnsw_id, s])).values());

      res.json({
        status: "live",
        locations: uniqueStations
      });
    } catch (error) {
      console.log("[Info] Stop search unavailable:", error instanceof Error ? error.message : "Unknown");
      res.json({ status: "error", error: "Failed to search stations", locations: [] });
    }
  });

  // TfNSW API Route - Stop Departures
  app.get("/api/departures/:stopId", async (req, res) => {
    try {
      const apiKey = process.env.TFNSW_API_KEY;
      if (!apiKey || apiKey === "YOUR_TFNSW_API_KEY") {
        return res.json({ status: "mock", events: [] });
      }

      const stopId = req.params.stopId;
      const url = `https://api.transport.nsw.gov.au/v1/tp/departure_mon?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&mode=direct&type_dm=stop&name_dm=${encodeURIComponent(stopId)}&departureMonitorMacro=true&TfNSWTR=true&version=10.2.1.42`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `apikey ${apiKey}` },
        timeout: 8000,
      });

      let events = response.data?.stopEvents || [];
      let isOvernightFallback = false;

      if (events.length === 0) {
        const d = new Date();
        const tomorrow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        const tYear = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' });
        const tMonth = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: '2-digit' });
        const tDay = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' });
        const tomorrowDate = `${tYear}${tMonth}${tDay}`;

        const fallbackUrl = `https://api.transport.nsw.gov.au/v1/tp/departure_mon?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&mode=direct&type_dm=stop&name_dm=${encodeURIComponent(stopId)}&departureMonitorMacro=true&TfNSWTR=true&itdDate=${tomorrowDate}&itdTime=0500&version=10.2.1.42`;

        try {
          const fallbackRes = await axios.get(fallbackUrl, {
            headers: { Authorization: `apikey ${apiKey}` },
            timeout: 8000,
          });
          events = fallbackRes.data?.stopEvents || [];
          isOvernightFallback = true;
        } catch (e) {
          console.error("Fallback departures error", e);
        }
      }

      res.json({
        status: "live",
        events: events,
        isOvernightFallback: isOvernightFallback
      });
    } catch (error) {
      console.log("[Info] Departures unavailable:", error instanceof Error ? error.message : "Unknown");
      res.json({ status: "error", error: "Failed to fetch departures", events: [] });
    }
  });

  // TfNSW API Route - Journeys (Trip Planner)
  app.get("/api/journeys", async (req, res) => {
    try {
      const apiKey = process.env.TFNSW_API_KEY;
      if (!apiKey || apiKey === "YOUR_TFNSW_API_KEY") {
        return res.json({ status: "mock", journeys: [] });
      }

      const { origin, destination } = req.query;
      console.log(`[Jouneys] origin=${origin} dest=${destination}`);
      
      if (!origin || !destination) {
        return res.json({ status: "error", error: "Missing origin or destination", journeys: [] });
      }

      const d = new Date();
      
      const year = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' });
      const month = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: '2-digit' });
      const day = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' });
      const dateParam = `${year}${month}${day}`;
      
      const tStr = new Intl.DateTimeFormat('en-AU', {timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false}).format(d);
      const timeParam = tStr.replace(':', '');

      const url = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&depArrMacro=dep&itdDate=${dateParam}&itdTime=${timeParam}&type_origin=stop&name_origin=${encodeURIComponent(origin as string)}&type_destination=stop&name_destination=${encodeURIComponent(destination as string)}&calcNumberOfTrips=8&TfNSWTR=true&includeCompleteStopSeq=true`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `apikey ${apiKey}` },
        timeout: 8000,
      });

      let journeys = response.data?.journeys || [];
      let isOvernightFallback = false;

      if (journeys.length === 0) {
        const tomorrow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        const tYear = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' });
        const tMonth = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: '2-digit' });
        const tDay = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' });
        const tomorrowDate = `${tYear}${tMonth}${tDay}`;

        const fallbackUrl = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&depArrMacro=dep&itdDate=${tomorrowDate}&itdTime=0500&type_origin=stop&name_origin=${encodeURIComponent(origin as string)}&type_destination=stop&name_destination=${encodeURIComponent(destination as string)}&calcNumberOfTrips=8&TfNSWTR=true&includeCompleteStopSeq=true`;

        try {
          const fallbackRes = await axios.get(fallbackUrl, {
            headers: { Authorization: `apikey ${apiKey}` },
            timeout: 8000,
          });
          journeys = fallbackRes.data?.journeys || [];
          isOvernightFallback = true;
        } catch (e) {
          console.error("Fallback journeys error", e);
        }
      }

      res.json({
        status: "live",
        journeys: journeys,
        isOvernightFallback: isOvernightFallback
      });
    } catch (error) {
      console.log("[Info] Journeys unavailable:", error instanceof Error ? error.message : "Unknown");
      res.json({ status: "error", error: "Failed to fetch journeys", journeys: [] });
    }
  });

  // TfNSW API Route - Trip Details
  app.get("/api/trip_details", async (req, res) => {
    try {
      const apiKey = process.env.TFNSW_API_KEY;
      if (!apiKey || apiKey === "YOUR_TFNSW_API_KEY") {
        return res.json({ status: "mock", stops: [] });
      }

      const { origin, destination, date, time, realtimeTripId, gtfsTripId } = req.query;
      
      if (!origin || !destination || !date || !time) {
        return res.json({ status: "error", error: "Missing required parameters", stops: [] });
      }

      const url = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&depArrMacro=dep&itdDate=${date}&itdTime=${time}&type_origin=stop&name_origin=${encodeURIComponent(origin as string)}&type_destination=stop&name_destination=${encodeURIComponent(destination as string)}&calcNumberOfTrips=8&TfNSWTR=true&includedMeans=checkbox&inclMOT_1=on&inclMOT_2=on&includeCompleteStopSeq=true`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `apikey ${apiKey}` },
        timeout: 8000,
      });

      const journeys = response.data?.journeys || [];
      let targetLeg = null;

      // Find the right journey and leg
      for (const j of journeys) {
        if (!j.legs) continue;
        for (const leg of j.legs) {
          const legRealtimeId = leg.transportation?.properties?.RealtimeTripId || leg.properties?.RealtimeTripId;
          const legGtfsId = leg.transportation?.properties?.gtfsTripId || leg.properties?.gtfsTripId;
          
          if ((realtimeTripId && legRealtimeId === realtimeTripId) || (gtfsTripId && legGtfsId === gtfsTripId)) {
            targetLeg = leg;
            break;
          }
        }
        if (targetLeg) break;
      }

      // Fallback: Just take the first train/metro leg of the first journey
      if (!targetLeg && journeys.length > 0 && journeys[0].legs?.length > 0) {
         targetLeg = journeys[0].legs.find((l: any) => {
           const pClass = l.transportation?.product?.class;
           return pClass === 1 || pClass === 2;
         }) || journeys[0].legs[0];
      }

      const stops = targetLeg?.stopSequence || [];

      res.json({
        status: "live",
        stops: stops
      });
    } catch (error) {
      console.log("[Info] Trip details unavailable:", error instanceof Error ? error.message : "Unknown");
      res.json({ status: "error", error: "Failed to fetch trip details", stops: [] });
    }
  });

  // Voice search - AssemblyAI speech-to-text proxy.
  // The browser records a short clip and POSTs the raw audio bytes here; we
  // upload it to AssemblyAI, transcribe with the station list as keyterms, and
  // return the text. The API key never leaves the server.
  const AAI_BASE = "https://api.assemblyai.com";
  app.post(
    "/api/transcribe",
    express.raw({ type: () => true, limit: "20mb" }),
    async (req, res) => {
      try {
        const apiKey = process.env.ASSEMBLYAI_API_KEY;
        if (!apiKey || apiKey === "MY_ASSEMBLYAI_API_KEY") {
          return res.status(200).json({ status: "disabled", text: "" });
        }

        const audio = req.body as Buffer;
        if (!audio || !audio.length) {
          return res.status(400).json({ status: "error", error: "No audio received", text: "" });
        }

        const prose = String(req.query.mode || "station") === "prose";
        const headers = { Authorization: apiKey };

        // 1. Upload the raw audio (binary body, not multipart).
        const upload = await axios.post(`${AAI_BASE}/v2/upload`, audio, {
          headers: { ...headers, "Content-Type": "application/octet-stream" },
          timeout: 20000,
          maxBodyLength: Infinity,
        });
        const audioUrl = upload.data?.upload_url;
        if (!audioUrl) throw new Error("upload failed");

        // 2. Submit for transcription.
        const submit = await axios.post(
          `${AAI_BASE}/v2/transcript`,
          {
            audio_url: audioUrl,
            speech_models: ["universal-3-5-pro", "universal-2"],
            ...(prose
              ? { punctuate: true, format_text: true }
              : { keyterms_prompt: STATION_KEYTERMS, punctuate: false, format_text: false }),
          },
          { headers: { ...headers, "Content-Type": "application/json" }, timeout: 15000 },
        );
        const id = submit.data?.id;
        if (!id) throw new Error("submit failed");

        // 3. Poll until done (short clips finish in a few seconds).
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1000));
          const poll = await axios.get(`${AAI_BASE}/v2/transcript/${id}`, {
            headers,
            timeout: 10000,
          });
          const { status, text, error } = poll.data || {};
          if (status === "completed") {
            return res.json({ status: "ok", text: (text || "").trim() });
          }
          if (status === "error") {
            console.log("[Transcribe] AssemblyAI error:", error);
            return res.status(502).json({ status: "error", error: error || "transcription failed", text: "" });
          }
        }
        return res.status(504).json({ status: "error", error: "timed out", text: "" });
      } catch (err) {
        console.log("[Transcribe] failed:", err instanceof Error ? err.message : "Unknown");
        res.status(502).json({ status: "error", error: "Transcription unavailable", text: "" });
      }
    },
  );

  // Vite middleware for development
  if (!IS_PRODUCTION) {
    const Vite = await import("vite");
    const vite = await Vite.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (${IS_PRODUCTION ? "production" : "development"})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
