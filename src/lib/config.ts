import { Capacitor } from '@capacitor/core';

export const getApiBase = () => {
  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  return (isCapacitor || isElectron) ? 'https://railscope.pages.dev' : '';
};
export const API_BASE = getApiBase();
