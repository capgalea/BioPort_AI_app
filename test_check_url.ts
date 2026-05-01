async function main() {
  const url = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQErpxNDLYrdW5ucfUbHHBDt5ndAoqF2vApPB4EglP1E8fMrYvNR2gJDbtnLkIDj14W_C31G00F1U_gIl58-4Xsq1rls2bIWhgCevo53x3E_cLSS7EMVApJUVvJ7SIOO7imgBvBAbTo2PV_c8g0S4PUiD2TfyHX8XiaL7dNwc43uJwOz2BCX-EFsQYK4XRLJUZl_FRre0Ms4rACRMdXHjMrhiSlUaxaC6tlUJwf905a6nxfz";
  
  const res = await fetch('http://localhost:3000/api/check-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: [url] })
  });
  console.log(await res.json());
}
main();
