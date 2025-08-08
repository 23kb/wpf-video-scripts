const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors()); 
app.use(express.static(path.join(__dirname, 'public')));

function startPipelineEnv(extraEnv = {}) {
  return {
    cwd: __dirname,
    env: { ...process.env, ...extraEnv },
  };
}

app.post('/run', (req, res) => {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const docUrl = req.body?.docUrl || '';
  const child = spawn(process.execPath, [path.resolve(__dirname, 'run-pipeline.js')], {
    ...startPipelineEnv({
      PIPELINE_TRIGGER: 'api',
      PIPELINE_REQUEST_BODY: JSON.stringify(req.body || {}),
      DOC_URL: docUrl,
      PIPELINE_RUN_ID: runId,
    }),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  res.json({ ok: true, runId });
});

app.get('/run/stream', (req, res) => {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const docUrl = req.query.docUrl || '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const child = spawn(process.execPath, [path.resolve(__dirname, 'run-pipeline.js')], {
    ...startPipelineEnv({
      PIPELINE_TRIGGER: 'sse',
      PIPELINE_RUN_ID: runId,
      DOC_URL: docUrl,
      PIPELINE_REQUEST_BODY: JSON.stringify({ docUrl }),
    }),
  });

  const send = data => {
    const text = typeof data === 'string' ? data : data.toString();
    res.write(`data: ${text.replace(/\n/g, '\ndata: ')}\n\n`);
  };

  send(`runId: ${runId}`);

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
