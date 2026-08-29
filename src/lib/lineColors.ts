export interface LineMeta {
  code: string;
  name: string;
  color: string;
  bgStyle: string;
  textStyle: string;
  borderStyle: string;
  isBus: boolean;
}

export const STATION_PRIMARY_LINE: Record<string, string> = {
  // T8 Airport & South Line (Green)
  "TURRELLA": "T8",
  "BARDWELL PARK": "T8",
  "BEXLEY NORTH": "T8",
  "KINGSGROVE": "T8",
  "BEVERLY HILLS": "T8",
  "NARWEE": "T8",
  "RIVERWOOD": "T8",
  "PADSTOW": "T8",
  "REVESBY": "T8",
  "PANANIA": "T8",
  "HOLSWORTHY": "T8",
  "GLENFIELD": "T8",
  "CAMPBELLTOWN": "T8",
  "MACARTHUR": "T8",
  "WOLLI CREEK": "T8",
  "MASCOT": "T8",
  "DOMESTIC AIRPORT": "T8",
  "INTERNATIONAL AIRPORT": "T8",
  "GREEN SQUARE": "T8",

  // T2 Inner West & Leppington Line (Cyan/Light Blue)
  "PETERSHAM": "T2",
  "STANMORE": "T2",
  "NEWTOWN": "T2",
  "MACDONALDTOWN": "T2",
  "CROYDON": "T2",
  "ASHFIELD": "T2",
  "BURWOOD": "T2",
  "STRATHFIELD": "T2",
  "SUMMER HILL": "T2",
  "LEWISHAM": "T2",
  "HOMEBUSH": "T2",
  "LIDCOMBE": "T2",
  "AUBURN": "T2",
  "GRANVILLE": "T2",
  "CLYDE": "T2",
  "PARRAMATTA": "T2",
  "HARRIS PARK": "T2",
  "MERRYLANDS": "T2",
  "YENNORA": "T2",
  "FAIRFIELD": "T2",
  "CANLEY VALE": "T2",
  "CABRAMATTA": "T2",
  "WARWICK FARM": "T2",
  "LIVERPOOL": "T2",
  "CASULA": "T2",
  "EDMONDSON PARK": "T2",
  "LEPPINGTON": "T2",

  // T1 North Shore & Western Line (Yellow/Gold)
  "WESTMEAD": "T1",
  "WENTWORTHVILLE": "T1",
  "PENDLE HILL": "T1",
  "TOONGABBIE": "T1",
  "SEVEN HILLS": "T1",
  "BLACKTOWN": "T1",
  "DOONSIDE": "T1",
  "ROOTY HILL": "T1",
  "MOUNT DRUITT": "T1",
  "ST MARYS": "T1",
  "WERRINGTON": "T1",
  "KINGSWOOD": "T1",
  "PENRITH": "T1",
  "EMU PLAINS": "T1",
  "CHATSWOOD": "T1",
  "GORDON": "T1",
  "HORNSBY": "T1",

  // T3 Bankstown Line (Orange)
  "BANKSTOWN": "T3",
  "PUNCHBOWL": "T3",
  "WILEY PARK": "T3",
  "LAKEMBA": "T3",
  "BELMORE": "T3",
  "CAMPSIE": "T3",
  "CANTERBURY": "T3",
  "HURLSTONE PARK": "T3",
  "DULWICH HILL": "T3",
  "MARRICKVILLE": "T3",
  "SYDENHAM": "T3",

  // T4 Eastern Suburbs & Illawarra Line (Dark Blue)
  "BONDI JUNCTION": "T4",
  "EDGECLIFF": "T4",
  "KINGS CROSS": "T4",
  "MARTIN PLACE": "T4",
  "TOWN HALL": "T4",
  "CENTRAL": "T4",
  "REDFERN": "T4",
  "ARNCLIFFE": "T4",
  "BANKSIA": "T4",
  "ROCKDALE": "T4",
  "KOGARAH": "T4",
  "CARLTON": "T4",
  "HURSTVILLE": "T4",
  "PENSHURST": "T4",
  "MORTDALE": "T4",
  "OATLEY": "T4",
  "COMO": "T4",
  "JANNALI": "T4",
  "SUTHERLAND": "T4",
  "CRONULLA": "T4",
  "MIRANDA": "T4",
  "CARINGBAH": "T4",
  "GYMEA": "T4",
  "KIRRAWEE": "T4",

  // T9 Northern Line (Red)
  "EPPING": "T9",
  "EASTWOOD": "T9",
  "DENISTONE": "T9",
  "WEST RYDE": "T9",
  "MEADOWBANK": "T9",
  "RHODES": "T9",
  "CONCORD WEST": "T9",
  "NORTH STRATHFIELD": "T9"
};

