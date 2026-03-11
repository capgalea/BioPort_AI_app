import axios from 'axios';

async function test() {
  try {
    const response = await axios.get('http://localhost:3000/api/test-serp');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}

test();
