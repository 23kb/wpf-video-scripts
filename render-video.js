const fs = require('fs');
const axios = require('axios');
const cfg = require('./config');

const payload = JSON.parse(fs.readFileSync('video-payload.json', 'utf-8'));
const endpoint = 'https://api.creatomate.com/v1/renders';

function isDirectVideoUrl(url) {
  return url.includes('.mp4') || url.includes('backblazeb2.com') || url.includes('amazonaws.com');
}

async function testVideoUrl(videoUrl) {
  try {
    const response = await axios.head(videoUrl, { timeout: 10000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function pollVideoStatus(statusUrl, maxAttempts = 60, intervalMs = 5000) {
  console.log('🔄 Polling video status...');
  
  if (isDirectVideoUrl(statusUrl)) {
    console.log('📊 Detected direct video URL, testing accessibility...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Only log every 10th attempt or first/last few
      const shouldLog = attempt <= 3 || attempt % 10 === 0 || attempt === maxAttempts;
      
      if (shouldLog) {
        console.log(`📊 Testing video URL ${attempt}/${maxAttempts}...`);
      }
      
      if (await testVideoUrl(statusUrl)) {
        console.log('✅ Video URL is accessible!');
        return statusUrl;
      }
      
      if (attempt < maxAttempts) {
        if (shouldLog) {
          console.log(`⏳ Waiting ${intervalMs/1000}s before next test...`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    throw new Error(`Video URL not accessible after ${maxAttempts} attempts`);
  }
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(statusUrl, {
        headers: {
          'Authorization': `Bearer ${cfg.CREATOMATE_API_KEY}`
        },
        timeout: 10000
      });
      
      const render = Array.isArray(response.data) ? response.data[0] : response.data;
      const shouldLog = attempt <= 3 || attempt % 10 === 0 || attempt === maxAttempts;
      
      if (shouldLog) {
        console.log(`📊 Status check ${attempt}/${maxAttempts}: ${render.status}`);
      }
      
      if (render.status === 'finished') {
        console.log('✅ Video rendering completed!');
        return render.url; // This is the final video URL
      } else if (render.status === 'failed') {
        throw new Error(`Video rendering failed: ${render.error || 'Unknown error'}`);
      } else if (render.status === 'canceled') {
        throw new Error('Video rendering was canceled');
      }
      
      if (attempt < maxAttempts) {
        if (shouldLog) {
          console.log(`⏳ Waiting ${intervalMs/1000}s before next check...`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        const shouldLog = attempt <= 3 || attempt % 15 === 0;
        if (shouldLog) {
          console.log(`📊 Status check ${attempt}/${maxAttempts}: Still processing (404 expected)`);
        }
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
          continue;
        }
      }
      throw error;
    }
  }
  
  throw new Error(`Video rendering timed out after ${maxAttempts} attempts`);
}

async function renderVideo() {
  try {
    console.log('🚀 Submitting video render request...');
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.CREATOMATE_API_KEY}`
      },
      timeout: 60000
    });
    
    const render = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log('✅ Render queued. ID:', render.id);
    console.log('📊 Status URL:', render.url);
    
    if (isDirectVideoUrl(render.url)) {
      console.log('🎬 Direct video URL received! Testing accessibility...');
      
      if (await testVideoUrl(render.url)) {
        console.log('✅ Video is immediately accessible!');
        fs.writeFileSync('final-video-url.txt', render.url);
        console.log('🎬 Final video URL:', render.url);
        console.log('💾 Video URL saved to final-video-url.txt');
        return render.url;
      }
      
      console.log('⏳ Video URL not immediately accessible, starting polling...');
    }
    
    const finalVideoUrl = await pollVideoStatus(render.url);
    
    fs.writeFileSync('final-video-url.txt', finalVideoUrl);
    console.log('🎬 Final video URL:', finalVideoUrl);
    console.log('💾 Video URL saved to final-video-url.txt');
    
    return finalVideoUrl;
    
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('❌ Error rendering video:', detail);
    
    if (error.message.includes('Video URL not accessible') && error.renderUrl) {
      console.log('⚠️ Polling failed, but video might be ready. URL:', error.renderUrl);
      fs.writeFileSync('final-video-url.txt', error.renderUrl);
      console.log('💾 Video URL saved to final-video-url.txt (manual verification recommended)');
      return error.renderUrl;
    }
    
    process.exit(1);
  }
}

renderVideo();
