import axios from 'axios';

async function run() {
  try {
    const res = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_patents',
        q: 'assignee:"CSL"',
        api_key: process.env.SERPAPI_API_KEY || 'e20b666a33116543b573a6e60b094f30d065f97b6862eb9f018d91c13636544a'
      }
    });
    console.log(JSON.stringify(res.data.organic_results || res.data.google_patents_results || [], null, 2));
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}
run();
