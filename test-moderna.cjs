
const http = require('http');

const data = JSON.stringify({
  query: 'moderna',
  limit: 5
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/bigquery/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => responseData += chunk);
  res.on('end', () => {
    const json = JSON.parse(responseData);
    console.log(JSON.stringify(json.results[0], null, 2));
  });
});

req.write(data);
req.end();
