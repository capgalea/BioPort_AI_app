import http from 'http';

http.get('http://localhost:3000/api/uspto/applications/15123456/transactions', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('transactions:', data));
});

http.get('http://localhost:3000/api/uspto/applications/15123456/assignment', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('assignments:', data));
});
