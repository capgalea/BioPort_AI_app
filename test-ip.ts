import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const IP_AU_CLIENT_ID = process.env.IP_AUSTRALIA_CLIENT_ID;
const IP_AU_CLIENT_SECRET = process.env.IP_AUSTRALIA_CLIENT_SECRET;
const TOKEN_URL_PROD = "https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token";

async function test() {
  console.log("Testing IP Australia API token fetching...");
  
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', IP_AU_CLIENT_ID!);
    params.append('client_secret', IP_AU_CLIENT_SECRET!);

    const response = await axios.post(TOKEN_URL_PROD, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    console.log("Success:", response.data);
  } catch (error: any) {
    console.error("Error URLSearchParams:", error.response?.data || error.message);
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const auth = Buffer.from(`${IP_AU_CLIENT_ID}:${IP_AU_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(TOKEN_URL_PROD, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${auth}`
      }
    });
    console.log("Success:", response.data);
  } catch (error: any) {
    console.error("Error Basic Auth:", error.response?.data || error.message);
  }
}

test();
