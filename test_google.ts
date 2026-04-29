import { fetchPatentsFromGooglePatents } from './services/googlePatentsService.ts';

async function main() {
  const p = await fetchPatentsFromGooglePatents("", { applicant: "Moderna" }, 5);
  console.log("Found:", p.length);
  if (p.length > 0) {
    console.log(p[0]);
  }
}

main();
