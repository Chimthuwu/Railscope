// Custom MapLibre GL style for RailScope's map (dark + light).
// Vector tiles + glyphs from CARTO's free basemap CDN (no key, CORS-ok),
// OpenMapTiles schema. Dark = midnight navy / indigo / cyan. Light = a muted,
// warm daytime palette — never a blinding white. Parks read green in both.

const CARTO = "https://tiles.basemaps.cartocdn.com";
const VEC = "https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt";

type Palette = {
  bg: string;
  landcover: string; landcoverOp: number;
  residential: string; residentialOp: number;
  green: string; greenOp: number;
  park: string; parkOp: number;
  parkGlow: string; parkGlowOp: number;
  water: string; waterZoomedIn: string;
  waterGlow: string; waterGlowOp: number; waterEdge: string; waterEdgeOp: number;
  waterway: string;
  building: string; buildingHi: string; buildingOp: number; buildingOutline: string;
  roadMinor: string; roadSecondary: string; roadPrimary: string;
  motorGlow: string; motorGlowBlur: number; motorGlowOp: number;
  motorBody: [string, string, string]; motorHi: string; motorHiOp: number;
  ramp: string; rampOp: number;
  railGlow: string; railGlowOp: number; railLine: string; railLineOp: number; railTie: string; railTieOp: number;
  ferry: string; ferryOp: number;
  boundary: string; boundaryOp: number;
  lblRoadMinor: string; lblRoadMajor: string; lblWater: string; lblPlaceS: string; lblPlaceL: string;
  haloDark: string; haloLight: string;
};

const DARK: Palette = {
  bg: "#070b16",
  landcover: "#0b1220", landcoverOp: 0.6,
  residential: "#0a1120", residentialOp: 0.5,
  green: "#12271b", greenOp: 0.6,
  park: "#173d29", parkOp: 0.62,
  parkGlow: "#307d4f", parkGlowOp: 0.4,
  water: "#07182b", waterZoomedIn: "#08202f",
  waterGlow: "#2f7fa8", waterGlowOp: 0.3, waterEdge: "#3d92bd", waterEdgeOp: 0.7,
  waterway: "#1a4665",
  building: "#121b31", buildingHi: "#18233e", buildingOp: 0.85, buildingOutline: "#27375a",
  roadMinor: "#1c2942", roadSecondary: "#26374f", roadPrimary: "#345574",
  motorGlow: "#274a86", motorGlowBlur: 7, motorGlowOp: 0.5,
  motorBody: ["#33608f", "#3f83c0", "#49b0d6"], motorHi: "#6fb5e0", motorHiOp: 0.5,
  ramp: "#5a54ad", rampOp: 0.7,
  railGlow: "#4b52b0", railGlowOp: 0.3, railLine: "#7d84d8", railLineOp: 0.85, railTie: "#aeb4ee", railTieOp: 0.5,
  ferry: "#2f8f9a", ferryOp: 0.55,
  boundary: "#2b3557", boundaryOp: 0.6,
  lblRoadMinor: "#8497b7", lblRoadMajor: "#eaf2ff", lblWater: "#5390b8", lblPlaceS: "#a9b8d4", lblPlaceL: "#e6ecfb",
  haloDark: "#070c16", haloLight: "#070c16",
};

