import { useEffect, useState, useRef, useMemo } from "react";
import { VEHICLES_API_BASE, CARTO_API_KEY } from "../lib/config";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import { Train, Bus, MapPin, Layers } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { stations } from "../data/stations";
import { useTheme } from "next-themes";
import { StationInfoCard } from "./StationInfoCard";
import { buildMapStyle } from "../lib/mapStyle";

if (typeof window !== "undefined") (window as any).maplibregl = maplibregl;

const WEBGL_OK = (() => {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
})();

// Vector basemap (dark mode): CARTO free vector tiles rendered with our custom
// MapLibre GL style — real road hierarchy, glow, colour. Sits in the tile pane
// under all the Leaflet markers.
const STATION_NAMES = stations.map((s) => s.name);

function VectorBasemap() {
  const map = useMap();
  useEffect(() => {
    const style = buildMapStyle(STATION_NAMES);
    // @ts-expect-error - plugin augments the L namespace at runtime
    const gl = L.maplibreGL({ style, attribution: style.sources.carto.attribution });
    gl.addTo(map);
    return () => {
      map.removeLayer(gl);
    };
  }, [map]);
  return null;
}

// CARTO basemaps require a key (https://carto.com/basemaps/apikey); see config.ts.
const cartoTiles = (style: string) =>
  `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png` +
  (CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : "");

// Route ID formatting
const formatRoute = (routeId?: string, type?: string) => {
  if (type === "bus") {
    // Clean up bus route ID (e.g. from "2502_840" to "Bus 840" or just use route ID smartly)
    // Sometimes bus route IDs are separated by underscores. The actual route number is often the last part.
    let number = routeId ? routeId.split('_').pop() : "Unknown";
    return { name: `Bus ${number}`, color: "#b794f6" }; // lavender — distinct from the cool basemap and every train-line colour
  }

  if (!routeId) return { name: "Unknown Route", color: "#333" };
  const prefixMap: Record<string, {name: string, color: string}> = {
    "T1": { name: "T1 North Shore & Western", color: "#f99d1c" },
    "T2": { name: "T2 Inner West & Leppington", color: "#0098cd" },
    "T3": { name: "T3 Bankstown Line", color: "#f37021" },
    "T4": { name: "T4 Eastern Suburbs & Illawarra", color: "#005aa3" },
    "T5": { name: "T5 Cumberland Line", color: "#c4258f" },
    "T6": { name: "T6 Carlingford", color: "#005aa3" },
    "T7": { name: "T7 Olympic Park", color: "#6cae29" },
    "T8": { name: "T8 Airport & South Line", color: "#00954c" },
    "T9": { name: "T9 Northern Line", color: "#d11f2f" },
    "IWL": { name: "T2 Inner West & Lepp.", color: "#0098cd" },
    "APS": { name: "T8 Airport & South Line", color: "#00954c" },
    "CMB": { name: "T5 Cumberland Line", color: "#c4258f" },
    "WST": { name: "T1 Western Line", color: "#f99d1c" },
    "NSN": { name: "T1 North Shore Line", color: "#f99d1c" },
    "ESI": { name: "T4 Eastern Suburbs & Illawarra", color: "#005aa3" },
    "OLY": { name: "T7 Olympic Park", color: "#6cae29" },
    "NTH": { name: "T9 Northern Line", color: "#d11f2f" },
    "CCN": { name: "CCN Central Coast & Newcastle", color: "#ff0000" },
    "BMT": { name: "BMT Blue Mountains Line", color: "#f6891f" },
    "SCO": { name: "SCO South Coast Line", color: "#005aa3" },
    "SHL": { name: "SHL Southern Highlands Line", color: "#6cae29" },
    "M1": { name: "M1 Metro North West", color: "#00954c" }
  };

  const prefix = routeId.split('_')[0];
  return prefixMap[prefix] || { name: routeId, color: "#f99d1c" };
};

