import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'postgres_db', // Nome do serviço no Docker
  database: process.env.POSTGRES_DB || 'gecom',
  password: process.env.POSTGRES_PASSWORD || 'admin',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

app.get('/api/organizations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations ORDER BY codigo');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar organizações:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar funcionários:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM positions ORDER BY numero');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar cargos:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

app.get('/api/organization-growth', async (req, res) => {
  try {
    // Se não houver dados, retorne um array vazio
    res.json([]);
  } catch (error: any) {
    console.error('Erro ao buscar crescimento organizacional:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
});
