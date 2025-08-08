const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeWPFormsDoc(url) {
  try {
    if (!url) throw new Error('DOC_URL not provided');
    const { data } = await axios.get(url, { timeout: 30000 });
    const $ = cheerio.load(data);
    const entryContentHTML = $('.entry-content').html() || '';
    fs.writeFileSync('zoho-content.html', entryContentHTML);
    console.log(`✅ Saved raw HTML to zoho-content.html from ${url}`);
  } catch (error) {
    console.error('❌ Error scraping:', error.message);
    process.exit(1);
  }
}

// Prefer explicit env first. Fallback to a default if needed.
const docUrl =
  process.env.DOC_URL ||
  (() => {
    try {
      const body = JSON.parse(process.env.PIPELINE_REQUEST_BODY || '{}');
      return body.docUrl;
    } catch {
      return null;
    }
  })() ||
  'https://wpforms.com/docs/zoho-crm-addon/';

scrapeWPFormsDoc(docUrl);
