import axios from 'axios';
import base64 from 'base-64';

const BASE_URL = "https://ops.epo.org/3.2/rest-services";
const AUTH_URL = "https://ops.epo.org/3.2/auth/accesstoken";

const getCredentials = () => {
  const key = process.env.EPO_CONSUMER_KEY;
  const secret = process.env.EPO_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error("EPO credentials not set");
  }
  return { key, secret };
};

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const { key, secret } = getCredentials();
  const credentials = base64.encode(`${key}:${secret}`);

  try {
    const response = await axios.post(
      AUTH_URL,
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
    return accessToken!;
  } catch (error: any) {
    if (error.response) {
      console.error("EPO Auth Error Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("EPO Auth Error:", error.message);
    }
    throw error;
  }
}

// === PUBLISHED DATA ENDPOINTS ===

export async function searchPublishedData(query: string, constituent?: string) {
  const token = await getAccessToken();
  const url = constituent 
    ? `${BASE_URL}/published-data/search/${constituent}`
    : `${BASE_URL}/published-data/search`;
  
  try {
    const response = await axios.get(url, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      params: { q: query }
    });
    console.log("EPO API Response Data:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("EPO Search Error Response:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

export async function fetchPublishedDataBiblio(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/biblio`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataAbstract(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/abstract`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataFullCycle(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/full-cycle`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataFulltext(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/fulltext`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataDescription(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/description`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataClaims(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/claims`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataEquivalents(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/equivalents`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataImages(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/${type}/${format}/${number}/images`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchPublishedDataImagesSpecific(imageCountry: string, imageNumber: string, imageKind: string, imageType: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/published-data/images/${imageCountry}/${imageNumber}/${imageKind}/${imageType}`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

// === FAMILY ENDPOINTS ===

export async function fetchFamily(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/family/${type}/${format}/${number}`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchFamilyBiblio(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/family/${type}/${format}/${number}/biblio`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchFamilyLegal(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/family/${type}/${format}/${number}/legal`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

// === REGISTER ENDPOINTS ===

export async function searchRegister(query: string, constituent?: string) {
  const token = await getAccessToken();
  const url = constituent 
    ? `${BASE_URL}/register/search/${constituent}`
    : `${BASE_URL}/register/search`;
  
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    params: { q: query }
  });
  return response.data;
}

export async function fetchRegisterBiblio(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/register/${type}/${format}/${number}/biblio`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchRegisterEvents(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/register/${type}/${format}/${number}/events`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchRegisterProceduralSteps(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/register/${type}/${format}/${number}/procedural-steps`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchRegisterUpp(type: string, format: string, number: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/register/${type}/${format}/${number}/upp`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

// === CLASSIFICATION ENDPOINTS ===

export async function fetchClassificationSchema(cpcClass: string, subclass?: string) {
  const token = await getAccessToken();
  const url = subclass 
    ? `${BASE_URL}/classification/cpc/${cpcClass}/${subclass}`
    : `${BASE_URL}/classification/cpc/${cpcClass}`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function fetchClassificationMedia(mediaName: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/classification/cpc/media/${mediaName}`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

export async function searchClassification(query: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/classification/cpc/search`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    params: { q: query }
  });
  return response.data;
}

export async function fetchClassificationMapping(inputFormat: string, cpcClass: string, subclass: string, outputFormat: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/classification/map/${inputFormat}/${cpcClass}/${subclass}/${outputFormat}`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

// === NUMBER ENDPOINTS ===

export async function fetchNumberService(type: string, inputFormat: string, number: string, outputFormat: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/number-service/${type}/${inputFormat}/${number}/${outputFormat}`;
  const response = await axios.get(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  return response.data;
}

// Keep the old functions for backward compatibility if needed, or update the server to use the new ones.
export async function fetchPatentBiblio(docdbNumber: string) {
  return fetchPublishedDataBiblio('publication', 'docdb', docdbNumber);
}

export async function searchPatents(query: string) {
  return searchPublishedData(query, 'biblio');
}
