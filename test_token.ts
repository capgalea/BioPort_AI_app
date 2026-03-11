import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    console.log("Client ID set:", !!process.env.IP_AUSTRALIA_CLIENT_ID);
    console.log("Client Secret set:", !!process.env.IP_AUSTRALIA_CLIENT_SECRET);
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.IP_AUSTRALIA_CLIENT_ID || '');
    params.append('client_secret', process.env.IP_AUSTRALIA_CLIENT_SECRET || '');

    const response = await axios.post("https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token", params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    console.log("Success:", response.data);
  } catch (e: any) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}
test();
