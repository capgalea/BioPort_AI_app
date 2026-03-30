import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.IP_AUSTRALIA_CLIENT_ID || '';
const clientSecret = process.env.IP_AUSTRALIA_CLIENT_SECRET || '';

async function testV2() {
  const url = "https://production.api.ipaustralia.gov.au/public/external-token-api/v2/access_token";
  
  console.log(`\nTesting v2 endpoint`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
    });
    const data = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${data}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

testV2();
