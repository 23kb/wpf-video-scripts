const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ffprobeStatic = require('ffprobe-static')

ffmpeg.setFfprobePath(ffprobeStatic.path)

// === CONFIG ===
const supabaseAudioBase = 'https://wmdcisnqnxczagfhcauy.supabase.co/storage/v1/object/public/creatomate-assets/audio/'
const introImage        = 'https://wmdcisnqnxczagfhcauy.supabase.co/storage/v1/object/public/creatomate-assets/Zoho/intro.png'
const introAudio        = `${supabaseAudioBase}intro.mp3`
const introVideo        = 'https://wmdcisnqnxczagfhcauy.supabase.co/storage/v1/object/public/creatomate-assets/intro.mp4'
const outroVideo        = 'https://wmdcisnqnxczagfhcauy.supabase.co/storage/v1/object/public/creatomate-assets/outro.mp4'

function getAudioDuration(url) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(url, (err, meta) => {
      if (err) return reject(err)
      resolve(meta.format.duration)
    })
  })
}

async function buildPayload() {
  const audioDuration    = await getAudioDuration(introAudio)
  const videoIntroLength = 2
  const imageDuration    = audioDuration - videoIntroLength

  const narrationData = JSON.parse(fs.readFileSync('narrationSteps.json', 'utf-8'))
  const imageData     = JSON.parse(fs.readFileSync('images.json',      'utf-8'))

  const scenes = []

  // combined intro
  scenes.push({
    type: 'composition',
    track: 1,
    duration: audioDuration,
    animations: [{
      time: 'end',
      duration: 1,
      easing: 'quadratic-out',
      reversed: true,
      type: 'fade'
    }],
    elements: [
      {
        type: 'image',
        source: introImage,
        x: '50%', y: '50%',
        width: '100%', height: '100%',
        fit: 'contain',
        start: 0,
        duration: imageDuration
      },
      {
        type: 'video',
        source: introVideo,
        x: '50%', y: '50%',
        width: '100%', height: '100%',
        start: imageDuration,
        duration: 'media'
      },
      {
        type: 'audio',
        source: introAudio,
        start: 0
      },
      {
        type: 'text',
        track: 3,
        z_index: 0,
        x: '50%', y: '82%',
        width: '82%', height: '35%',
        x_alignment: '50%', y_alignment: '50%',
        text: narrationData.intro.subtitle,
        font_family: 'Lato',
        font_size: '5.9 vmin',
        background_color: 'rgba(215,208,208,0)',
        background_x_padding: '31%',
        background_y_padding: '17%',
        background_border_radius: '31%',
        fill_color: '#ffffff',
        stroke_color: '#3c3b3b',
        stroke_width: '0.8 vmin',
        shadow_color: 'rgba(0,0,0,0.1)',
        start: 0,
        duration: audioDuration,
        animations: [{
          time: 0,
          duration: 1,
          easing: 'quadratic-out',
          type: 'text-appear'
        }]
      }
    ]
  })

  // step scenes
  narrationData.steps.forEach((stepObj, i) => {
    const stepNum = stepObj.step
    const imgUrl  = imageData[i]?.image_url || ''
    const stepAudio = `${supabaseAudioBase}step${stepNum}.mp3`

    scenes.push({
      type: 'composition',
      track: 1,
      stroke_color: '#E05F06',
      stroke_width: '0.3 vmin',
      border_radius: '1.4 vmin',
      shadow_color: 'rgba(182,182,182,0.25)',
      animations: [{ time: 0, duration: 0.4, easing: 'quadratic-out', type: 'fade' }],
      elements: [
        {
          type: 'image',
          source: imgUrl,
          x: '50%', y: '50%',
          width: '100%', height: '100%',
          fit: 'contain',
          shadow_color: 'rgba(220,220,220,0.25)'
        },
        {
          type: 'audio',
          source: stepAudio,
          start: 0
        },
        {
          type: 'text',
          track: 3,
          z_index: 0,
          x: '50%', y: '90%',
          width: '82%', height: '35%',
          x_alignment: '50%', y_alignment: '50%',
          text: stepObj.subtitle,
          font_family: 'Lato',
          font_size: '5.9 vmin',
          background_color: 'rgba(213,213,213,0)',
          background_x_padding: '31%',
          background_y_padding: '17%',
          background_border_radius: '31%',
          fill_color: '#ffffff',
          stroke_color: '#3c3b3b',
          stroke_width: '0.8 vmin',
          shadow_color: 'rgba(0,0,0,0.1)',
          start: 0,
          animations: [{ time: 0, duration: 1, easing: 'quadratic-out', type: 'text-appear' }]
        }
      ]
    })
  })

  // outro
  scenes.push({
    type: 'composition',
    track: 1,
    elements: [{
      type: 'video',
      source: outroVideo,
      x: '50%', y: '50%',
      width: '100%', height: '100%',
      fit: 'cover',
      start: 0,
      duration: 'media'
    }]
  })

  const payload = {
    source: {
      output_format: 'mp4',
      width: 1280,
      height: 720,
      fill_color: '#ffffff',
      elements: scenes
    }
  }

  fs.writeFileSync('video-payload.json', JSON.stringify(payload, null, 2))
  console.log(`✅ Video payload generated with ${scenes.length} compositions.`)
}

buildPayload().catch(console.error)
