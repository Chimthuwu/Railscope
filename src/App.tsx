import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TrainMap } from "./components/Map";
import { LiveFeed as LiveFeedSection } from "./components/LiveFeed";
import { Feed } from "./components/Feed";
import { Search, Train, Heart, Map as MapIcon, MapPin, ArrowLeft, Home, Sun, Moon, ArrowUpDown, MessageSquare, Download, Monitor, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { stations } from "./data/stations";
import { motion, AnimatePresence } from "motion/react";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200"
    >
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="h-5 w-5 hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<'home' | 'favourites' | 'map' | 'feed'>('home');
  const [fromStation, setFromStation] = useState<any>(null);
  const [toStation, setToStation] = useState<any>(null);
  const [homeStation, setHomeStation] = useState<any>(() => {
    const saved = localStorage.getItem('homeStation');
    return saved ? JSON.parse(saved) : null;
  });
  const [favourites, setFavourites] = useState<any[]>(() => {
    const saved = localStorage.getItem('favourites');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedJourneys, setSavedJourneys] = useState<any[]>(() => {
    const saved = localStorage.getItem('savedJourneys');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          console.log('App installed');
        }
        setDeferredPrompt(null);
      });
    } else {
      alert("To install RailScope as an App on your desktop/mobile:\n\n1. Click your browser menu (3 dots or Install icon near the address bar).\n2. Click 'Install RailScope' or 'Install page as app'.");
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-AU";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      console.error("Speech error", e);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const cleaned = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
      setSearchQuery(cleaned);
    };

    recognition.start();
  };

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: searchResults.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    let localMatches = [...stations];
    
    if (q) {
      localMatches = localMatches.filter(s => s.name.toLowerCase().includes(q));
      localMatches.sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();
        const aStarts = aLower.startsWith(q);
        const bStarts = bLower.startsWith(q);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aLower.localeCompare(bLower);
      });
    } else {
      localMatches.sort((a, b) => a.name.localeCompare(b.name));
    }

    setSearchResults(localMatches);

    if (searchQuery.length < 3) {
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/stations?q=${encodeURIComponent(searchQuery)}`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
          const contentType = r.headers.get("content-type");
          if (contentType && !contentType.includes("application/json")) {
            throw new Error("Received HTML instead of JSON. The server backend is likely not running.");
          }
          return r.json();
        })
        .then(data => {
          if (data.locations) {
            setSearchResults(prev => {
              const merged = [...prev];
              for (const loc of data.locations) {
                if (!merged.some(m => m.id === loc.id || m.name === loc.name)) {
                  merged.push(loc);
                }
              }
              return merged;
            });
          }
          setSearching(false);
        })
        .catch(e => {
          console.error("Search failed", e);
          setSearching(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleFavourite = (station: any) => {
    const newFavs = favourites.some(f => f.id === station.id)
      ? favourites.filter(f => f.id !== station.id)
      : [...favourites, station];
    setFavourites(newFavs);
    localStorage.setItem('favourites', JSON.stringify(newFavs));
  };

  const toggleSavedJourney = (origin: any, dest: any) => {
    const id = `${origin.id}-${dest.id}`;
    let newJourneys;
    if (savedJourneys.some((j: any) => j.id === id)) {
      newJourneys = savedJourneys.filter((j: any) => j.id !== id);
    } else {
      newJourneys = [...savedJourneys, { id, origin, dest }];
    }
    setSavedJourneys(newJourneys);
    localStorage.setItem('savedJourneys', JSON.stringify(newJourneys));
  };


  return (
    <div className="w-full h-[100dvh] bg-white dark:bg-[#09090B] text-slate-800 dark:text-slate-200 flex flex-col font-sans overflow-hidden relative transition-colors duration-300">
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onAnimationComplete={(definition) => {
              // This runs only when exit animation completes? No, it runs on enter too if wait isn't used
              // It's safer to just let AnimatePresence handle the unmount and do a setTimeout if we wanted manual.
            }}
            className="fixed inset-0 z-[100] bg-white dark:bg-[#09090B] flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-6">
               <motion.img 
                  src="https://i.ibb.co/JRdwvYJ4/just-logo.png" 
                  alt="RailScope Logo Mark" 
                  className="h-20 md:h-24 dark:invert" 
                  initial={{ rotate: -1080, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ scale: 25, opacity: 0, transition: { duration: 0.6, ease: "easeIn" } }}
                  transition={{ 
                    rotate: { duration: 1.2, ease: "easeOut" },
                    scale: { duration: 0.8, ease: "backOut" }
                  }}
               />
               <motion.img 
                  src="https://i.ibb.co/LdYh8g1f/just-text.png" 
                  alt="RailScope Text" 
                  className="h-8 md:h-10 dark:invert" 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 2, transition: { duration: 0.4 } }}
                  transition={{ 
                    delay: 0.3, 
                    duration: 0.5, 
                    ease: "easeOut"
                  }}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="h-14 shrink-0 border-b border-black/10 dark:border-white/5 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md z-40 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <img src="https://i.ibb.co/hJrGsCkQ/logo-and-text.png" alt="RailScope Logo" className="h-8 dark:invert" />
          <div className="h-4 w-px bg-black/10 dark:bg-white/10 hidden sm:block mx-1"></div>
          <div className="flex items-center gap-2">
            <a 
              href="https://github.com/Chimthuwu/Railscope/releases/download/v1/Railscope-Android.apk" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full transition-colors"
              title="Download Android APK"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Android</span>
            </a>
            <button 
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full transition-colors shadow-sm"
              title="Install RailScope as Desktop / Mobile App"
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'home' && (
          <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto p-4 sm:p-6">
            {fromStation && toStation ? (
              <div className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-300">
                <button 
                  onClick={() => { setFromStation(null); setToStation(null); }}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors mb-4 w-fit"
                >
                  <ArrowLeft size={16} />
                  <span className="text-sm font-medium">New Search</span>
                </button>

                <div className="bg-slate-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 mb-6 relative overflow-hidden shrink-0 transition-colors duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-slate-400 dark:text-white">
                    <Train size={64} />
                  </div>
                  <div className="relative z-10 flex items-center justify-between pr-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
                          <MapPin size={12} />
                        </div>
                        <span className="text-black dark:text-white font-medium">{fromStation.name}</span>
                      </div>
                      <div className="ml-3 w-px h-4 bg-black/10 dark:bg-white/10"></div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center border border-purple-500/20 dark:border-purple-500/30 text-purple-600 dark:text-purple-400">
                          <MapPin size={12} />
                        </div>
                        <span className="text-black dark:text-white font-medium">{toStation.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 isolate">
                      <button 
                        onClick={() => toggleSavedJourney(fromStation, toStation)}
                        className="w-10 h-10 rounded-full bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-700 hover:text-black dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
                        title="Save Journey"
                      >
                        <Heart size={18} className={savedJourneys.some(j => j.id === `${fromStation.id}-${toStation.id}`) ? "fill-pink-500 text-pink-500" : ""} />
                      </button>
                      <button 
                        onClick={() => {
                          const temp = fromStation;
                          setFromStation(toStation);
                          setToStation(temp);
                        }}
                        className="w-10 h-10 rounded-full bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-700 hover:text-black dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
                        title="Swap direction"
                      >
                        <ArrowUpDown size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 bg-slate-100/50 dark:bg-black/20 rounded-2xl border border-black/10 dark:border-white/5 p-4 flex flex-col overflow-hidden transition-colors duration-300">
                  <LiveFeedSection station={fromStation} toStation={toStation} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-300">
                <div className="mb-6 space-y-3 shrink-0">
                  <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-2">
                    {!fromStation ? "Where are you travelling from?" : "Where are you travelling to?"}
                  </h2>

                  {homeStation && !fromStation && (
                    <button 
                      onClick={() => {
                        setFromStation(homeStation);
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 border border-blue-200 dark:border-blue-500/30 rounded-xl text-left transition-colors text-blue-700 dark:text-blue-300 font-semibold"
                    >
                      <Home size={18} />
                      <span>Start from Home ({homeStation.name})</span>
                    </button>
                  )}

                  {fromStation && (
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-[#1A1A24] border border-black/10 dark:border-white/10 rounded-xl p-3 shadow-sm dark:shadow-inner transition-colors duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30">
                          <MapPin size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">From</p>
                          <p className="text-black dark:text-white font-medium leading-none">{fromStation.name}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setFromStation(null)}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <div className="relative shadow-sm dark:shadow-lg dark:shadow-black/20">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <Input 
                      className="pl-12 pr-12 h-14 bg-white dark:bg-[#1A1A24] border-black/10 dark:border-white/10 text-black dark:text-white rounded-xl text-base shadow-sm focus-visible:ring-blue-500/50 transition-colors duration-300"
                      placeholder={!fromStation ? "Search your origin station..." : "Search your destination..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleVoiceSearch}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse scale-110 shadow-lg shadow-red-500/50' : 'text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                      title={isListening ? "Listening... Speak station name" : "Voice Search (Speak station name)"}
                    >
                      <Mic size={18} />
                    </button>
                  </div>
                </div>

                <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-3 shrink-0 flex justify-between">
                  <span>All Stations</span>
                  {searching && <span className="text-blue-600 dark:text-blue-400 animate-pulse">Searching...</span>}
                </h3>
                <div className="flex-1 min-h-0 -mx-2 px-2 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }} ref={parentRef}>
                  {searchResults.length === 0 && !searching ? (
                    <div className="text-center py-10 text-slate-600 dark:text-slate-400">
                      No stations found.
                    </div>
                  ) : (
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const s = searchResults[virtualItem.index];
                        const isFav = favourites.some((f: any) => f.id === s.id);
                        return (
                          <div
                            key={virtualItem.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                          >
                            <div className="flex items-center gap-2 group border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors h-[68px]">
                              <button 
                                onPointerDown={(e) => {
                                  e.preventDefault(); // Crucial for iOS: prevents keyboard dismiss from swallowing the tap
                                  if (!fromStation) {
                                    setFromStation(s);
                                  } else {
                                    setToStation(s);
                                  }
                                  setSearchQuery("");
                                }}
                                onClick={() => {
                                  if (!fromStation) {
                                    setFromStation(s);
                                  } else {
                                    setToStation(s);
                                  }
                                  setSearchQuery("");
                                }}
                                className="flex-1 flex items-center gap-4 p-3.5 text-left h-full select-none"
                              >
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
                                  <Train size={18} />
                                </div>
                                <span className="text-slate-700 dark:text-slate-200 font-medium text-base group-hover:text-black dark:group-hover:text-white transition-colors truncate">{s.name}</span>
                              </button>
                              <button 
                                onClick={() => toggleFavourite(s)}
                                title="Toggle Favourite"
                                className={`p-3 transition-colors rounded-full ${isFav ? 'text-pink-500 hover:text-pink-600 bg-pink-50 dark:bg-pink-500/10' : 'text-slate-300 dark:text-slate-600 hover:text-pink-400 dark:hover:text-slate-400 group-hover:bg-black/5 dark:group-hover:bg-white/5'}`}
                              >
                                <Heart size={18} className={isFav ? "fill-current" : ""} />
                              </button>
                              <button 
                                onClick={() => {
                                  const newHome = homeStation?.id === s.id ? null : s;
                                  setHomeStation(newHome);
                                  if (newHome) localStorage.setItem('homeStation', JSON.stringify(newHome));
                                  else localStorage.removeItem('homeStation');
                                }}
                                title="Set as Home"
                                className={`p-3 mr-2 transition-colors rounded-full ${homeStation?.id === s.id ? 'text-yellow-500 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-500 dark:hover:text-slate-400 group-hover:bg-black/5 dark:group-hover:bg-white/5'}`}
                              >
                                <Home size={18} className={homeStation?.id === s.id ? "fill-current" : ""} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favourites' && (
          <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-6 shrink-0">Favourites</h2>
            {favourites.length === 0 && savedJourneys.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl transition-colors duration-300">
                <div className="text-center p-6">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No favourites saved yet.<br/><span className="text-sm opacity-70">Tap the heart next to a station or journey to add it here.</span></p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pb-4 scrollbar-hide">
                {savedJourneys.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Saved Journeys</h3>
                    {savedJourneys.map(j => (
                      <div key={j.id} className="group flex items-center justify-between border border-black/5 dark:border-white/10 hover:border-purple-500/30 bg-slate-50 hover:bg-white dark:bg-[#1A1A24] dark:hover:bg-[#20202C] rounded-2xl p-2 pr-4 shadow-sm transition-all duration-200 cursor-pointer"
                           onClick={() => {
                             setFromStation(j.origin);
                             setToStation(j.dest);
                             setActiveTab('home');
                           }}>
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                            <Train size={24} />
                          </div>
                          <div className="min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-1.5 font-semibold text-black dark:text-white text-base leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              <span className="truncate max-w-[200px]">{j.origin.name}</span>
                              <ArrowLeft size={14} className="rotate-180 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{j.dest.name}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Tap to view journey
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleSavedJourney(j.origin, j.dest); }}
                          className="p-3 text-pink-500 hover:text-pink-600 bg-pink-50 hover:bg-pink-100 dark:bg-pink-500/10 dark:hover:bg-pink-500/20 rounded-full transition-colors shrink-0"
                          title="Remove from favourites"
                        >
                          <Heart size={20} className="fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {favourites.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Saved Stations</h3>
                    {favourites.map(s => (
                      <div key={s.id} className="group flex items-center justify-between border border-black/5 dark:border-white/10 hover:border-blue-500/30 bg-slate-50 hover:bg-white dark:bg-[#1A1A24] dark:hover:bg-[#20202C] rounded-2xl p-2 pr-4 shadow-sm transition-all duration-200 cursor-pointer"
                           onClick={() => {
                             if (!fromStation) { setFromStation(s); setActiveTab('home'); }
                             else { setToStation(s); setActiveTab('home'); }
                           }}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                            <Train size={24} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-black dark:text-white text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{s.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {!fromStation ? "Tap to depart from here" : `Tap to arrive at ${s.name}`}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFavourite(s); }}
                          className="p-3 text-pink-500 hover:text-pink-600 bg-pink-50 hover:bg-pink-100 dark:bg-pink-500/10 dark:hover:bg-pink-500/20 rounded-full transition-colors"
                          title="Remove from favourites"
                        >
                          <Heart size={20} className="fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="flex-1 relative animate-in fade-in duration-300">
            <TrainMap searchQuery="" center={fromStation ? [fromStation.lat, fromStation.lng] : undefined} />
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="flex-1 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1A1A24]">
              <Feed />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 h-16 border-t border-black/10 dark:border-white/5 bg-white/95 dark:bg-[#0C0C0E]/95 backdrop-blur-xl w-full flex items-center justify-around px-4 sm:px-10 z-50 transition-colors duration-300 pb-[env(safe-area-inset-bottom)] box-content">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1.5 w-16 md:w-20 transition-colors ${activeTab === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <Search size={22} className={activeTab === 'home' ? 'fill-blue-500/20' : ''} />
          <span className="text-[10px] font-bold tracking-wider uppercase">Search</span>
        </button>
        <button onClick={() => setActiveTab('favourites')} className={`flex flex-col items-center gap-1.5 w-16 md:w-20 transition-colors ${activeTab === 'favourites' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <Heart size={22} className={activeTab === 'favourites' ? 'fill-blue-500/20' : ''} />
          <span className="text-[10px] font-bold tracking-wider uppercase">Saved</span>
        </button>
        <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1.5 w-16 md:w-20 transition-colors ${activeTab === 'feed' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <MessageSquare size={22} className={activeTab === 'feed' ? 'fill-blue-500/20' : ''} />
          <span className="text-[10px] font-bold tracking-wider uppercase">Feed</span>
        </button>
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1.5 w-16 md:w-20 transition-colors ${activeTab === 'map' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <MapIcon size={22} className={activeTab === 'map' ? 'fill-blue-500/20' : ''} />
          <span className="text-[10px] font-bold tracking-wider uppercase">Map</span>
        </button>
      </nav>
    </div>
  );
}
