import { Capacitor } from '@capacitor/core';

const RENDER_API = 'https://railscope-l98d.onrender.com';

const isNative = () => {
  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  return isCapacitor || isElectron;
};

export const getApiBase = () => {
  // Native builds (Android / Electron) have no same-origin backend, so they call
  // the hosted API proxy directly. Web builds use same-origin ('') Cloudflare Functions.
  return isNative() ? RENDER_API : '';
};
export const API_BASE = getApiBase();

// Cloudflare Pages has no /api/vehicles function — decoding the GTFS-Realtime
// protobuf feed needs a Node runtime — so the live vehicle map always talks to
// the Render backend (Express server.ts). Local `npm run dev` uses same-origin.
export const VEHICLES_API_BASE = import.meta.env.DEV && !isNative() ? '' : RENDER_API;

// Free CARTO basemap key (https://carto.com/basemaps/apikey), inlined at build time.
// Set VITE_CARTO_API_KEY wherever the frontend is BUILT (Cloudflare Pages / Render
// build env vars, or .env locally). Lock the key to your domains in the CARTO dashboard.
export const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';