const formatStop = (stopId?: string) => {
  if (!stopId) return null;
  if (!stopId.includes('.')) return stopId;
  
  const parts = stopId.split('.');
  const left = parts[0];
  let right = parts[1] || '';
  
  // Clean up right side
  right = right.replace(/\s?\d+\s?Loc/gi, "")
               .replace(/\s?Loc/gi, "")
               .replace(/\s?Exit/gi, "")
               .trim();
  
  // If right side has lowercase letters, it's likely a station name (e.g. "Town Hall")
  // If it's mostly uppercase/numbers (e.g. "SM644BER"), it's a signal, so fallback to left (e.g. "Sydenham")
  const hasLower = /[a-z]/.test(right);
  return hasLower && right.length > 2 ? right : left;
};

// zoom -> marker size: small & unobtrusive when zoomed out, normal when zoomed in
const vehicleSizeForZoom = (z: number) => (z < 11 ? 12 : z < 13 ? 15 : z < 15 ? 18 : 22);

// Custom HTML icon using Lucide icons — a route-coloured train/bus glyph with a
// white halo and a pulsing "radar" beacon. Scales with zoom so it isn't
// overpowering when zoomed out.
const createCustomIcon = (routeId: string, type: string | undefined, size: number) => {
  const routeInfo = formatRoute(routeId, type);
  const color = routeInfo.color;
  const beacon = Math.round(size * 0.9);

  const iconMarkup = renderToStaticMarkup(
    <div style={{ position: "relative", width: `${size}px`, height: `${size}px` }}>
      <div
        className="live-pulse-beacon"
        style={{ backgroundColor: color, width: `${beacon}px`, height: `${beacon}px`, left: `${(size - beacon) / 2}px`, top: `${(size - beacon) / 2}px` }}
      ></div>
      <div style={{
        position: "relative",
        zIndex: 2,
        width: `${size}px`, height: `${size}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color,
        filter: `drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 5px ${color}) drop-shadow(0 1px 2px rgba(0,0,0,0.55))`,
      }}>
        {type === "bus"
          ? <Bus size={size} strokeWidth={2.75} />
          : <Train size={size} strokeWidth={2.75} />}
      </div>
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-train-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 2]
  });
};

const createStationIcon = (type: string, name: string, showText: boolean) => {
  const isBus = type === "bus";
  // cool-toned so amber stays reserved for the origin pin
  const ringColor = isBus ? "#b794f6" : "#8fa6d4";

  // Small ringed node with the name beside it
  const iconMarkup = renderToStaticMarkup(
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      width: "max-content", // Allow text to flow
      pointerEvents: "none", // Don't block clicks
      position: "absolute",
      top: 0,
      left: 0
    }}>
      <div style={{
        backgroundColor: "#e8eefc",
        width: "9px", height: "9px",
        borderRadius: "50%",
        border: `2px solid ${ringColor}`,
        boxShadow: `0 0 4px rgba(0,0,0,0.55), 0 0 6px ${ringColor}55`,
        flexShrink: 0
      }}></div>
      {showText && (
        <div style={{
          fontSize: "11px",
          fontWeight: "700",
          color: "#eef2fc",
          textShadow: "0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85)",
          letterSpacing: "0.3px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          whiteSpace: "nowrap"
        }}>
          {name}
        </div>
      )}
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-station-marker',
    iconSize: [13, 13],
    iconAnchor: [6.5, 6.5],
    popupAnchor: [0, -7]
  });
};

const trainIconCache: Record<string, L.DivIcon> = {};
const getTrainIcon = (routeId: string, type: string | undefined, size: number) => {
  const key = `${routeId}-${type}-${size}`;
  if (!trainIconCache[key]) {
    trainIconCache[key] = createCustomIcon(routeId, type, size);
  }
  return trainIconCache[key];
};

const stationIconCache: Record<string, L.DivIcon> = {};
const getStationIcon = (type: string, name: string, showText: boolean) => {
  const key = `${type}-${name}-${showText}`;
  if (!stationIconCache[key]) {
    stationIconCache[key] = createStationIcon(type, name, showText);
  }
  return stationIconCache[key];
};

const vehicleId = (t: any, index: number) =>
  t.id || t.vehicle?.vehicle?.id || t.vehicle?.trip?.tripId || `veh-${index}`;

// Premium amber origin pin (the station you're travelling from)
const originIconCache: Record<string, L.DivIcon> = {};
const getOriginIcon = (name: string) => {
  if (originIconCache[name]) return originIconCache[name];
  const markup = renderToStaticMarkup(
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "7px", width: "max-content" }}>
      <div style={{ position: "relative", width: "14px", height: "14px", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: "-10px", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,146,60,0.55), rgba(251,146,60,0) 70%)" }} />
        <div style={{ position: "relative", width: "14px", height: "14px", borderRadius: "50%", background: "linear-gradient(145deg, #fdba74, #f97316)", border: "2px solid #fff7ed", boxShadow: "0 0 10px rgba(251,146,60,0.9)" }} />
      </div>
      <span style={{ fontSize: "13px", fontWeight: 800, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.95), 0 0 10px rgba(251,146,60,0.55)", whiteSpace: "nowrap", letterSpacing: "0.3px" }}>{name}</span>
    </div>
  );
  originIconCache[name] = L.divIcon({
    html: markup,
    className: "custom-origin-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
  return originIconCache[name];
};

// Stable map controller: handles the "pan to my location" event and flies to the
// selected origin, but ONLY when that origin actually changes — so a 15s vehicle
// poll (or any re-render) never yanks the map away from what you're looking at.
function MapController({ center, onZoom }: { center?: [number, number]; onZoom: (z: number) => void }) {
  const map = useMap();
  const appliedCenter = useRef<string>("");

  useMapEvents({ zoomend: () => onZoom(map.getZoom()) });

  useEffect(() => {
    const handlePan = (e: any) => map.flyTo(e.detail, 15, { duration: 1.5 });
    window.addEventListener("panTo", handlePan);
    return () => window.removeEventListener("panTo", handlePan);
  }, [map]);

  useEffect(() => {
    if (!center) return;
    const key = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;
    if (key === appliedCenter.current) return;
    appliedCenter.current = key;
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);

  return null;
}

const ANIM_MS = 16000; // ease over slightly longer than the 15s poll, so trains never fully stop
const SNAP_M = 3000; // jump instead of sliding for teleports / bad samples

export function TrainMap({ searchQuery = "", center, origin }: { searchQuery?: string, center?: [number, number], origin?: any }) {
  const [trains, setTrains] = useState<any[]>([]);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'both' | 'trains' | 'buses'>('both');
  const [showStations, setShowStations] = useState(true);
  const [openStationId, setOpenStationId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(11);
  const { resolvedTheme } = useTheme();

  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const refSetters = useRef(new Map<string, (m: L.Marker | null) => void>());
  const firstPos = useRef(new Map<string, [number, number]>());
  const anim = useRef(
    new Map<string, { start: L.LatLng; target: L.LatLng; cur: L.LatLng; t0: number; dur: number; done: boolean }>()
  );

  // One stable ref callback per vehicle id (so re-renders don't churn the map)
  const getRefSetter = (id: string) => {
    let fn = refSetters.current.get(id);
    if (!fn) {
      fn = (m: L.Marker | null) => {
        if (m) markerRefs.current.set(id, m);
        else markerRefs.current.delete(id);
      };
      refSetters.current.set(id, fn);
    }
    return fn;
  };

  // rAF loop: every frame, ease each vehicle marker from its previous fix toward
  // the latest one, so it glides between stops instead of teleporting every 15s.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      let bounds: L.LatLngBounds | null = null;
      try {
        bounds = mapRef.current ? mapRef.current.getBounds().pad(0.25) : null;
      } catch {
        /* map not ready yet */
      }
      anim.current.forEach((s, id) => {
        if (s.done) return;
        const k = s.dur > 0 ? Math.min(1, (now - s.t0) / s.dur) : 1;
        s.cur = L.latLng(
          s.start.lat + (s.target.lat - s.start.lat) * k,
          s.start.lng + (s.target.lng - s.start.lng) * k
        );
        if (k >= 1) s.done = true;
        if (bounds && !bounds.contains(s.cur)) return; // skip off-screen work
        markerRefs.current.get(id)?.setLatLng(s.cur);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const applyPositions = (entities: any[]) => {
      const now = performance.now();
      const seen = new Set<string>();
      entities.forEach((e, i) => {
        const p = e.vehicle?.position;
        if (!p?.latitude || !p?.longitude) return;
        const id = vehicleId(e, i);
        seen.add(id);
        const target = L.latLng(p.latitude, p.longitude);
        const existing = anim.current.get(id);
        if (!existing) {
          firstPos.current.set(id, [p.latitude, p.longitude]);
          anim.current.set(id, { start: target, target, cur: target, t0: now, dur: 0, done: true });
          return;
        }
        const far = existing.cur.distanceTo(target) > SNAP_M;
        anim.current.set(id, {
          start: far ? target : existing.cur,
          target,
          cur: far ? target : existing.cur,
          t0: now,
          dur: far ? 0 : ANIM_MS,
          done: far,
        });
      });
      anim.current.forEach((_, id) => {
        if (seen.has(id)) return;
        anim.current.delete(id);
        firstPos.current.delete(id);
        markerRefs.current.delete(id);
        refSetters.current.delete(id);
      });
    };

    const fetchTrains = async () => {
      try {
        const res = await fetch(`${VEHICLES_API_BASE}/api/vehicles?type=${vehicleTypeFilter}`);
        const data = await res.json();
        if (data.entities) {
          applyPositions(data.entities);
          setTrains(data.entities);
        }
      } catch (err) {
        console.error("Failed to fetch vehicles", err);
      }
    };

    fetchTrains();
    const interval = setInterval(fetchTrains, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [vehicleTypeFilter]);

  // Station markers don't depend on the vehicle feed — memoise so the 15s poll
  // doesn't rebuild ~600 markers every tick.
  const stationMarkers = useMemo(() => {
    // Keep the wide view clean & premium — only surface stops once zoomed in
    if (!showStations || zoomLevel < 12) return null;
    return stations.map(station => {
      if (vehicleTypeFilter === 'trains' && station.type === 'bus') return null;
      if (vehicleTypeFilter === 'buses' && station.type === 'train') return null;
      if (!station.lat || !station.lng) return null;
      return (
        <Marker
          key={station.id}
          position={[station.lat, station.lng]}
          icon={getStationIcon(station.type || 'train', station.name, zoomLevel >= 14)}
          eventHandlers={{
            popupopen: () => setOpenStationId(station.id),
            popupclose: () => setOpenStationId((prev) => (prev === station.id ? null : prev)),
          }}
        >
          <Popup className="station-popup" maxWidth={276} minWidth={248} autoPanPadding={[18, 80]}>
            <StationInfoCard
              name={station.name}
              type={station.type || 'train'}
              active={openStationId === station.id}
            />
          </Popup>
        </Marker>
      );
    });
  }, [showStations, vehicleTypeFilter, zoomLevel, openStationId]);

  const filteredTrains = useMemo(() => trains.filter(t => {
    if (vehicleTypeFilter === 'trains' && t._type === 'bus') return false;
    if (vehicleTypeFilter === 'buses' && t._type === 'train') return false;

    if (!searchQuery) return true;
    const routeId = t.vehicle?.trip?.routeId?.toLowerCase() || "";
    const tripId = t.vehicle?.trip?.tripId?.toLowerCase() || "";
    const q = searchQuery.toLowerCase();
    return routeId.includes(q) || tripId.includes(q);
  }), [trains, vehicleTypeFilter, searchQuery]);

  const isDark = resolvedTheme === 'dark';
  // Vector basemap needs WebGL; fall back to raster dark tiles if unavailable.
  const premium = isDark && WEBGL_OK;

  return (
    <div className={`w-full h-full relative ${isDark ? 'premium-map' : 'day-map'}`}>
      <div className="map-atmosphere" />
      {/* Control Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <div className="bg-[#0C0C0E]/90 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex items-center shadow-lg">
          <button 
            onClick={() => setVehicleTypeFilter('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${vehicleTypeFilter === 'both' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All
          </button>
          <button 
            onClick={() => setVehicleTypeFilter('trains')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${vehicleTypeFilter === 'trains' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Train size={14} /> Trains
          </button>
          <button 
            onClick={() => setVehicleTypeFilter('buses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${vehicleTypeFilter === 'buses' ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Bus size={14} /> Buses
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  window.dispatchEvent(new CustomEvent('panTo', { detail: [pos.coords.latitude, pos.coords.longitude] }));
                });
              }
            }}
            className="bg-[#0C0C0E]/90 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 shadow-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Locate Me"
          >
            <MapPin size={16} />
          </button>
          <button 
            onClick={() => setShowStations(!showStations)}
            className={`bg-[#0C0C0E]/90 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 shadow-lg flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${showStations ? 'text-white' : 'text-slate-500'}`}
          >
            <Layers size={14} className={showStations ? 'text-green-400' : ''} /> 
            Stops
          </button>
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={[-33.8688, 151.2093]}
        zoom={11}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapController center={center} onZoom={setZoomLevel} />
        {premium ? (
          <VectorBasemap />
        ) : isDark ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={cartoTiles('dark_all')}
          />
        ) : (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={cartoTiles('rastertiles/voyager_nolabels')}
              className="day-tiles"
            />
            <TileLayer url={cartoTiles('rastertiles/voyager_only_labels')} />
          </>
        )}

        {/* Render Stations / Stops */}
        {stationMarkers}

        {/* Origin station — premium amber pin */}
        {origin?.lat && origin?.lng && (
          <Marker
            position={[origin.lat, origin.lng]}
            icon={getOriginIcon(origin.name)}
            zIndexOffset={1000}
          />
        )}

        {/* Render Vehicles */}
        {filteredTrains.map((train, index) => {
          const pos = train.vehicle?.position;
          if (!pos?.latitude || !pos?.longitude) return null;

          const vehicleType = train._type;
          const routeId = train.vehicle?.trip?.routeId;
          const trainId = vehicleId(train, index);
          const stopId = train.vehicle?.stopId;
          const currentStop = formatStop(stopId);
          const routeInfo = formatRoute(routeId, vehicleType);
          const speed = train.vehicle?.position?.speed ? Math.round(train.vehicle.position.speed * 3.6) : null;

          return (
            <Marker
              key={trainId}
              position={firstPos.current.get(trainId) ?? [pos.latitude, pos.longitude]}
              icon={getTrainIcon(routeId, vehicleType, vehicleSizeForZoom(zoomLevel))}
              ref={getRefSetter(trainId)}
            >
            <Popup className="rounded-xl min-w-[200px]">
              <div className="flex flex-col gap-2 p-1">
                <div className="font-bold text-sm tracking-tight flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{backgroundColor: routeInfo.color}}
                    ></div>
                    <span style={{color: routeInfo.color}}>{routeInfo.name}</span>
                  </div>
                  {routeId && <span className="text-xs text-muted-foreground opacity-70 ml-5 flex items-center">{routeId}</span>}
                </div>
                
                <div className="flex flex-col gap-1 mt-1 text-sm bg-slate-900 text-slate-200 p-2 rounded-lg">
                  {currentStop && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs uppercase tracking-wider">At/Near</span>
                      <span className="font-medium">{currentStop}</span>
                    </div>
                  )}
                  {speed !== null && speed > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs uppercase tracking-wider">Speed</span>
                      <span className="font-medium">{speed} km/h</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center opacity-50 mt-1 pt-1 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-mono">Trip ID</span>
                    <span className="text-[10px] font-mono" title={train.vehicle?.trip?.tripId}>{train.vehicle?.trip?.tripId?.split('.')[0] || "Unknown"}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
    </div>
  );
}
