const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup (SQLite - persiste em arquivo)
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS app_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL DEFAULT '{"projects":[],"evaluations":{}}'
  )
`);

// Insert default row if not exists
const row = db.prepare('SELECT * FROM app_data WHERE id = 1').get();
if (!row) {
  db.prepare('INSERT INTO app_data (id, data) VALUES (1, ?)').run(JSON.stringify({ projects: [], evaluations: {} }));
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API: Get all data
app.get('/api/data', (req, res) => {
  const row = db.prepare('SELECT data FROM app_data WHERE id = 1').get();
  res.json(JSON.parse(row.data));
});

// API: Update all data
app.put('/api/data', (req, res) => {
  const data = JSON.stringify(req.body);
  db.prepare('UPDATE app_data SET data = ? WHERE id = 1').run(data);
  res.json({ success: true });
});

// Fallback to frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
