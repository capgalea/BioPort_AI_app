import { intelligentPatentSearch } from './services/geminiService.ts';

async function run() {
  try {
    const results = await intelligentPatentSearch("Pfizer", ["ip_au"]);
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
