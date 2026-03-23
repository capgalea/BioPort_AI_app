import axios from "axios";

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/uspto/search', {
      query: 'assignee_organization:"Moderna"',
      source: 'patentsview'
    });
    console.log("Success:", res.data);
  } catch (e: any) {
    console.error("Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
