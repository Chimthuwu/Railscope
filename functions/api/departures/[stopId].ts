export async function onRequest(context: any) {
  const { request, env, params } = context;

  if (!env.TFNSW_API_KEY || env.TFNSW_API_KEY === "YOUR_TFNSW_API_KEY") {
    return Response.json({ status: "mock", events: [] });
  }

  const stopId = params.stopId;
  if (!stopId) {
    return Response.json({ status: "error", error: "Missing stopId", events: [] });
  }

  const url = `https://api.transport.nsw.gov.au/v1/tp/departure_mon?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&mode=direct&type_dm=stop&name_dm=${encodeURIComponent(stopId)}&departureMonitorMacro=true&TfNSWTR=true&version=10.2.1.42`;
  
  try {
    const res = await fetch(url, {
      headers: { Authorization: `apikey ${env.TFNSW_API_KEY}` },
    });
    
    if (!res.ok) throw new Error("TFNSW API Error");
    const data = await res.json();
    
    return Response.json({
      status: "live",
      events: data.stopEvents || []
    });
  } catch (error) {
    return Response.json({ status: "error", error: "Failed to fetch departures", events: [] });
  }
}
