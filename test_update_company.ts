import { analyzeCompanies } from './services/geminiService.ts';

async function main() {
  console.log("Analyzing Pfizer...");
  const res = await analyzeCompanies(["Pfizer"], "Global", undefined, undefined, undefined, true);
  console.log(JSON.stringify(res, null, 2));
}

main();
