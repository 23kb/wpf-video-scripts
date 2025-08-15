const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const steps = [
  { name: 'scrape-doc',                 file: 'scrape-doc.js' },
  { name: 'extract-images',             file: 'extract-images.js' },
  { name: 'describe-images',            file: 'describe-images.js' },
  { name: 'generate-narration-steps',   file: 'generate-narration-steps.js' },
  { name: 'generate-voiceovers',        file: 'generate-voiceovers.js' },
  { name: 'generate-video-payload',     file: 'generate-video-payload.js' },
  { name: 'render-video',               file: 'render-video.js' },
];

// Clean up old files
function cleanupOldFiles() {
  const filesToClean = [
    'content.html',
    'images.json',
    'image-descriptions.json',
    'narrationSteps.json',
    'video-payload.json',
    'final-video-url.txt',
    'render-info.json'
  ];

  console.log('🧹 Cleaning up old files...');
  filesToClean.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`  ✅ Deleted ${file}`);
    }
  });
}

function runStep(step, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const cmd = process.execPath; 
    const scriptPath = path.resolve(__dirname, step.file);

    const child = spawn(cmd, [scriptPath, ...args], {
      cwd: __dirname,
      env: { ...process.env, PIPELINE_RUN_ID: options.runId || '' },
      stdio: 'inherit', 
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Step "${step.name}" failed with exit code ${code}`));
    });
  });
}

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, '-'); // 2025-08-08T13-24-10-123Z
  console.log(`\n=== Pipeline start. runId=${runId} ===\n`);

  cleanupOldFiles();

  const argv = process.argv.slice(2);

  for (const step of steps) {
    console.log(`\n--- Running step: ${step.name} (${step.file}) ---\n`);
    await runStep(step, argv, { runId });
    console.log(`\n✓ Done: ${step.name}\n`);
  }

  console.log(`\n=== Pipeline finished successfully. runId=${runId} ===\n`);
}

main().catch(err => {
  console.error('\n✗ Pipeline failed');
  console.error(err.stack || err.message || err);
  process.exit(1);
});
