/**
 * render-creatomate-video.js
 *
 * Reads a Creatomate payload from 'creatomate-payload.json'
 * and sends a render request to Creatomate API.
 *
 * Usage:
 *   npm install axios
 *   node render-creatomate-video.js
 */

const fs = require('fs');
const axios = require('axios');

// Load payload
const payload = JSON.parse(fs.readFileSync('creatomate-payload.json', 'utf-8'));

// Creatomate API key
const API_KEY = '29cb08b0b14b43c0a8b27ad7305dac66a5f2bf2560bcadc9d74bc3bb0249ce948553a4841855d0870a575314d6f316df';

// Endpoint
const endpoint = 'https://api.creatomate.com/v1/renders';

async function renderVideo() {
  try {
    // Queue render
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    const render = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log('Render queued. ID:', render.id);
    console.log('Status URL:', render.url);

    // Optional: Poll until complete
    /*
    const pollInterval = 5000;
    const poller = setInterval(async () => {
      try {
        const statusRes = await axios.get(`${endpoint}/${render.id}`, {
          headers: { Authorization: `Bearer ${API_KEY}` }
        });
        const status = statusRes.data.status;
        console.log('Current status:', status);
        if (status === 'completed' || status === 'failed') {
          clearInterval(poller);
          console.log('Final response:', statusRes.data);
        }
      } catch (err) {
        console.error('Polling error:', err.message);
      }
    }, pollInterval);
    */
  } catch (error) {
    console.error('Error rendering video:', error.response ? error.response.data : error.message);
  }
}

renderVideo();
