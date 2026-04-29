const axios = require('axios');

async function test() {
  const reqUrl = 'http://localhost:3000/api/patents/search';
  const data = {
    query: 'pfizer',
    source: 'ipAustralia'
  };
  
  try {
    const res = await axios.post(reqUrl, data);
    console.log(res.data.results.length);
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
}

test();
