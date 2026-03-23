import axios from "axios";

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/uspto/status');
    console.log("Status:", res.data);
  } catch (e: any) {
    console.error("Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
