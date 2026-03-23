import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/patentsview/query', {
      endpoint: 'patent',
      query: '{"_text_any":{"assignees.assignee_organization":"Pfizer"}}'
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error(e.response ? JSON.stringify(e.response.data) : e.message);
  }
}
test();