export const LINE_CONFIGS: Record<string, LineMeta> = {
  "T1": {
    code: "T1",
    name: "North Shore & Western Line",
    color: "#f39c12",
    bgStyle: "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400",
    textStyle: "text-amber-600 dark:text-amber-400",
    borderStyle: "border-amber-500",
    isBus: false
  },
  "T2": {
    code: "T2",
    name: "Inner West & Leppington Line",
    color: "#0098cd",
    bgStyle: "bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400",
    textStyle: "text-sky-600 dark:text-sky-400",
    borderStyle: "border-sky-500",
    isBus: false
  },
  "T3": {
    code: "T3",
    name: "Bankstown Line",
    color: "#f37021",
    bgStyle: "bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400",
    textStyle: "text-orange-600 dark:text-orange-400",
    borderStyle: "border-orange-500",
    isBus: false
  },
  "T4": {
    code: "T4",
    name: "Eastern Suburbs & Illawarra Line",
    color: "#005aa3",
    bgStyle: "bg-blue-600/15 border-blue-600/30 text-blue-600 dark:text-blue-400",
    textStyle: "text-blue-600 dark:text-blue-400",
    borderStyle: "border-blue-600",
    isBus: false
  },
  "T5": {
    code: "T5",
    name: "Cumberland Line",
    color: "#c4258f",
    bgStyle: "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400",
    textStyle: "text-fuchsia-600 dark:text-fuchsia-400",
    borderStyle: "border-fuchsia-500",
    isBus: false
  },
  "T7": {
    code: "T7",
    name: "Olympic Park Line",
    color: "#6cae29",
    bgStyle: "bg-lime-500/15 border-lime-500/30 text-lime-600 dark:text-lime-400",
    textStyle: "text-lime-600 dark:text-lime-400",
    borderStyle: "border-lime-500",
    isBus: false
  },
  "T8": {
    code: "T8",
    name: "Airport & South Line",
    color: "#00954c",
    bgStyle: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    textStyle: "text-emerald-600 dark:text-emerald-400",
    borderStyle: "border-emerald-500",
    isBus: false
  },
  "T9": {
    code: "T9",
    name: "Northern Line",
    color: "#d11f2f",
    bgStyle: "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400",
    textStyle: "text-rose-600 dark:text-rose-400",
    borderStyle: "border-rose-500",
    isBus: false
  },
  "M1": {
    code: "M1",
    name: "Metro North West & Bankstown",
    color: "#009688",
    bgStyle: "bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400",
    textStyle: "text-teal-600 dark:text-teal-400",
    borderStyle: "border-teal-500",
    isBus: false
  },
  "BUS": {
    code: "BUS",
    name: "Bus Service / NightRide",
    color: "#b794f6",
    bgStyle: "bg-violet-500/20 border-violet-500/40 text-violet-700 dark:text-violet-300 font-bold",
    textStyle: "text-violet-600 dark:text-violet-400",
    borderStyle: "border-violet-500",
    isBus: true
  }
};

export function getServiceLineMeta(item: any, currentStationName?: string): LineMeta {
  const trans = item.transportation || item.transport || {};
  const pClass = trans.product?.class;
  const name = (trans.name || trans.number || trans.disassembledName || "").toUpperCase();
  const desc = (trans.description || trans.product?.name || "").toUpperCase();
  const destName = (trans.destination?.name || "").toUpperCase();
  const platform = (item.location?.properties?.platformName || item.location?.name || "").toUpperCase();

  // 1. Detect if this is a Bus or Bus Replacement
  const isBus = pClass === 3 || pClass === 7 || 
                name.includes("BUS") || desc.includes("BUS") || desc.includes("NIGHTRIDE") || 
                platform.includes("TRAFALGAR") || platform.includes("PARK ST") || platform.includes("BUS") || platform.includes("STATION") ||
                /^N\d+/.test(name) || /^N\d+/.test(destName);

  if (isBus) {
    return LINE_CONFIGS["BUS"];
  }

  // 2. Detect Metro
  if (pClass === 2 || name.includes("METRO") || name.startsWith("M1")) {
    return LINE_CONFIGS["M1"];
  }

  // 3. Match explicitly against line codes in transportation name/desc
  if (name.includes("T8") || desc.includes("AIRPORT") || desc.includes("SOUTH LINE")) return LINE_CONFIGS["T8"];
  if (name.includes("T1") || desc.includes("NORTH SHORE") || desc.includes("WESTERN")) return LINE_CONFIGS["T1"];
  if (name.includes("T2") || desc.includes("INNER WEST") || desc.includes("LEPPINGTON")) return LINE_CONFIGS["T2"];
  if (name.includes("T3") || desc.includes("BANKSTOWN")) return LINE_CONFIGS["T3"];
  if (name.includes("T4") || desc.includes("ILLAWARRA") || desc.includes("EASTERN SUBURBS")) return LINE_CONFIGS["T4"];
  if (name.includes("T5") || desc.includes("CUMBERLAND")) return LINE_CONFIGS["T5"];
  if (name.includes("T7") || desc.includes("OLYMPIC PARK")) return LINE_CONFIGS["T7"];
  if (name.includes("T9") || desc.includes("NORTHERN")) return LINE_CONFIGS["T9"];

  // 4. Match using current station name or destination station lookup
  const cleanedCurrent = currentStationName?.toUpperCase().replace(" STATION", "").trim() || "";
  const cleanedDest = destName.replace(" STATION", "").trim();

  if (STATION_PRIMARY_LINE[cleanedCurrent]) {
    const lineCode = STATION_PRIMARY_LINE[cleanedCurrent];
    if (LINE_CONFIGS[lineCode]) return LINE_CONFIGS[lineCode];
  }

  if (STATION_PRIMARY_LINE[cleanedDest]) {
    const lineCode = STATION_PRIMARY_LINE[cleanedDest];
    if (LINE_CONFIGS[lineCode]) return LINE_CONFIGS[lineCode];
  }

  // Default fallback to T2 Inner West
  return LINE_CONFIGS["T2"];
}
