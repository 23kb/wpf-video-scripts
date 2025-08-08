const fs    = require('fs');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ── your Supabase creds ───────────────────────────────────────────────────────
const SUPABASE_URL = 'https://wmdcisnqnxczagfhcauy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZGNpc25xbnhjemFnZmhjYXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg3MDc5MSwiZXhwIjoyMDY5NDQ2NzkxfQ.-q9JD0ILKwQ3b6AWGD0iH8jGRLfttVylJrppEGDtHsM';
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

const ELEVENLABS_API_KEY = 'sk_9043c5964c825c96aeaf8a051537d6db5c846d06f2792aac';
const VOICE_ID           = 'P5yGeBAnGUJRn1Hm5dVy';

// ── config ───────────────────────────────────────────────────────────────────
const BUCKET       = 'creatomate-assets';
const AUDIO_FOLDER = 'audio';    // no trailing slash
const narrationData = JSON.parse(fs.readFileSync('narrationSteps.json', 'utf-8'));

async function clearAudioFolder() {
  // list everything in `audio/`
  const { data: files, error: listErr } = await supabase
    .storage
    .from(BUCKET)
    .list(AUDIO_FOLDER, { limit: 100 });

  if (listErr) {
    console.error('❌ Could not list old audio files:', listErr.message);
    return;
  }

  if (!files.length) {
    console.log('⚪ No existing audio to delete');
    return;
  }

  const pathsToDelete = files.map(f => `${AUDIO_FOLDER}/${f.name}`);

  const { error: delErr } = await supabase
    .storage
    .from(BUCKET)
    .remove(pathsToDelete);

  if (delErr) {
    console.error('❌ Error deleting old audio files:', delErr.message);
  } else {
    console.log(`✅ Deleted ${pathsToDelete.length} old audio files`);
  }
}

async function generateTTS(text, filename) {
  console.log(`\n▶️ Generating TTS for "${filename}"…`);
  try {
    const resp = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
      { responseType: 'arraybuffer', headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
    );

    const audioBuffer = Buffer.from(resp.data);
    console.log(`  ➤ received ${audioBuffer.byteLength} bytes from ElevenLabs`);

    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .upload(`${AUDIO_FOLDER}/${filename}`, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) throw error;
    console.log(`✅ Uploaded "${filename}" to "${data.path}"`);
  }
  catch (err) {
    console.error(`❌ Error for ${filename}:`, err.message);
  }
}

(async () => {
  // 1. delete old files
  await clearAudioFolder();

  // 2. regenerate & upload
  await generateTTS(narrationData.intro.narration, 'intro.mp3');
  for (const step of narrationData.steps) {
    await generateTTS(step.narration, `step${step.step}.mp3`);
  }
})();
