import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import employeeRoutes from './routes/employeeRoutes.js';
import positionsRoutes from './routes/positionRoutes.js';
import pool from './config/database.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Rotas de employees
app.use('/api/employees', employeeRoutes);

// Rotas de positions
app.use('/api/positions', positionsRoutes);

// Endpoint para organizations
app.get('/api/organizations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations ORDER BY codigo');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar organizações:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Endpoint para organization-growth (exemplo)
app.get('/api/organization-growth', async (req, res) => {
  try {
    res.json([]);
  } catch (error: any) {
    console.error('Erro ao buscar crescimento organizacional:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
});
