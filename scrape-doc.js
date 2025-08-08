const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeWPFormsDoc(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const entryContentHTML = $('.entry-content').html();

    fs.writeFileSync('zoho-content.html', entryContentHTML);
    console.log('✅ Saved raw HTML to zoho-content.html');
  } catch (error) {
    console.error('❌ Error scraping:', error.message);
  }
}

scrapeWPFormsDoc('https://wpforms.com/docs/zoho-crm-addon/');
