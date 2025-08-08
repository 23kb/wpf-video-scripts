const axios = require('axios');
const fs = require('fs');

// Read payload JSON
const payload = JSON.parse(fs.readFileSync('creatomate-payload.json', 'utf-8'));
const api_key = '29cb08b0b14b43c0a8b27ad7305dac66a5f2bf2560bcadc9d74bc3bb0249ce948553a4841855d0870a575314d6f316df';

// Send API request
axios.post('https://api.creatomate.com/v1/renders', payload, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${api_key}`
  }
})
.then(response => {
  console.log('✅ Video Render Requested');
  console.log(response.data);
})
.catch(error => {
  console.error('❌ Error:', error.response?.data || error.message);
});
