import axios from "axios";

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/test-pv');
    console.log("Success:", JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error("Error:", e.response?.status, e.response?.data || e.message);
    console.error("Headers:", e.response?.headers);
  }
}
test();
