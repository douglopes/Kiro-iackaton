const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'kiro_hackathon',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function initialize() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        participant VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS evaluators (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
        impacto INTEGER NOT NULL CHECK (impacto BETWEEN 1 AND 10),
        uso_kiro INTEGER NOT NULL CHECK (uso_kiro BETWEEN 1 AND 10),
        viabilidade INTEGER NOT NULL CHECK (viabilidade BETWEEN 1 AND 10),
        inovacao INTEGER NOT NULL CHECK (inovacao BETWEEN 1 AND 10),
        apresentacao INTEGER NOT NULL CHECK (apresentacao BETWEEN 1 AND 10),
        weighted_score DECIMAL(4,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, evaluator_id)
      );
    `);
  } finally {
    client.release();
  }
}

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { initialize, query, pool };
