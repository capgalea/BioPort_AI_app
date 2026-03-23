import axios from 'axios';

async function test() {
  try {
    const response = await axios.get('http://0.0.0.0:3000/api/patents/search?q=pfizer');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
