import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o seu JSON de posições
const jsonFilePath = path.join(__dirname, '../../src/migrations/positions_output.json');

if (!fs.existsSync(jsonFilePath)) {
  console.error('❌ Arquivo JSON de posições não encontrado:', jsonFilePath);
  process.exit(1);
}

let parsedData;
try {
  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  parsedData = JSON.parse(fileContent);
  console.log('✅ JSON de posições carregado com sucesso.');
} catch (error: any) {
  console.error('❌ Erro ao ler o JSON de posições:', error.message);
  process.exit(1);
}

// Se o JSON possuir a chave "positions", use-a; caso contrário, assume que o JSON é um array
const positionsData = Array.isArray(parsedData) ? parsedData : parsedData.positions;
if (!positionsData || !Array.isArray(positionsData)) {
  console.error('❌ JSON de posições não possui um array válido.');
  process.exit(1);
}
console.log(`✅ Total de registros de posições: ${positionsData.length}`);

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'gecom',
  password: process.env.POSTGRES_PASSWORD || 'admin',
  port: Number(process.env.POSTGRES_PORT) || 5432,
});

const insertPositions = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const pos of positionsData) {
      // Verifica se os campos obrigatórios estão presentes
      if (!pos.numero || !pos.cargo_efetivo || !pos.simbolo) {
        console.error('Registro de posição inválido:', pos);
        continue;
      }
      await client.query(
        `INSERT INTO positions (numero, cargo_efetivo, simbolo)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [pos.numero, pos.cargo_efetivo, pos.simbolo]
      );
    }
    await client.query('COMMIT');
    console.log('✅ Dados de positions inseridos com sucesso!');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao inserir dados de positions:', error.message);
  } finally {
    client.release();
    pool.end();
  }
};

insertPositions().catch((error: any) => {
  console.error('❌ Erro inesperado:', error.message);
});
