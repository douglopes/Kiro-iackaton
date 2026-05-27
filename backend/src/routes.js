const express = require('express');
const router = express.Router();
const db = require('./database');

// ============ EVALUATORS ============

// Register/Login evaluator
router.post('/evaluators', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO evaluators (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = $1
       RETURNING *`,
      [name.trim()]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating evaluator:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============ PROJECTS ============

// List all projects
router.get('/projects', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM projects ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing projects:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create project
router.post('/projects', async (req, res) => {
  try {
    const { title, description, participant } = req.body;
    if (!title || !description || !participant) {
      return res.status(400).json({ error: 'Título, descrição e participante são obrigatórios' });
    }

    const result = await db.query(
      'INSERT INTO projects (title, description, participant) VALUES ($1, $2, $3) RETURNING *',
      [title.trim(), description.trim(), participant.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update project
router.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, participant } = req.body;

    const result = await db.query(
      'UPDATE projects SET title = $1, description = $2, participant = $3 WHERE id = $4 RETURNING *',
      [title.trim(), description.trim(), participant.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete project
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    res.json({ message: 'Projeto excluído com sucesso' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============ EVALUATIONS ============

// Submit evaluation
router.post('/evaluations', async (req, res) => {
  try {
    const { project_id, evaluator_id, impacto, uso_kiro, viabilidade, inovacao, apresentacao } = req.body;

    // Validate scores
    const scores = { impacto, uso_kiro, viabilidade, inovacao, apresentacao };
    for (const [key, value] of Object.entries(scores)) {
      if (!value || value < 1 || value > 10) {
        return res.status(400).json({ error: `Nota inválida para ${key}. Deve ser entre 1 e 10.` });
      }
    }

    // Calculate weighted score
    const weighted_score = (
      impacto * 0.30 +
      uso_kiro * 0.25 +
      viabilidade * 0.20 +
      inovacao * 0.15 +
      apresentacao * 0.10
    ).toFixed(2);

    const result = await db.query(
      `INSERT INTO evaluations (project_id, evaluator_id, impacto, uso_kiro, viabilidade, inovacao, apresentacao, weighted_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (project_id, evaluator_id)
       DO UPDATE SET impacto = $3, uso_kiro = $4, viabilidade = $5, inovacao = $6, apresentacao = $7, weighted_score = $8, created_at = NOW()
       RETURNING *`,
      [project_id, evaluator_id, impacto, uso_kiro, viabilidade, inovacao, apresentacao, weighted_score]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating evaluation:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get evaluations for a project by an evaluator
router.get('/evaluations/:projectId/:evaluatorId', async (req, res) => {
  try {
    const { projectId, evaluatorId } = req.params;
    const result = await db.query(
      'SELECT * FROM evaluations WHERE project_id = $1 AND evaluator_id = $2',
      [projectId, evaluatorId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting evaluation:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all evaluations for an evaluator
router.get('/evaluations/evaluator/:evaluatorId', async (req, res) => {
  try {
    const { evaluatorId } = req.params;
    const result = await db.query(
      'SELECT * FROM evaluations WHERE evaluator_id = $1',
      [evaluatorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting evaluations:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============ RANKING ============

// Get ranking (average weighted scores)
router.get('/ranking', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.title,
        p.participant,
        COALESCE(AVG(e.weighted_score), 0) as avg_score,
        COUNT(e.id) as total_evaluations
      FROM projects p
      LEFT JOIN evaluations e ON p.id = e.project_id
      GROUP BY p.id, p.title, p.participant
      ORDER BY avg_score DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error getting ranking:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
