import { Capacitor } from '@capacitor/core';

export const getApiBase = () => {
  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  // Native builds (Android / Electron) have no same-origin backend, so they call
  // the hosted API proxy directly. Web builds use same-origin ('') Cloudflare Functions.
  return (isCapacitor || isElectron) ? 'https://railscope-l98d.onrender.com' : '';
};
export const API_BASE = getApiBase();
