const http = require('http');

async function test() {
  const reqUrl = 'http://localhost:3000/api/uspto/applications/search';
  const data = {
    q: 'pfizer AND (Patented)',
    rangeFilters: [
      {
        field: 'filingDate',
        valueFrom: '2020-01-01',
        valueTo: '2022-12-31'
      }
    ],
    pagination: { offset: 0, limit: 10 }
  };
  
  const res = await fetch(reqUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  const json = await res.json();
  console.log("Count with range filters:", json.count);
}

test();
