// server.js
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.post('/run', (req, res) => {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  // Kick off in background
  const child = spawn(process.execPath, [path.resolve(__dirname, 'run-pipeline.js')], {
    cwd: __dirname,
    env: { ...process.env, PIPELINE_TRIGGER: 'api', PIPELINE_REQUEST_BODY: JSON.stringify(req.body || {}) },
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  res.json({ ok: true, runId });
});

// Live log stream for a fresh run
app.get('/run/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const child = spawn(process.execPath, [path.resolve(__dirname, 'run-pipeline.js')], {
    cwd: __dirname,
    env: { ...process.env, PIPELINE_TRIGGER: 'sse', PIPELINE_RUN_ID: runId }
  });

  const send = data => {
    const text = typeof data === 'string' ? data : data.toString();
    res.write(`data: ${text.replace(/\n/g, '\ndata: ')}\n\n`);
  };

  child.stdout.on('data', send);
  child.stderr.on('data', send);

  child.on('close', code => {
    send(`[process exited with code ${code}]`);
    res.end();
  });

  child.on('error', err => {
    send(`[error] ${err.message || err}`);
    res.end();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
