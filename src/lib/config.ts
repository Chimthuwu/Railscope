export const getApiBase = () => {
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  return (isCapacitor || isElectron) ? 'https://railscope.pages.dev' : '';
};
export const API_BASE = getApiBase();
