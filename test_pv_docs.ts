import axios from "axios";

async function test() {
  try {
    const res = await axios.get('https://search.patentsview.org/docs/docs/Search%20API/SearchAPIReference/');
    const text = res.data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log(text.substring(3000, 6000));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
test();
