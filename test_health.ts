import axios from 'axios';

async function test() {
  try {
    const response = await axios.get('http://localhost:3000/api/health');
    console.log(response.data);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

test();
