/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Free CARTO basemap API key — https://carto.com/basemaps/apikey */
  readonly VITE_CARTO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
