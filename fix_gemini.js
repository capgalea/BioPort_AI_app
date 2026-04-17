import fs from 'fs';

let content = fs.readFileSync('services/geminiService.ts', 'utf8');

const wrapper = `
const generateContentWithTracking = async (ai: GoogleGenAI, params: any): Promise<GenerateContentResponse> => {
  const response = await ai.models.generateContent(params);
  trackUsage(params.model, response);
  return response;
};
`;

content = content.replace('// --- HELPER FUNCTIONS ---', '// --- HELPER FUNCTIONS ---\n' + wrapper);

content = content.replace(/ai\.models\.generateContent\(/g, 'generateContentWithTracking(ai, ');

fs.writeFileSync('services/geminiService.ts', content);
