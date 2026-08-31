import axios from "axios";
import gtfs from "gtfs-realtime-bindings";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.TFNSW_API_KEY;

async function fetchFeed(url) {
  const response = await axios.get(url, {
    headers: { Authorization: `apikey ${API_KEY}` },
    responseType: "arraybuffer",
  });
  return gtfs.transit_realtime.FeedMessage.decode(new Uint8Array(response.data)).entity;
}

async function run() {
  const v = await fetchFeed("https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains");
  const tu = await fetchFeed("https://api.transport.nsw.gov.au/v2/gtfs/tripupdates/sydneytrains");
  
  const vTrips = v.filter(e => e.vehicle?.trip?.tripId).map(e => e.vehicle.trip.tripId);
  const tuTrips = tu.filter(e => e.tripUpdate?.trip?.tripId).map(e => e.tripUpdate.trip.tripId);
  
  console.log(`Vehicles with tripId: ${vTrips.length}, TripUpdates with tripId: ${tuTrips.length}`);
  
  let matches = 0;
  for (const tid of vTrips) {
    if (tuTrips.includes(tid)) matches++;
  }
  console.log(`Exact matches: ${matches}`);
  
  if (matches === 0 && vTrips.length > 0 && tuTrips.length > 0) {
    console.log("Sample vehicle tripId:", vTrips[0]);
    console.log("Sample tripUpdate tripId:", tuTrips[0]);
  }
}

run();
