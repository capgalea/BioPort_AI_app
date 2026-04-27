import http from 'http';

['continuity', 'foreign-priority', 'adjustment'].forEach(endpoint => {
  http.get('http://localhost:3000/api/uspto/applications/15123456/' + endpoint, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(endpoint, ':', data));
  });
});
