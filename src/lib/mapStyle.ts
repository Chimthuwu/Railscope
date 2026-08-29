// Custom MapLibre GL style for RailScope's dark map.
// Vector tiles + glyphs + sprite from CARTO's free basemap CDN (no key, CORS-ok),
// OpenMapTiles schema. Palette: midnight navy -> indigo -> cyan, with glow passes
// on the motorways and an amber accent reserved for the origin pin (drawn by Leaflet).

const CARTO = "https://tiles.basemaps.cartocdn.com";
const VEC = "https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt";

const road = (
  id: string,
  filter: any,
  color: any,
  width: any,
  extra: Record<string, any> = {},
) => ({
  id,
  type: "line" as const,
  source: "carto",
  "source-layer": "transportation",
  filter,
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": color, "line-width": width, ...extra },
});

// `hideNames` = place labels to suppress (lower-cased) — we pass the station list
// so a suburb name doesn't sit on top of its own station marker's label.
export const buildMapStyle = (hideNames: string[] = []) => {
  const hidden = hideNames.map((n) => n.toLowerCase());
  const notAStation: any = [
    "!",
    ["in", ["downcase", ["to-string", ["coalesce", ["get", "name"], ""]]], ["literal", hidden]],
  ];

  return ({
    version: 8,
    glyphs: `${CARTO}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${CARTO}/gl/dark-matter-gl-style/sprite`,
    sources: {
      carto: {
        type: "vector",
        tiles: [VEC, VEC.replace("tiles-a", "tiles-b"), VEC.replace("tiles-a", "tiles-c"), VEC.replace("tiles-a", "tiles-d")],
        minzoom: 0,
        maxzoom: 14,
        attribution: '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#070b16" } },

      // ── land ──────────────────────────────────────────────
      {
        id: "landcover",
        type: "fill",
        source: "carto",
        "source-layer": "landcover",
        paint: { "fill-color": "#0b1220", "fill-opacity": 0.6 },
      },
      {
        id: "landuse-residential",
        type: "fill",
        source: "carto",
        "source-layer": "landuse",
        filter: ["==", "class", "residential"],
        paint: { "fill-color": "#0a1120", "fill-opacity": 0.5 },
      },
      {
        id: "park",
        type: "fill",
        source: "carto",
        "source-layer": "park",
        paint: { "fill-color": "#0f2a24", "fill-opacity": 0.55 },
      },
      {
        id: "park-outline",
        type: "line",
        source: "carto",
        "source-layer": "park",
        paint: { "line-color": "#1c4a3d", "line-width": 0.6, "line-opacity": 0.5 },
      },
      {
        id: "landuse-green",
        type: "fill",
        source: "carto",
        "source-layer": "landuse",
        filter: ["in", "class", "grass", "wood", "forest", "meadow", "nature_reserve"],
        paint: { "fill-color": "#102420", "fill-opacity": 0.5 },
      },

      // ── water ─────────────────────────────────────────────
      {
        id: "water",
        type: "fill",
        source: "carto",
        "source-layer": "water",
        paint: { "fill-color": "#081a2e" },
      },
      {
        id: "water-edge",
        type: "line",
        source: "carto",
        "source-layer": "water",
        paint: {
          "line-color": "#1e5f86",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 1.6],
          "line-opacity": 0.55,
          "line-blur": 0.6,
        },
      },
      {
        id: "waterway",
        type: "line",
        source: "carto",
        "source-layer": "waterway",
        paint: { "line-color": "#123049", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 2] },
      },

      // ── buildings ─────────────────────────────────────────
      {
        id: "building",
        type: "fill",
        source: "carto",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": ["interpolate", ["linear"], ["zoom"], 13, "#111a2e", 16, "#16203a"],
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 13.6, 0.7],
          "fill-outline-color": "#20304f",
        },
      },

      // ── roads: glow pass, then body, then highlight ───────
      road(
        "rail",
        ["==", "class", "rail"],
        "#3a3f7d",
        ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 2.4],
        { "line-dasharray": [2, 2.5], "line-opacity": 0.7 },
      ),
      road(
        "minor",
        ["in", "class", "minor", "service", "track"],
        "#1c2942",
        ["interpolate", ["linear"], ["zoom"], 12, 0.5, 18, 4],
      ),
      road(
        "secondary",
        ["in", "class", "secondary", "tertiary"],
        "#26374f",
        ["interpolate", ["linear"], ["zoom"], 9, 0.5, 18, 5],
      ),
      road(
        "primary",
        ["in", "class", "primary", "trunk"],
        "#345574",
        ["interpolate", ["linear"], ["zoom"], 8, 0.8, 18, 7],
      ),

      // motorway — three soft passes: a wide dim indigo haze, a muted blue body,
      // and a thin cooler core. Reads as a gently lit blue road, not a neon tube.
      road(
        "motorway-glow",
        ["==", "class", "motorway"],
        "#274a86",
        ["interpolate", ["linear"], ["zoom"], 7, 3, 14, 12, 18, 22],
        { "line-blur": 7, "line-opacity": 0.5 },
      ),
      road(
        "motorway-body",
        ["==", "class", "motorway"],
        // subtly shifts deep-blue -> cyan as you zoom in
        ["interpolate", ["linear"], ["zoom"], 9, "#33608f", 13, "#3f83c0", 16, "#49b0d6"],
        ["interpolate", ["linear"], ["zoom"], 7, 1, 14, 4, 18, 9],
      ),
      road(
        "motorway-hl",
        ["==", "class", "motorway"],
        "#6fb5e0",
        ["interpolate", ["linear"], ["zoom"], 11, 0.3, 14, 1, 18, 2.4],
        { "line-opacity": 0.5 },
      ),

      // interchanges / ramps — a restrained indigo tint
      road(
        "ramp",
        ["all", ["==", "ramp", 1], ["in", "class", "motorway", "trunk", "primary"]],
        "#5a54ad",
        ["interpolate", ["linear"], ["zoom"], 12, 0.8, 18, 5],
        { "line-blur": 1, "line-opacity": 0.7 },
      ),

      // ── boundaries ────────────────────────────────────────
      {
        id: "boundary",
        type: "line",
        source: "carto",
        "source-layer": "boundary",
        filter: ["<=", "admin_level", 4],
        paint: { "line-color": "#2b3557", "line-width": 0.7, "line-dasharray": [3, 3], "line-opacity": 0.6 },
      },

      // ── labels ────────────────────────────────────────────
      {
        id: "label-road-minor",
        type: "symbol",
        source: "carto",
        "source-layer": "transportation_name",
        minzoom: 13,
        filter: ["in", "class", "minor", "service", "secondary", "tertiary"],
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 13, 9, 18, 12],
        },
        paint: { "text-color": "#8ea6c8", "text-halo-color": "#080d18", "text-halo-width": 1.2 },
      },
      {
        id: "label-road-major",
        type: "symbol",
        source: "carto",
        "source-layer": "transportation_name",
        minzoom: 10,
        filter: ["in", "class", "motorway", "trunk", "primary"],
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Semibold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 18, 14],
          "text-letter-spacing": 0.02,
        },
        paint: { "text-color": "#eaf2ff", "text-halo-color": "#060b14", "text-halo-width": 1.6 },
      },
      {
        id: "label-water",
        type: "symbol",
        source: "carto",
        "source-layer": "water_name",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Italic"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 14, 15],
        },
        paint: { "text-color": "#3f7098", "text-halo-color": "#060f1a", "text-halo-width": 1 },
      },
      {
        id: "label-place-small",
        type: "symbol",
        source: "carto",
        "source-layer": "place",
        filter: [
          "all",
          ["match", ["get", "class"], ["suburb", "suburbs", "neighbourhood", "hamlet", "village"], true, false],
          notAStation,
        ],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Semibold"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.14,
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 13],
        },
        paint: { "text-color": "#aebdd9", "text-halo-color": "#070c16", "text-halo-width": 1.4 },
      },
      {
        id: "label-place-large",
        type: "symbol",
        source: "carto",
        "source-layer": "place",
        filter: [
          "all",
          ["match", ["get", "class"], ["city", "town"], true, false],
          notAStation,
        ],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Bold"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.18,
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 12, 15, 22],
        },
        paint: { "text-color": "#e6ecfb", "text-halo-color": "#060a13", "text-halo-width": 1.8 },
      },
    ],
  }) as any;
};
