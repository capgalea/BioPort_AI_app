import { searchPatents } from './services/usptoService.ts';

async function main() {
  const p = await searchPatents({ limit: 5 });
  console.log("Found:", p.total);
}

main();
