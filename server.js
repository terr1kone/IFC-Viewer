const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const MODELS_DIR = path.join(__dirname, 'models');
const INDEX_FILE = path.join(MODELS_DIR, 'index.json');
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

const app = express();
app.use(express.json());

if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveIndex(index) {
  const tmp = INDEX_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2));
  fs.renameSync(tmp, INDEX_FILE);
}

function isValidId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
}

function publicUrl(req, id) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/view/${id}`;
}

app.get('/api/models', (req, res) => {
  const index = loadIndex();
  const models = Object.entries(index).map(([id, meta]) => ({
    id,
    name: meta.name,
    size: meta.size,
    uploadedAt: meta.uploadedAt,
    url: publicUrl(req, id),
  }));
  res.json({ models });
});

app.post('/api/models', express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), (req, res) => {
  const name = String(req.headers['x-filename'] || 'model.ifc');
  if (!/\.ifc$/i.test(name)) {
    return res.status(400).json({ error: 'Only .ifc files are accepted.' });
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Empty request body. Send the IFC file as the raw body.' });
  }
  const id = crypto.randomUUID();
  fs.writeFileSync(path.join(MODELS_DIR, id + '.ifc'), req.body);
  const index = loadIndex();
  index[id] = {
    name: path.basename(name),
    size: req.body.length,
    uploadedAt: new Date().toISOString(),
  };
  saveIndex(index);
  res.status(201).json({ id, name: index[id].name, size: req.body.length, url: publicUrl(req, id) });
});

app.delete('/api/models/:id', (req, res) => {
  const id = req.params.id;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id.' });
  const index = loadIndex();
  if (!index[id]) return res.status(404).json({ error: 'Model not found.' });
  delete index[id];
  saveIndex(index);
  fs.rmSync(path.join(MODELS_DIR, id + '.ifc'), { force: true });
  res.json({ ok: true });
});

app.get('/models/:id', (req, res) => {
  const id = req.params.id;
  if (!isValidId(id)) return res.status(400).send('Invalid id.');
  const file = path.join(MODELS_DIR, id + '.ifc');
  if (!fs.existsSync(file)) return res.status(404).send('Model not found.');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.sendFile(file);
});

app.get('/view/:id', (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).send('Invalid id.');
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'File too large (max 500 MB).' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`IFC viewer running at http://localhost:${PORT}/`);
});
