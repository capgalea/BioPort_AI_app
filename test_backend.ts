import axios from 'axios';

async function test() {
  try {
    const response = await axios.post('http://localhost:3000/api/patents/search', {
      query: 'biotech',
      source: 'ip_au'
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}

test();
