async function run() {
  const res = await fetch('https://search.patentsview.org/docs/docs/Search%20API/SearchAPIReference');
  const html = await res.text();
  const text = html.replace(/<[^>]*>?/gm, ' ');
  console.log(text.substring(2000, 6000));
}
run();
