import axios from 'axios';

async function test() {
  try {
    const response = await axios.get("https://developer.uspto.gov/ibd-api/v1/patent/grants", {
      params: { searchText: 'biotech' }
    });
    console.log("Success:", response.status);
    console.log(JSON.stringify(response.data).substring(0, 500));
  } catch (e) {
    console.log("Error:", e.response ? e.response.status : e.message);
    if (e.response) console.log(e.response.data);
  }
}

test();





