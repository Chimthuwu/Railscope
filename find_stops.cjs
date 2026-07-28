const axios = require('axios');
const stations = [
  { id: "syd_central", name: "Central" },
  { id: "syd_townhall", name: "Town Hall" },
  { id: "syd_wynyard", name: "Wynyard" },
  { id: "syd_circularquay", name: "Circular Quay" },
  { id: "syd_parramatta", name: "Parramatta" },
  { id: "syd_strathfield", name: "Strathfield" },
  { id: "syd_chatswood", name: "Chatswood" },
  { id: "syd_redfern", name: "Redfern" },
  { id: "syd_northsydney", name: "North Sydney" },
  { id: "syd_bondijunction", name: "Bondi Junction" },
  { id: "syd_hornsby", name: "Hornsby" },
  { id: "syd_blacktown", name: "Blacktown" },
  { id: "syd_penrith", name: "Penrith" },
  { id: "syd_liverpool", name: "Liverpool" },
];

async function getStopIds() {
  const apiKey = process.env.TFNSW_API_KEY;
  for (let s of stations) {
    try {
        const queryName = s.name + " Station";
        const queryReq = await axios.get(`https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&type_sf=any&name_sf=${encodeURIComponent(queryName)}`, {headers: {Authorization: 'apikey ' + apiKey}});
        const stop = queryReq.data.locations?.find(l => l.type === 'stop');
        console.log(`{ id: "${s.id}", name: "${s.name}", tfnsw_id: "${stop?.id}", stopId: "${stop?.properties?.stopId}" },`);
    } catch(e) {
        console.log(`Error for ${s.name}: ${e.message}`);
    }
  }
}

getStopIds();
