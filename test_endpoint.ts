import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/patents/patentsview', {
      params: {
        q: 'CRISPR',
        size: 5
      }
    });
    console.log(`Status: ${res.status}`);
    console.log(`Results: ${res.data.patents?.length}`);
    if (res.data.patents?.length > 0) {
      console.log(`First patent: ${res.data.patents[0].patent_title}`);
      console.log(`First patent ID: ${res.data.patents[0].patent_id}`);
    }
  } catch (e: any) {
    console.error(e.message);
    if (e.response) {
      console.error(e.response.data);
    }
  }
}

test();
