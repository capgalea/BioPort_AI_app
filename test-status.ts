import axios from 'axios';

async function test() {
  try {
    const response = await axios.get("http://localhost:3000/api/uspto/status");
    console.log("Status:", response.data);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

test();
