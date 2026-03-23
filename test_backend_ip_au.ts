import axios from 'axios';

async function test() {
  try {
    const response = await axios.post('http://localhost:3000/api/patents/search', {
      query: 'CRISPR',
      source: 'ip_au'
    });
    console.log('Success!');
    console.log(JSON.stringify(response.data, null, 2).substring(0, 500));
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

test();
