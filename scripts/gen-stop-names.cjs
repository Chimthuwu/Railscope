// Regenerates src/data/stopNames.ts from the GTFS stops.txt at the repo root.
//
//   node scripts/gen-stop-names.cjs
//
// The map is keyed by every GTFS stop_id (both station-level "location_type 1"
// and per-platform child stops) so the live map popup can turn the raw numeric
// stop IDs in the vehicle feed's stopTimeUpdate into station names.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const lines = fs
  .readFileSync(path.join(ROOT, "stops.txt"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean);
lines.shift(); // header

const clean = (n) =>
  n
    .replace(/ Station Platform \d+[A-Za-z]?$/, "")
    .replace(/ Light Rail$/, "")
    .replace(/ Station$/, "")
    .replace(/ Platform \d+[A-Za-z]?$/, "")
    .replace(/,.*$/, "")
    .trim();

const map = {};
for (const l of lines) {
  const p = l.split(/","/).map((s) => s.replace(/^"|"$/g, ""));
  const id = p[0];
  const name = p[2];
  if (!id || !name) continue;
  map[id] = clean(name);
}

const out =
  "// AUTO-GENERATED from stops.txt (GTFS) — do not edit by hand.\n" +
  "// Maps every GTFS stop_id (station- and platform-level) to a clean station name.\n" +
  "// Regenerate: node scripts/gen-stop-names.cjs\n" +
  "export const STOP_NAMES: Record<string, string> = " +
  JSON.stringify(map) +
  ";\n";

fs.writeFileSync(path.join(ROOT, "src/data/stopNames.ts"), out);
console.log(`Wrote src/data/stopNames.ts — ${Object.keys(map).length} entries, ${out.length} bytes`);
