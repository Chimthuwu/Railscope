import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Train, Bus, MapPin, Layers } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { stations } from "../data/stations";
import { useTheme } from "next-themes";

// Route ID formatting
const formatRoute = (routeId?: string, type?: string) => {
  if (type === "bus") {
    // Clean up bus route ID (e.g. from "2502_840" to "Bus 840" or just use route ID smartly)
    // Sometimes bus route IDs are separated by underscores. The actual route number is often the last part.
    let number = routeId ? routeId.split('_').pop() : "Unknown";
    return { name: `Bus ${number}`, color: "#00b5ef" }; // typical TfNSW bus colour
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

// Custom HTML icon using Lucide icons
const createCustomIcon = (routeId: string, type?: string) => {
  const routeInfo = formatRoute(routeId, type);
  const bgColor = routeInfo.color;
  
  const iconMarkup = renderToStaticMarkup(
    <div style={{ position: "relative", width: "32px", height: "32px" }}>
      <div className="live-pulse-beacon" style={{ backgroundColor: bgColor }}></div>
      <div style={{
        position: "relative",
        zIndex: 2,
        backgroundColor: bgColor,
        width: "32px", height: "32px",
        borderRadius: "50%", display: "flex",
        alignItems: "center", justifyContent: "center",
        border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        color: "white"
      }}>
        {type === "bus" ? <Bus size={18} strokeWidth={2.5} /> : <Train size={18} strokeWidth={2.5} />}
      </div>
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-train-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const createStationIcon = (type: string, name: string, showText: boolean) => {
  const isBus = type === "bus";
  const bgColor = isBus ? "#00b5ef" : "#f99d1c";

  // Using a very small dot for the station with the name next to it
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
        backgroundColor: "white",
        width: "12px", height: "12px",
        borderRadius: "50%",
        border: `3px solid ${bgColor}`,
        boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
        flexShrink: 0
      }}></div>
      {showText && (
        <div style={{
          fontSize: "12px",
          fontWeight: "800",
          color: "white",
          textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 -1px 4px rgba(0,0,0,0.9), 1px 0 4px rgba(0,0,0,0.9), -1px 0 4px rgba(0,0,0,0.9)",
          letterSpacing: "0.5px",
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
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6]
  });
};

const trainIconCache: Record<string, L.DivIcon> = {};
const getTrainIcon = (routeId: string, type?: string) => {
  const key = `${routeId}-${type}`;
  if (!trainIconCache[key]) {
    trainIconCache[key] = createCustomIcon(routeId, type);
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

export function TrainMap({ searchQuery = "", center }: { searchQuery?: string, center?: [number, number] }) {
  const [trains, setTrains] = useState<any[]>([]);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'both' | 'trains' | 'buses'>('both');
  const [showStations, setShowStations] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(11);
  const { resolvedTheme } = useTheme();

  // Map Updater sub-component to pan map
  const MapUpdater = ({ center }: { center?: [number, number] }) => {
    const map = useMap();
    useMapEvents({
      zoomend: () => setZoomLevel(map.getZoom())
    });
    useEffect(() => {
      const handlePan = (e: any) => {
        map.flyTo(e.detail, 15, { duration: 1.5 });
      };
      window.addEventListener('panTo', handlePan);
      if (center) {
        map.flyTo(center, 14, { duration: 1.5 });
      }
      return () => window.removeEventListener('panTo', handlePan);
    }, [center, map]);
    return null;
  };

  useEffect(() => {
    // Fetch initial data
    const fetchTrains = async () => {
      try {
        const res = await fetch(`/api/vehicles?type=${vehicleTypeFilter}`);
        const data = await res.json();
        if (data.entities) {
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

  const filteredTrains = trains.filter(t => {
    if (vehicleTypeFilter === 'trains' && t._type === 'bus') return false;
    if (vehicleTypeFilter === 'buses' && t._type === 'train') return false;

    if (!searchQuery) return true;
    const routeId = t.vehicle?.trip?.routeId?.toLowerCase() || "";
    const tripId = t.vehicle?.trip?.tripId?.toLowerCase() || "";
    const q = searchQuery.toLowerCase();
    return routeId.includes(q) || tripId.includes(q);
  });

  return (
    <div className="w-full h-full relative">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${vehicleTypeFilter === 'buses' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
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
        center={[-33.8688, 151.2093]} 
        zoom={11} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapUpdater center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={resolvedTheme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
        />

        {/* Render Stations / Stops */}
        {showStations && stations.map(station => {
          if (vehicleTypeFilter === 'trains' && station.type === 'bus') return null;
          if (vehicleTypeFilter === 'buses' && station.type === 'train') return null;
          
          if (!station.lat || !station.lng) return null;

          return (
            <Marker 
              key={station.id} 
              position={[station.lat, station.lng]}
              icon={getStationIcon(station.type || 'train', station.name, zoomLevel >= 13)}
            >
              <Popup className="rounded-xl">
                <div className="font-semibold text-sm px-1 py-0.5">
                  <div className="flex items-center gap-2">
                    {station.type === 'bus' ? <Bus size={12} className="text-cyan-500" /> : <Train size={12} className="text-orange-500" />}
                    {station.name}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Vehicles */}
        {filteredTrains.map((train, index) => {
          const pos = train.vehicle?.position;
          if (!pos?.latitude || !pos?.longitude) return null;
          
          const vehicleType = train._type;
          const routeId = train.vehicle?.trip?.routeId;
          const trainId = train.id || train.vehicle?.vehicle?.id || train.vehicle?.trip?.tripId || `train-${index}`;
          const stopId = train.vehicle?.stopId;
          const currentStop = formatStop(stopId);
          const routeInfo = formatRoute(routeId, vehicleType);
          const speed = train.vehicle?.position?.speed ? Math.round(train.vehicle.position.speed * 3.6) : null;
          
          return (
            <Marker 
              key={trainId} 
              position={[pos.latitude, pos.longitude]}
              icon={getTrainIcon(routeId, vehicleType)}
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
