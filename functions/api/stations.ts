export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (!env.TFNSW_API_KEY || env.TFNSW_API_KEY === "YOUR_TFNSW_API_KEY") {
    return Response.json({ status: "mock", locations: [] });
  }

  if (!q) {
    return Response.json({ status: "ok", locations: [] });
  }

  const tfnswUrl = `https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&type_sf=any&coordOutputFormat=EPSG:4326&name_sf=${encodeURIComponent(q)}`;
  
  try {
    const res = await fetch(tfnswUrl, {
      headers: { Authorization: `apikey ${env.TFNSW_API_KEY}` },
    });
    
    if (!res.ok) throw new Error("TFNSW API Error");
    const data = await res.json();
    
    // Filter and map locations to return valid station stops
    const locs = data.locations || [];
    const stations = locs
      .filter((l: any) => l.type === 'stop' && l.properties?.stopId && l.modes?.includes(1))
      .map((l: any) => ({
        id: l.properties.stopId,
        tfnsw_id: l.id,
        name: l.name?.split(',')[0].replace(' Station', ''),
        lat: l.coord[0],
        lng: l.coord[1]
      }));

    // Filter unique by tfnsw_id or id
    const uniqueStations = Array.from(new Map(stations.map((s: any) => [s.tfnsw_id, s])).values());

    return Response.json({
      status: "live",
      locations: uniqueStations
    });
  } catch (error) {
    return Response.json({ status: "error", error: "Failed to search stations", locations: [] });
  }
}
