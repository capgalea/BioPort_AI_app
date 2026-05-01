import http from "http";
const check = (url) => {
  http.get(url, (res) => {
      console.log(`${url} - Status Code: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => console.log('Data starts with:', data.substring(0, 500)));
  }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
  });
};
check('http://localhost:3000/components/Dashboard.tsx');
check('http://localhost:3000/components/AcademicDashboard.tsx');
check('http://localhost:3000/components/NetworkGraph.tsx');
check('http://localhost:3000/components/Tooltip.tsx');
check('http://localhost:3000/types.ts');
