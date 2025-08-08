const fs = require('fs');
const axios = require('axios');
const cfg = require('./config');

const payload = JSON.parse(fs.readFileSync('creatomate-payload.json', 'utf-8'));
const endpoint = 'https://api.creatomate.com/v1/renders';

async function renderVideo() {
  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.CREATOMATE_API_KEY}`
      },
      timeout: 60000
    });
    const render = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log('Render queued. ID:', render.id);
    console.log('Status URL:', render.url);
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('Error rendering video:', detail);
    process.exit(1);
  }
}

renderVideo();
