const fs = require('fs');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cfg = require('./config');

const supabase = createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE || cfg.SUPABASE_ANON_KEY
  );
const ELEVENLABS_API_KEY = cfg.ELEVENLABS_API_KEY;
const VOICE_ID = cfg.ELEVENLABS_VOICE_ID;

const BUCKET = 'creatomate-assets';
const AUDIO_FOLDER = 'audio';

const narrationData = JSON.parse(fs.readFileSync('narrationSteps.json', 'utf-8'));

async function clearAudioFolder() {
  const { data: files, error: listErr } = await supabase
    .storage.from(BUCKET)
    .list(AUDIO_FOLDER, { limit: 100 });

  if (listErr) {
    console.error('❌ Could not list old audio files:', listErr.message);
    return;
  }
  if (!files?.length) {
    console.log('⚪ No existing audio to delete');
    return;
  }
  const pathsToDelete = files.map(f => `${AUDIO_FOLDER}/${f.name}`);
  const { error: delErr } = await supabase.storage.from(BUCKET).remove(pathsToDelete);
  if (delErr) console.error('❌ Error deleting old audio files:', delErr.message);
  else console.log(`✅ Deleted ${pathsToDelete.length} old audio files`);
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

    const { data, error } = await supabase.storage.from(BUCKET).upload(
      `${AUDIO_FOLDER}/${filename}`,
      audioBuffer,
      { contentType: 'audio/mpeg', upsert: true }
    );

    if (error) throw error;
    console.log(`✅ Uploaded "${filename}" to "${data.path}"`);
  } catch (err) {
    console.error(`❌ Error for ${filename}:`, err.message);
    throw err;
  }
}

(async () => {
  await clearAudioFolder();
  await generateTTS(narrationData.intro.narration, 'intro.mp3');
  for (const step of narrationData.steps) {
    await generateTTS(step.narration, `step${step.step}.mp3`);
  }
  console.log('✅ All voiceovers generated and uploaded');
})().catch(() => process.exit(1));
