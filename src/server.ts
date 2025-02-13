import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config(); // Carrega variáveis de ambiente

const { Pool } = pg; // 🔥 Corrigida a importação para CommonJS

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'postgres_db', // Nome correto do serviço no Docker
  database: process.env.POSTGRES_DB || 'gecom',
  password: process.env.POSTGRES_PASSWORD || 'admin',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

const connectWithRetry = async (retries = 5) => {
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('✅ Banco de dados conectado com sucesso!');
      client.release(); // Libera a conexão após o teste
      return;
    } catch (error) {
      console.error(`❌ Falha ao conectar ao banco. Tentando novamente em 5s... (${retries} tentativas restantes)`);
      retries--;
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
  console.error('🚨 Não foi possível conectar ao banco após várias tentativas.');
  process.exit(1);
};

// Aguarda a conexão antes de iniciar o servidor
connectWithRetry().then(() => {
  app.get('/api/organizations', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM organizations');
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Erro ao buscar organizações:', error);
      res.status(500).send('Erro interno do servidor');
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
  });
});
