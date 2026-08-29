import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import { Train, Bus, ExternalLink, Loader2 } from "lucide-react";

// ─── Wikipedia lookup ────────────────────────────────────────────────────────
// The map popup used to just repeat the station name. Instead we pull a photo,
// a one-paragraph description and a few "General information" facts from the
// station's Wikipedia article. All Wikimedia endpoints below are CORS-enabled.

type Fact = { label: string; value: string };
export type StationWiki = {
  title: string;
  description?: string;
  extract?: string;
  image?: string | null;
  page: string;
  facts: Fact[];
};

// label on Wikipedia  ->  label we show. Anything not listed here is dropped,
// which also covers the fields we were asked to exclude (Coordinates, Elevation,
// Owner, Operator).
const FACT_LABELS: [RegExp, string][] = [
  [/^lines?$/i, "Line"],
  [/^distance$/i, "Distance"],
  [/^platforms$/i, "Platforms"],
  [/^tracks$/i, "Tracks"],
  [/^structure type$/i, "Structure"],
  [/^(accessible|disabled access)$/i, "Step-free access"],
  [/^opened$/i, "Opened"],
  [/^rebuilt$/i, "Rebuilt"],
  [/^electrified$/i, "Electrified"],
  [/^station code$/i, "Station code"],
  [/^(previous|former) names?$/i, "Former name"],
];

const cache = new Map<string, StationWiki | null>();

const cleanText = (s: string) =>
  s
    .replace(/\[\d+\]/g, "")
    .replace(/\s*\([^)]*ago\)/gi, "")
    .replace(/\s*\(\s*\d{4}-\d{2}-\d{2}\s*\)/g, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function fetchSummary(title: string): Promise<any | null> {
  const r = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
  );
  if (!r.ok) return null;
  const j = await r.json();
  return j?.type === "disambiguation" ? null : j;
}

async function resolveSummary(name: string): Promise<any | null> {
  const slug = name.replace(/ /g, "_");
  const direct =
    (await fetchSummary(`${slug}_railway_station`)) ||
    (await fetchSummary(`${slug}_railway_station,_Sydney`));
  if (direct) return direct;

  // Fall back to search (handles e.g. "Central" -> "Central railway station, Sydney")
  const s = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=${encodeURIComponent(
      `${name} railway station New South Wales`,
    )}`,
  );
  const sj = await s.json();
  const hit = sj?.query?.search?.[0]?.title;
  return hit ? fetchSummary(hit) : null;
}

async function fetchFacts(title: string): Promise<Fact[]> {
  try {
    const r = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&prop=text&section=0&format=json&origin=*&page=${encodeURIComponent(
        title,
      )}`,
    );
    const j = await r.json();
    const html: string | undefined = j?.parse?.text?.["*"];
    if (!html) return [];

    const box = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector("table.infobox");
    if (!box) return [];

    const out: Fact[] = [];
    const seen = new Set<string>();
    box.querySelectorAll("tr").forEach((tr) => {
      const th = tr.querySelector("th");
      const td = tr.querySelector("td");
      if (!th || !td) return;
      const raw = cleanText(th.textContent || "");
      const mapped = FACT_LABELS.find(([re]) => re.test(raw))?.[1];
      if (!mapped || seen.has(mapped)) return;
      td.querySelectorAll("style, sup, .mw-editsection, .geo").forEach((n) => n.remove());
      const value = cleanText(td.textContent || "");
      if (value) {
        out.push({ label: mapped, value });
        seen.add(mapped);
      }
    });
    return out;
  } catch {
    return [];
  }
}

async function fetchStationWiki(name: string): Promise<StationWiki | null> {
  const summary = await resolveSummary(name);
  if (!summary) return null;
  const facts = await fetchFacts(summary.title);
  return {
    title: summary.title,
    description: summary.description,
    extract: summary.extract,
    image: summary.thumbnail?.source ?? null,
    page:
      summary.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`,
    facts,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StationInfoCard({
  name,
  type,
  active,
}: {
  name: string;
  type: string;
  active: boolean;
}) {
  const isBus = type === "bus";
  const heading = `${name} ${isBus ? "Bus Stop" : "Train Station"}`;
  const map = useMap();
  const [data, setData] = useState<StationWiki | null | undefined>(() => cache.get(name));
  const [loading, setLoading] = useState(false);

  // Leaflet positions the popup when it opens (while still "Loading…"). Once the
  // async content lands the popup grows, so nudge Leaflet to re-measure and pan
  // it back into view instead of leaving the title off the top of the screen.
  const reflow = () => {
    requestAnimationFrame(() => {
      try {
        (map as any)._popup?.update();
      } catch {
        /* ignore */
      }
    });
  };

  useEffect(() => {
    if (isBus || !active) return;
    if (cache.has(name)) {
      setData(cache.get(name));
      reflow();
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchStationWiki(name)
      .then((res) => {
        cache.set(name, res);
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          reflow();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [name, isBus, active]);

  return (
    <div className="w-[248px] text-slate-100 font-sans">
      {/* Pinned header — always visible, never scrolls out of view */}
      <div className="flex items-start gap-2">
        {isBus ? (
          <Bus size={15} className="text-cyan-400 mt-0.5 shrink-0" />
        ) : (
          <Train size={15} className="text-orange-400 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-bold text-[13px] leading-tight text-white">{heading}</p>
          {data?.description && (
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5 capitalize">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {loading && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
          <Loader2 size={12} className="animate-spin" /> Loading station info…
        </p>
      )}

      {data && (
        <div className="mt-2 max-h-[46vh] overflow-y-auto overscroll-contain -mr-1 pr-1">
          {data.image && (
            <img
              src={data.image}
              alt={heading}
              className="w-full h-24 object-cover rounded-lg mb-2"
              loading="lazy"
              onLoad={reflow}
            />
          )}

          {data.extract && (
            <p className="text-[11px] leading-snug text-slate-300">{data.extract}</p>
          )}

          {data.facts.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mt-2 pt-2 border-t border-white/10 text-[11px]">
              {data.facts.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="text-slate-400">{f.label}</dt>
                  <dd className="text-slate-200 font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <a
            href={data.page}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 mt-2"
          >
            View on Wikipedia <ExternalLink size={11} />
          </a>
        </div>
      )}

      {data === null && !loading && (
        <p className="text-[11px] text-slate-400 mt-2">No station details found.</p>
      )}
    </div>
  );
}
