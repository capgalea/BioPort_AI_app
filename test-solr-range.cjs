const http = require('http');

async function test() {
  const reqUrl = 'http://localhost:3000/api/uspto/applications/search';
  const data = {
    q: 'pfizer AND (Patented) AND applicationMetaData.filingDate:[2020-01-01T00:00:00Z TO 2022-12-31T23:59:59Z]',
    pagination: { offset: 0, limit: 10 }
  };
  
  const res = await fetch(reqUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  const json = await res.json();
  console.log("Count with Solr range query:", json.count);
}

test();
