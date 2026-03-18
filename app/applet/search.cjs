const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://html.duckduckgo.com/html/?q=site:ipaustralia.gov.au+australian-patent-search-api+search+quick')
  .then(r => {
    const $ = cheerio.load(r.data);
    $('.result__snippet').each((i, el) => console.log($(el).text()));
  })
  .catch(e => console.log(e.message));
