import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const res = await axios.get('http://0.0.0.0:3000/api/patents/search?q=pfizer');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.response?.data || e.message);
  }
}
test();
