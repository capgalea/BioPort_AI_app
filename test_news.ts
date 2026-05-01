import { fetchLatestNews } from './services/geminiService.ts';

async function main() {
  const news = await fetchLatestNews("Pfizer");
  console.log(news);
}
main();
