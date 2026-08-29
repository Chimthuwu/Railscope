import { useState, useEffect } from "react";
import { API_BASE } from "../lib/config";
import { Navigation, Activity, Train, ChevronLeft, MapPin, Bus } from "lucide-react";
import { getServiceLineMeta } from "../lib/lineColors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export function LiveFeed({ station, toStation }: { station: any, toStation?: any }) {
  const [departures, setDepartures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOvernight, setIsOvernight] = useState(false);
  
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [tripStops, setTripStops] = useState<any[]>([]);
  const [tripLoading, setTripLoading] = useState(false);

  useEffect(() => {
    if (!station?.tfnsw_id && !station?.id) return;
    setLoading(true);
    
    if (toStation) {
      const originParam = encodeURIComponent(String(station.tfnsw_id || station.id));
      const destParam = encodeURIComponent(String(toStation.tfnsw_id || toStation.id));
      fetch(`${API_BASE}/api/journeys?origin=${originParam}&destination=${destParam}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
          const contentType = r.headers.get("content-type");
          if (contentType && !contentType.includes("application/json")) {
            throw new Error("Received HTML instead of JSON. The server backend is likely not running.");
          }
          return r.json();
        })
        .then((data) => {
          if (data.journeys) {
            setIsOvernight(!!data.isOvernightFallback);
            const mapped = data.journeys.map((j: any) => {
              const leg = j.legs?.find((l: any) => {
                const pClass = l.transportation?.product?.class;
                return pClass === 1 || pClass === 2 || pClass === 5;
              }) || j.legs?.[0];
              if (!leg) return null;
              return {
                departureTimePlanned: leg.origin?.departureTimePlanned,
                departureTimeEstimated: leg.origin?.departureTimeEstimated,
                realtimeStatus: leg.origin?.departureTimeEstimated ? ['MONITORED'] : undefined,
                location: leg.origin,
                transportation: leg.transportation || leg.transport,
                properties: leg.properties,
                isJourney: true,
                leg: leg,
                journeyStops: leg.stopSequence
              };
            }).filter(Boolean);
            setDepartures(mapped);
          }
          setLoading(false);
        })
        .catch((e) => {
          console.error("Failed to fetch journeys", e);
          setLoading(false);
        });
    } else {
      const stopParam = encodeURIComponent(String(station.tfnsw_id || station.id));
      fetch(`${API_BASE}/api/departures/${stopParam}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
          const contentType = r.headers.get("content-type");
          if (contentType && !contentType.includes("application/json")) {
            throw new Error("Received HTML instead of JSON. The server backend is likely not running.");
          }
          return r.json();
        })
        .then((data) => {
          if (data.events) {
            setIsOvernight(!!data.isOvernightFallback);
            setDepartures(data.events);
          }
          setLoading(false);
        })
        .catch((e) => {
          console.error("Failed to fetch departures", e);
          setLoading(false);
        });
    }
  }, [station, toStation]);

  const handleSelectTrip = (trip: any) => {
    setSelectedTrip(trip);
    setTripLoading(true);
    setTripStops([]);

    if (trip.isJourney && trip.journeyStops) {
      setTripStops(trip.journeyStops);
      setTripLoading(false);
      return;
    }

    const planned = trip.departureTimePlanned; 
    let dateParam = "";
    let timeParam = "";

    if (planned) {
      const d = new Date(planned);
      const year = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' });
      const month = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: '2-digit' });
      const day = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' });
      dateParam = `${year}${month}${day}`;
      const tStr = new Intl.DateTimeFormat('en-AU', {timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false}).format(d);
      timeParam = tStr.replace(/:/g, '');
    }

    const realtimeTripId = trip.transportation?.properties?.RealtimeTripId || trip.properties?.RealtimeTripId || '';
    const gtfsTripId = trip.transportation?.properties?.gtfsTripId || trip.properties?.gtfsTripId || '';
    const dest = trip.transportation?.destination?.id || trip.transport?.destination?.id || '';

    const originParam = encodeURIComponent(String(station.tfnsw_id || station.id));
    const destParam = encodeURIComponent(String(dest));
    const rtIdParam = encodeURIComponent(String(realtimeTripId));
    const gtfsIdParam = encodeURIComponent(String(gtfsTripId));

    fetch(`${API_BASE}/api/trip_details?origin=${originParam}&destination=${destParam}&date=${dateParam}&time=${timeParam}&realtimeTripId=${rtIdParam}&gtfsTripId=${gtfsIdParam}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        const contentType = r.headers.get("content-type");
        if (contentType && !contentType.includes("application/json")) {
          throw new Error("Received HTML instead of JSON. The server backend is likely not running.");
        }
        return r.json();
      })
      .then((data) => {
        if (data.stops) {
          setTripStops(data.stops);
        }
        setTripLoading(false);
      })
      .catch(e => {
        console.error(e);
        setTripLoading(false);
      });
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getEta = (isoString?: string) => {
    if (!isoString) return "-";
    const diff = Math.floor((new Date(isoString).getTime() - Date.now()) / 60000);
    if (diff <= 0) return "Due";
    return `${diff}m`;
  };

  if (selectedTrip) {
    const destName = selectedTrip.transportation?.destination?.name?.replace(/ Station.*/, '') || selectedTrip.transport?.name;
    
    return (
      <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-4 shrink-0 px-2 pt-2">
          <button 
            onClick={() => setSelectedTrip(null)}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} className="text-black dark:text-white" />
          </button>
          <div>
            <h3 className="text-sm font-bold text-black dark:text-white leading-tight">{destName}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest leading-tight">Service Details</p>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2 h-full">
          <div className="space-y-0.5 pb-4">
            {tripLoading ? (
              <div className="py-10 text-center">
                <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading stops...</p>
              </div>
            ) : tripStops.length > 0 ? (
              <div className="relative pl-6 py-2">
                <div className="absolute left-[33px] top-4 bottom-4 w-0.5 bg-black/5 dark:bg-white/5 rounded-full"></div>
                {tripStops.map((stop, i) => {
                  const sTime = stop.departureTimeEstimated || stop.departureTimePlanned || stop.arrivalTimeEstimated || stop.arrivalTimePlanned;
                  const isPast = sTime ? new Date(sTime).getTime() < Date.now() : false;
                  
                  return (
                    <div key={i} className={`flex items-center gap-4 relative py-2.5 ${isPast ? 'opacity-50' : ''}`}>
                      <div className="w-10 text-right shrink-0">
                        <span className="text-xs font-bold font-mono tracking-tighter text-slate-600 dark:text-slate-300">{formatTime(sTime)}</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full z-10 shrink-0 border-2 ${i === 0 ? 'bg-blue-500 border-blue-400/30 ring-4 ring-blue-500/10' : isPast ? 'bg-slate-200 dark:bg-[#16171B] border-black/20 dark:border-white/20' : 'bg-slate-100 dark:bg-[#16171B] border-black/10 dark:border-white/40'}`}></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate block">
                          {stop.name?.split(',')[0].replace(' Station', '')}
                        </span>
                        {stop.properties?.platformName && (
                          <span className="text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/20 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded block w-fit mt-1 leading-none">
                            {stop.properties.platformName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs bg-black/5 dark:bg-white/5 rounded-xl">
                Could not load stop sequence.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest pt-2 px-2">
          {toStation ? `${station?.name} to ${toStation.name}` : (station ? `${station.name} Departures` : "Live Feed")}
        </h3>
        {loading && <div className="w-3 h-3 border-2 border-black/20 dark:border-white/20 border-t-black/60 dark:border-t-white/60 rounded-full animate-spin"></div>}
      </div>
      
      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-slate-200/50 dark:bg-black/40 w-full grid grid-cols-2 h-10 p-1 mb-3 rounded-xl border border-black/5 dark:border-white/5 shrink-0">
          <TabsTrigger value="upcoming" className="rounded-lg text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A1A24] data-[state=active]:shadow-md data-[state=active]:text-black dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 transition-all border border-transparent data-[state=active]:border-black/5 dark:data-[state=active]:border-white/10">
            <Navigation size={12} className="mr-1.5" /> Upcoming
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-lg text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A1A24] data-[state=active]:shadow-md data-[state=active]:text-black dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 transition-all border border-transparent data-[state=active]:border-black/5 dark:data-[state=active]:border-white/10">
            <Activity size={12} className="mr-1.5" /> Alerts
          </TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1 px-1 h-full">
          <TabsContent value="upcoming" className="mt-0 space-y-2 pb-4">
            {!station && (
              <div className="text-center text-slate-500 text-xs py-8 px-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                Search and select a station to view real-time departures.
              </div>
            )}
            
            {isOvernight && departures.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <span className="text-base leading-none">🌙</span>
                <span>Late-night services ended. Showing first upcoming morning services.</span>
              </div>
            )}

            {station && departures.length === 0 && !loading && (
              <div className="text-center text-slate-500 text-xs py-8 px-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                No departures found for {station.name}
              </div>
            )}

            {departures.map((d, i) => {
              const time = d.departureTimeEstimated || d.departureTimePlanned;
              const isLate = d.departureTimeEstimated && d.departureTimePlanned && new Date(d.departureTimeEstimated).getTime() > new Date(d.departureTimePlanned).getTime() + 60000;
              const status = isLate ? "Delayed" : "On Time";
              
              const meta = getServiceLineMeta(d, station?.name);

              let platform = d.location?.properties?.platformName;
              if (!platform) {
                  const m = d.location?.name?.match(/Platform (\d+)/i);
                  if (m) platform = m[1];
                  else if (d.location?.disassembledName) {
                      const m2 = d.location.disassembledName.match(/Platform (\d+)/i);
                      if (m2) platform = m2[1];
                  }
              }
              if (!platform) platform = "?";
              else platform = platform.replace('Platform ', '');

              return (
                <div key={i} onClick={() => handleSelectTrip(d)} className="flex items-center justify-between bg-white dark:bg-white/[0.03] p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer border border-black/10 dark:border-white/[0.05] hover:border-black/20 dark:hover:border-white/10 group shadow-sm dark:shadow-none">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 text-center font-bold text-slate-800 dark:text-slate-200 text-[13px] shrink-0 font-mono tracking-tighter">{formatTime(time)}</div>
                    <div className="w-1 h-7 rounded-full shrink-0 transition-colors" style={{ backgroundColor: isLate ? '#f59e0b' : meta.color }}></div>
                    <div className="flex flex-col min-w-0">
                      <div className="text-xs text-black dark:text-white font-semibold truncate sm:max-w-[140px] max-w-[110px]">
                        {d.transportation?.destination?.name?.replace(/ Station.*/, '') || d.transportation?.name || d.transport?.destination?.name?.replace(/ Station.*/, '') || d.transport?.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {meta.isBus ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 rounded text-[9px] font-extrabold uppercase tracking-widest leading-none">
                            <Bus size={10} /> BUS
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest leading-none border" style={{ backgroundColor: `${meta.color}20`, borderColor: `${meta.color}40`, color: meta.color }}>
                            <Train size={10} /> {meta.code}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded text-[9px] font-bold uppercase tracking-widest leading-none">
                          Platform {platform}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm shrink-0">
                    <span className={isLate ? "text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider hidden sm:block" : "text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider hidden sm:block"}>{status}</span>
                    <div className="w-10 text-right font-bold text-black dark:text-white text-[13px]">{getEta(time)}</div>
                  </div>
                </div>
              );
            })}
          </TabsContent>
          
          <TabsContent value="alerts" className="mt-0 space-y-3 pb-4">
            <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl p-3.5 flex gap-3.5 items-start">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-500/20 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={14} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Active Alerts</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Network is running smoothly on this line.</div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
