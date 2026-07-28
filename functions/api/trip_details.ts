export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.TFNSW_API_KEY || env.TFNSW_API_KEY === "YOUR_TFNSW_API_KEY") {
    return Response.json({ status: "mock", stops: [] });
  }

  const origin = url.searchParams.get("origin");
  const destination = url.searchParams.get("destination");
  const date = url.searchParams.get("date");
  const time = url.searchParams.get("time");
  const realtimeTripId = url.searchParams.get("realtimeTripId");
  const gtfsTripId = url.searchParams.get("gtfsTripId");
  
  if (!origin || !destination || !date || !time) {
    return Response.json({ status: "error", error: "Missing required parameters", stops: [] });
  }

  const tfnswUrl = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&depArrMacro=dep&itdDate=${date}&itdTime=${time}&type_origin=stop&name_origin=${encodeURIComponent(origin)}&type_destination=stop&name_destination=${encodeURIComponent(destination)}&calcNumberOfTrips=8&TfNSWTR=true&includedMeans=checkbox&inclMOT_1=on&inclMOT_2=on&includeCompleteStopSeq=true`;
  
  try {
    const res = await fetch(tfnswUrl, {
      headers: { Authorization: `apikey ${env.TFNSW_API_KEY}` },
    });
    
    if (!res.ok) throw new Error("TFNSW API Error");
    const data = await res.json();

    const journeys = data.journeys || [];
    let targetLeg = null;

    // Find the right journey and leg
    for (const j of journeys) {
      if (!j.legs) continue;
      for (const leg of j.legs) {
        const legRealtimeId = leg.transportation?.properties?.RealtimeTripId || leg.properties?.RealtimeTripId;
        const legGtfsId = leg.transportation?.properties?.gtfsTripId || leg.properties?.gtfsTripId;
        
        if ((realtimeTripId && legRealtimeId === realtimeTripId) || (gtfsTripId && legGtfsId === gtfsTripId)) {
          targetLeg = leg;
          break;
        }
      }
      if (targetLeg) break;
    }

    // Fallback
    if (!targetLeg && journeys.length > 0 && journeys[0].legs?.length > 0) {
       targetLeg = journeys[0].legs.find((l: any) => {
         const pClass = l.transportation?.product?.class;
         return pClass === 1 || pClass === 2;
       }) || journeys[0].legs[0];
    }

    return Response.json({
      status: "live",
      stops: targetLeg?.stopSequence || []
    });
  } catch (error) {
    return Response.json({ status: "error", error: "Failed to fetch trip details", stops: [] });
  }
}
