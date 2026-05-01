import * as fs from 'fs';

let content = fs.readFileSync('services/geminiService.ts', 'utf8');

const helper = `
const enforceProxySchema = (config: any, params: any) => {
  if (!config) config = {};
  config.responseMimeType = "application/json";
  
  if (!config.responseSchema) {
    config.responseSchema = { type: Type.OBJECT, properties: {} };
  }
  
  let schema = config.responseSchema;
  let isWrappedArray = false;
  
  if (schema.type === Type.ARRAY) {
     const originalItems = schema.items;
     schema = {
       type: Type.OBJECT,
       properties: {
         __proxy_array__: { type: Type.ARRAY, items: originalItems }
       }
     };
     isWrappedArray = true;
     if (typeof params.contents === 'string') {
        params.contents += "\\n\\nIMPORTANT: Return a JSON object with a single property '__proxy_array__' containing the array of results.";
     }
  }

  if (!schema.properties) schema.properties = {};
  
  const required = [
    "summary", "references", "rating", "feedback", "technicalFields", 
    "keyClaimsSummary", "noveltyOverPriorArt", "pctStatusInfo", 
    "designatedStates", "assignees", "names", "companies"
  ];
  
  for (const prop of required) {
    if (!schema.properties[prop]) {
       if (["references", "technicalFields", "designatedStates", "assignees", "names", "companies"].includes(prop)) {
          schema.properties[prop] = { type: Type.ARRAY, items: { type: Type.STRING } };
       } else {
          schema.properties[prop] = { type: Type.STRING };
       }
    }
  }
  
  config.responseSchema = schema;
  return { newConfig: config, isWrappedArray };
};
`;

content = content.replace('// --- HELPER FUNCTIONS ---', '// --- HELPER FUNCTIONS ---\n' + helper);

content = content.replace(
  'const generateContentWithTracking = async (ai: GoogleGenAI, params: any): Promise<GenerateContentResponse> => {',
  `const generateContentWithTracking = async (ai: GoogleGenAI, params: any): Promise<GenerateContentResponse> => {\n  const { newConfig, isWrappedArray } = enforceProxySchema(params.config || {}, params);\n  params.config = newConfig;`
);

content = content.replace(
  'trackUsage(params.model || \'gemini-3-flash-preview\', response);',
  `trackUsage(params.model || 'gemini-3-flash-preview', response);
  if (isWrappedArray) {
     try {
       const text = response.text || "{}";
       const data = JSON.parse(text);
       if (data && data.__proxy_array__) {
         response.text = JSON.stringify(data.__proxy_array__);
       }
     } catch (e) {}
  }`
);

fs.writeFileSync('services/geminiService.ts', content);
