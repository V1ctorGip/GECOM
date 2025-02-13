import { Request, Response } from 'express';
import pool from '../config/database';

export const getOrganizations = async (_req: Request, res: Response) => {  
  try {
    const result = await pool.query('SELECT * FROM organizations');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar organizações' });
  }
};
