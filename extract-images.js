const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('content.html', 'utf-8');
const $ = cheerio.load(html);

const imageURLs = [];

$('img').each((_, img) => {
  const src = $(img).attr('data-src') || $(img).attr('src');
  const alt = $(img).attr('alt') || 'No alt text';
  if (src && src.startsWith('http')) {
    imageURLs.push({ image_url: src, alt_text: alt });
  }
});

fs.writeFileSync('images.json', JSON.stringify(imageURLs, null, 2));
console.log(`✅ Extracted ${imageURLs.length} image URLs to images.json`);
