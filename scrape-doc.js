const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeWPFormsDoc(url) {
  try {
    if (!url) throw new Error('DOC_URL not provided');
    const { data } = await axios.get(url, { timeout: 30000 });
    const $ = cheerio.load(data);
    const entryContentHTML = $('.entry-content').html() || '';
    fs.writeFileSync('content.html', entryContentHTML);
    console.log(`✅ Saved raw HTML to content.html from ${url}`);
  } catch (error) {
    console.error('❌ Error scraping:', error.message);
    process.exit(1);
  }
}

// Prefer explicit env first. Fallback to request body if needed.
const docUrl =
  process.env.DOC_URL ||
  (() => {
    try {
      const body = JSON.parse(process.env.PIPELINE_REQUEST_BODY || '{}');
      return body.docUrl;
    } catch {
      return null;
    }
  })();

if (!docUrl) {
  console.error('❌ No DOC_URL provided. Please provide a documentation URL.');
  process.exit(1);
}

scrapeWPFormsDoc(docUrl);
