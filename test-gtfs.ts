import axios from 'axios';
import gtfs from 'gtfs-realtime-bindings';

async function test() {
  const r = await axios.get('https://api.transport.nsw.gov.au/v2/gtfs/tripupdates/sydneytrains', {
    headers: { Authorization: 'apikey ' + process.env.TFNSW_API_KEY },
    responseType: 'arraybuffer'
  });
  
  const feed = gtfs.transit_realtime.FeedMessage.decode(new Uint8Array(r.data));
  const updates = feed.entity.slice(0, 5).map(e => {
    const update = e.tripUpdate;
    if (!update || !update.stopTimeUpdate) return null;
    const lastStop = update.stopTimeUpdate[update.stopTimeUpdate.length - 1];
    return {
      tripId: update.trip.tripId,
      routeId: update.trip.routeId,
      lastStop: lastStop?.stopId
    };
  });
  
  console.log(JSON.stringify(updates, null, 2));
}

test().catch(console.error);
