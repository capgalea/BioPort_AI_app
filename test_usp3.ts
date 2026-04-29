import { searchPatents } from './services/usptoService.ts';

async function test() {
  const res = await searchPatents({
    query: 'moderna',
    status: 'All',
    patentType: 'All',
    limit: 5
  });
  console.log(`Found ${res.total}`);
}

test();
