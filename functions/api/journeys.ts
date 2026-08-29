export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  if (!env.TFNSW_API_KEY || env.TFNSW_API_KEY === "YOUR_TFNSW_API_KEY") {
    return Response.json({ status: "mock", journeys: [] });
  }

  const origin = url.searchParams.get("origin");
  const destination = url.searchParams.get("destination");
  
  if (!origin || !destination) {
    return Response.json({ status: "error", error: "Missing origin or destination", journeys: [] });
  }

  const d = new Date();
  const year = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' });
  const month = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: '2-digit' });
  const day = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' });
  const dateParam = `${year}${month}${day}`;
  
  const tStr = new Intl.DateTimeFormat('en-AU', {timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false}).format(d);
  const timeParam = tStr.replace(':', '');

  const tfnswUrl = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&depArrMacro=dep&itdDate=${dateParam}&itdTime=${timeParam}&type_origin=stop&name_origin=${encodeURIComponent(origin)}&type_destination=stop&name_destination=${encodeURIComponent(destination)}&calcNumberOfTrips=8&TfNSWTR=true&includeCompleteStopSeq=true`;
  
  try {
    const res = await fetch(tfnswUrl, {
      headers: { Authorization: `apikey ${env.TFNSW_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    
    if (!res.ok) throw new Error("TFNSW API Error");
    const data = await res.json();
    let journeys = data.journeys || [];
    let isOvernightFallback = false;

    // Overnight fallback: if no remaining services tonight (e.g. 1 AM), fetch upcoming morning services for tomorrow
    if (journeys.length === 0) {
      const tomorrow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const tYear = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' });
      const tMonth = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: '2-digit' });
      const tDay = tomorrow.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' });
      const tomorrowDate = `${tYear}${tMonth}${tDay}`;
      
      const fallbackUrl = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&depArrMacro=dep&itdDate=${tomorrowDate}&itdTime=0500&type_origin=stop&name_origin=${encodeURIComponent(origin)}&type_destination=stop&name_destination=${encodeURIComponent(destination)}&calcNumberOfTrips=8&TfNSWTR=true&includeCompleteStopSeq=true`;
      
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Authorization: `apikey ${env.TFNSW_API_KEY}` },
      signal: AbortSignal.timeout(8000),
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        journeys = fallbackData.journeys || [];
        isOvernightFallback = true;
      }
    }

    return Response.json({
      status: "live",
      journeys: journeys,
      isOvernightFallback: isOvernightFallback
    });
  } catch (error) {
    return Response.json({ status: "error", error: "Failed to fetch journeys", journeys: [] });
  }
}
