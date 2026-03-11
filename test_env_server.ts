import axios from 'axios';

async function test() {
  try {
    const response = await axios.get('http://localhost:3000/api/health');
    console.log(response.data);
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}

test();