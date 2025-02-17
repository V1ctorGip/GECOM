import { Router, Request, Response } from 'express';
import pool from '../config/database.js';

const router = Router();

// GET /positions - Retorna todos os cargos ordenados por número
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM positions ORDER BY numero');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar cargos:', error);
    res.status(500).json({ error: 'Erro ao buscar cargos' });
  }
});

// POST /positions - Cria um novo cargo/posição
router.post('/', async (req: Request, res: Response) => {
  try {
    const { numero, cargo_efetivo, simbolo } = req.body;
    const queryText = `
      INSERT INTO positions (numero, cargo_efetivo, simbolo)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [numero, cargo_efetivo, simbolo];
    const result = await pool.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao criar posição:', error);
    res.status(500).json({ error: 'Erro ao criar posição', details: error.message });
  }
});

export default router;
