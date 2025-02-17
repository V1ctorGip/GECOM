import { Router, Request, Response } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * PUT /employees/reorder
 * Atualiza a ordem dos funcionários.
 */
router.put('/reorder', async (req: Request, res: Response) => {
  const { employees } = req.body;
  try {
    await pool.query('BEGIN');
    for (const emp of employees) {
      await pool.query('UPDATE employees SET ordem = $1 WHERE id = $2', [emp.ordem, emp.id]);
    }
    await pool.query('COMMIT');
    res.json({ message: 'Ordens atualizadas com sucesso' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Erro ao atualizar posições dos funcionários', error);
    res.status(500).json({ error: 'Erro ao atualizar posições dos funcionários' });
  }
});

/**
 * GET /employees
 * Retorna todos os funcionários ordenados pela coluna "ordem".
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY ordem ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar funcionários', error);
    res.status(500).json({ error: 'Erro ao buscar funcionários' });
  }
});

/**
 * POST /employees
 * Cria um novo funcionário.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      servidor,
      cargo_efetivo,
      simbolo,
      data_nomeacao,
      salario,
      redistribuicao,
      status,
      secretaria,
      ordem,
    } = req.body;

    const queryText = `
      INSERT INTO employees 
        (servidor, cargo_efetivo, simbolo, data_nomeacao, salario, redistribuicao, status, secretaria, ordem)
      VALUES (
        $1, 
        $2, 
        $3, 
        CASE WHEN $4 = '' THEN NULL ELSE to_date($4, 'YYYY-MM-DD') END, 
        $5, 
        CASE WHEN $6 = 'Não' THEN NULL ELSE $6 END, 
        $7, 
        $8, 
        $9
      )
      RETURNING *
    `;
    const values = [servidor, cargo_efetivo, simbolo, data_nomeacao, salario, redistribuicao, status, secretaria, ordem];
    const result = await pool.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao criar funcionário', error);
    res.status(500).json({ error: 'Erro ao criar funcionário', details: error.message });
  }
});

/**
 * PUT /employees/:id
 * Atualiza os dados de um funcionário.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      servidor,
      cargo_efetivo,
      simbolo,
      data_nomeacao,
      salario,
      redistribuicao,
      status,
      secretaria,
      ordem,
    } = req.body;

    const queryText = `
      UPDATE employees
      SET servidor = $1,
          cargo_efetivo = $2,
          simbolo = $3,
          data_nomeacao = CASE WHEN $4 = '' THEN NULL ELSE to_date($4, 'YYYY-MM-DD') END,
          salario = $5,
          redistribuicao = CASE WHEN $6 = 'Não' THEN NULL ELSE $6 END,
          status = $7,
          secretaria = $8,
          ordem = $9
      WHERE id = $10
      RETURNING *
    `;
    const values = [servidor, cargo_efetivo, simbolo, data_nomeacao, salario, redistribuicao, status, secretaria, ordem, id];
    const result = await pool.query(queryText, values);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Funcionário não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar funcionário', error);
    res.status(500).json({ error: 'Erro ao atualizar funcionário', details: error.message });
  }
});

/**
 * DELETE /employees/:id
 * Exclui um funcionário pelo id.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Funcionário não encontrado' });
      return;
    }
    res.json({ message: 'Funcionário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir funcionário', error);
    res.status(500).json({ error: 'Erro ao excluir funcionário' });
  }
});

export default router;
