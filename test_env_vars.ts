import dotenv from "dotenv";
dotenv.config();
console.log("PATENTSVIEW_API_KEY:", !!process.env.PATENTSVIEW_API_KEY);
console.log("GEMINI_API_KEY:", !!process.env.GEMINI_API_KEY);
