import dotenv from 'dotenv';
dotenv.config();
console.log("SERPAPI_KEY:", !!(process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY));