const LIGHT: Palette = {
  bg: "#e4e7e1",
  landcover: "#dde1d8", landcoverOp: 0.7,
  residential: "#e0e3dc", residentialOp: 0.6,
  green: "#cbdfbc", greenOp: 0.8,
  park: "#bcd8a7", parkOp: 0.85,
  parkGlow: "#94c079", parkGlowOp: 0.5,
  water: "#a9c8d9", waterZoomedIn: "#a9c8d9",
  waterGlow: "#89b4cb", waterGlowOp: 0.35, waterEdge: "#6e9fba", waterEdgeOp: 0.7,
  waterway: "#8cb2c6",
  building: "#d7dad2", buildingHi: "#dcdfd8", buildingOp: 0.85, buildingOutline: "#c3c7bd",
  roadMinor: "#dbded6", roadSecondary: "#cdd2c7", roadPrimary: "#bec5b7",
  motorGlow: "#c6d7e2", motorGlowBlur: 2, motorGlowOp: 0.5,
  motorBody: ["#a2bdd0", "#95b6cd", "#8ab2cb"], motorHi: "#cadcea", motorHiOp: 0.45,
  ramp: "#b3accb", rampOp: 0.6,
  railGlow: "#c3b3d6", railGlowOp: 0.3, railLine: "#8b80b1", railLineOp: 0.8, railTie: "#a99cc8", railTieOp: 0.5,
  ferry: "#5f9aa0", ferryOp: 0.5,
  boundary: "#b3b6ac", boundaryOp: 0.7,
  lblRoadMinor: "#6a7168", lblRoadMajor: "#3f453c", lblWater: "#487d97", lblPlaceS: "#59614f", lblPlaceL: "#383e34",
  haloDark: "#eef0ea", haloLight: "#f2f4ee",
};

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
export const buildMapStyle = (hideNames: string[] = [], mode: "dark" | "light" = "dark") => {
  const P = mode === "light" ? LIGHT : DARK;
  const hidden = hideNames.map((n) => n.toLowerCase());
  // Below z14 the station markers have no text, so suburb labels are fine.
  // At z14+ the station labels appear, so drop any suburb label that duplicates one.
  const notAStation: any = [
    "any",
    ["<", ["zoom"], 14],
    ["!", ["in", ["downcase", ["to-string", ["coalesce", ["get", "name"], ""]]], ["literal", hidden]]],
  ];

  return ({
    version: 8,
    glyphs: `${CARTO}/fonts/{fontstack}/{range}.pbf`,
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
      { id: "bg", type: "background", paint: { "background-color": P.bg } },

      // ── land ──────────────────────────────────────────────
      {
        id: "landcover",
        type: "fill",
        source: "carto",
        "source-layer": "landcover",
        paint: { "fill-color": P.landcover, "fill-opacity": P.landcoverOp },
      },
      {
        id: "landuse-residential",
        type: "fill",
        source: "carto",
        "source-layer": "landuse",
        filter: ["==", "class", "residential"],
        paint: { "fill-color": P.residential, "fill-opacity": P.residentialOp },
      },
      {
        id: "landuse-green",
        type: "fill",
        source: "carto",
        "source-layer": "landuse",
        filter: ["in", "class", "grass", "wood", "forest", "meadow", "nature_reserve", "park", "recreation_ground", "golf_course", "cemetery", "farmland"],
        paint: { "fill-color": P.green, "fill-opacity": P.greenOp },
      },
      {
        id: "park",
        type: "fill",
        source: "carto",
        "source-layer": "park",
        paint: { "fill-color": P.park, "fill-opacity": P.parkOp },
      },
      {
        id: "park-glow",
        type: "line",
        source: "carto",
        "source-layer": "park",
        paint: { "line-color": P.parkGlow, "line-width": 1.2, "line-opacity": P.parkGlowOp, "line-blur": 1.5 },
      },

      // ── water ─────────────────────────────────────────────
      {
        id: "water",
        type: "fill",
        source: "carto",
        "source-layer": "water",
        paint: { "fill-color": ["interpolate", ["linear"], ["zoom"], 8, P.water, 13, P.waterZoomedIn] },
      },
      {
        id: "water-glow",
        type: "line",
        source: "carto",
        "source-layer": "water",
        paint: {
          "line-color": P.waterGlow,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 14, 5],
          "line-opacity": P.waterGlowOp,
          "line-blur": 4,
        },
      },
      {
        id: "water-edge",
        type: "line",
        source: "carto",
        "source-layer": "water",
        paint: {
          "line-color": P.waterEdge,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 1.4],
          "line-opacity": P.waterEdgeOp,
          "line-blur": 0.4,
        },
      },
      {
        id: "waterway",
        type: "line",
        source: "carto",
        "source-layer": "waterway",
        paint: { "line-color": P.waterway, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 2] },
      },

      // ── buildings — the "city blocks" layer ───────────────
      {
        id: "building",
        type: "fill",
        source: "carto",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": ["interpolate", ["linear"], ["zoom"], 13, P.building, 16, P.buildingHi],
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 13.8, P.buildingOp],
        },
      },
      {
        id: "building-outline",
        type: "line",
        source: "carto",
        "source-layer": "building",
        minzoom: 14.5,
        paint: { "line-color": P.buildingOutline, "line-width": 0.5, "line-opacity": 0.6 },
      },

      // ── roads: glow pass, then body, then highlight ───────
      road("minor", ["in", "class", "minor", "service", "track"], P.roadMinor,
        ["interpolate", ["linear"], ["zoom"], 12, 0.5, 18, 4]),
      road("secondary", ["in", "class", "secondary", "tertiary"], P.roadSecondary,
        ["interpolate", ["linear"], ["zoom"], 9, 0.5, 18, 5]),
      road("primary", ["in", "class", "primary", "trunk"], P.roadPrimary,
        ["interpolate", ["linear"], ["zoom"], 8, 0.8, 18, 7]),

      road("motorway-glow", ["==", "class", "motorway"], P.motorGlow,
        ["interpolate", ["linear"], ["zoom"], 7, 3, 14, 12, 18, 22],
        { "line-blur": P.motorGlowBlur, "line-opacity": P.motorGlowOp }),
      road("motorway-body", ["==", "class", "motorway"],
        ["interpolate", ["linear"], ["zoom"], 9, P.motorBody[0], 13, P.motorBody[1], 16, P.motorBody[2]],
        ["interpolate", ["linear"], ["zoom"], 7, 1, 14, 4, 18, 9]),
      road("motorway-hl", ["==", "class", "motorway"], P.motorHi,
        ["interpolate", ["linear"], ["zoom"], 11, 0.3, 14, 1, 18, 2.4],
        { "line-opacity": P.motorHiOp }),

      road("ramp", ["all", ["==", "ramp", 1], ["in", "class", "motorway", "trunk", "primary"]], P.ramp,
        ["interpolate", ["linear"], ["zoom"], 12, 0.8, 18, 5],
        { "line-blur": 1, "line-opacity": P.rampOp }),

      // ── rail — drawn over roads; it's a train app, the network should read ──
      road("rail-glow", ["==", "class", "rail"], P.railGlow,
        ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 6, 18, 12],
        { "line-blur": 5, "line-opacity": P.railGlowOp }),
      road("rail-line", ["==", "class", "rail"], P.railLine,
        ["interpolate", ["linear"], ["zoom"], 9, 0.5, 13, 1.2, 18, 2.6],
        { "line-opacity": P.railLineOp }),
      road("rail-ties", ["==", "class", "rail"], P.railTie,
        ["interpolate", ["linear"], ["zoom"], 13, 1.2, 18, 3],
        { "line-dasharray": [0.4, 3], "line-opacity": P.railTieOp }),
      road("ferry", ["==", "class", "ferry"], P.ferry,
        ["interpolate", ["linear"], ["zoom"], 10, 0.6, 15, 1.6],
        { "line-dasharray": [3, 3], "line-opacity": P.ferryOp }),

      // ── boundaries ────────────────────────────────────────
      {
        id: "boundary",
        type: "line",
        source: "carto",
        "source-layer": "boundary",
        filter: ["<=", "admin_level", 4],
        paint: { "line-color": P.boundary, "line-width": 0.7, "line-dasharray": [3, 3], "line-opacity": P.boundaryOp },
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
          "text-optional": true,
          "text-padding": 3,
        },
        paint: { "text-color": P.lblRoadMinor, "text-halo-color": P.haloDark, "text-halo-width": 1.2 },
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
          "text-optional": true,
          "text-padding": 4,
        },
        paint: { "text-color": P.lblRoadMajor, "text-halo-color": P.haloLight, "text-halo-width": 1.6 },
      },
      {
        id: "label-water",
        type: "symbol",
        source: "carto",
        "source-layer": "water_name",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Italic"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 14, 16],
          "text-letter-spacing": 0.05,
        },
        paint: { "text-color": P.lblWater, "text-halo-color": P.haloLight, "text-halo-width": 1, "text-halo-blur": 1 },
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
          "text-padding": 6,
          "symbol-sort-key": ["to-number", ["get", "rank"], 10],
        },
        paint: { "text-color": P.lblPlaceS, "text-halo-color": P.haloLight, "text-halo-width": 1.4 },
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
        paint: { "text-color": P.lblPlaceL, "text-halo-color": P.haloLight, "text-halo-width": 1.8 },
      },
    ],
  }) as any;
};
