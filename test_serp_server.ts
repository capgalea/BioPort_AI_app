import axios from "axios";

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/test-serp');
    console.log("Success:", res.data);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
test();
