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
      signal: AbortSignal.timeout(8000),
    });
    
    if (!res.ok) throw new Error("TFNSW API Error");
    const data = await res.json();
    let events = data.stopEvents || [];
    let isOvernightFallback = false;

    // Overnight fallback: if no remaining departures tonight, fetch upcoming morning departures for tomorrow
    if (events.length === 0) {
      const d = new Date();
      const tomorrow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const tYear = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' });
      const tMonth = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: '2-digit' });
      const tDay = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' });
      const tomorrowDate = `${tYear}${tMonth}${tDay}`;

      const fallbackUrl = `https://api.transport.nsw.gov.au/v1/tp/departure_mon?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&mode=direct&type_dm=stop&name_dm=${encodeURIComponent(stopId)}&departureMonitorMacro=true&TfNSWTR=true&itdDate=${tomorrowDate}&itdTime=0500&version=10.2.1.42`;

      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Authorization: `apikey ${env.TFNSW_API_KEY}` },
      signal: AbortSignal.timeout(8000),
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        events = fallbackData.stopEvents || [];
        isOvernightFallback = true;
      }
    }

    return Response.json({
      status: "live",
      events: events,
      isOvernightFallback: isOvernightFallback
    });
  } catch (error) {
    return Response.json({ status: "error", error: "Failed to fetch departures", events: [] });
  }
}
