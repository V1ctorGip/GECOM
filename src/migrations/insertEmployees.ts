import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

// Ajustar caminho do JSON dentro do Docker
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonFilePath = path.join(__dirname, '../../src/migrations/orgaos_e_servidores.json');

if (!fs.existsSync(jsonFilePath)) {
  console.error('❌ Arquivo JSON não encontrado:', jsonFilePath);
  process.exit(1);
}

let jsonData;
try {
  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  const parsedData = JSON.parse(fileContent);
  if (parsedData.employees && Array.isArray(parsedData.employees)) {
    jsonData = parsedData.employees;
  } else {
    throw new Error('O JSON não contém a chave "employees" ou não é um array.');
  }
  console.log('✅ JSON carregado com sucesso. Total de registros:', jsonData.length);
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('❌ Erro ao ler o JSON:', error.message);
  } else {
    console.error('❌ Erro desconhecido ao ler o JSON');
  }
  process.exit(1);
}

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'gecom',
  password: process.env.POSTGRES_PASSWORD || 'admin',
  port: Number(process.env.POSTGRES_PORT) || 5432,
});

// Função para obter a sigla da secretaria (comparação case-insensitive)
const getSiglaFromSecretaria = async (secretaria: string, client: any) => {
  if (!secretaria || typeof secretaria !== 'string' || secretaria.trim() === '') {
    throw new Error('Campo "secretaria" é obrigatório.');
  }
  const secretariaLimpa = secretaria.trim();
  const result = await client.query(
    `SELECT sigla FROM organizations WHERE LOWER(secretaria) = LOWER($1)`,
    [secretariaLimpa]
  );
  if (result.rows.length === 0) {
    throw new Error(`Secretaria "${secretaria}" não encontrada na tabela "organizations"`);
  }
  return result.rows[0].sigla;
};

const insertEmployees = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const emp of jsonData) {
      // Validar os campos obrigatórios: secretaria e status
      if (typeof emp.secretaria !== 'string' || emp.secretaria.trim() === '') {
        console.error('Registro inválido: campo "secretaria" ausente ou não é uma string.', emp);
        continue;
      }
      if (typeof emp.status !== 'string' || emp.status.trim() === '') {
        console.error('Registro inválido: campo "status" ausente ou não é uma string.', emp);
        continue;
      }

      // Campos opcionais: se forem strings válidas, usamos o valor tratado; caso contrário, null.
      const servidor = (typeof emp.servidor === 'string' && emp.servidor.trim() !== '')
        ? emp.servidor.trim().substring(0, 255)
        : null;
      const cargoEfetivo = (typeof emp.cargo_efetivo === 'string' && emp.cargo_efetivo.trim() !== '')
        ? emp.cargo_efetivo.trim().substring(0, 255)
        : null;
      const simbolo = (typeof emp.simbolo === 'string' && emp.simbolo.trim() !== '')
        ? emp.simbolo.trim().substring(0, 50)
        : null;
      const redistribuicao = (typeof emp.redistribuicao === 'string' && emp.redistribuicao.trim() !== '')
        ? emp.redistribuicao.trim().substring(0, 100)
        : null;
      const secretaria = emp.secretaria.trim().substring(0, 255);

      // Data de nomeação: se fornecida e válida, formatamos; caso contrário, null.
      const dataNomeacao = (typeof emp.data_nomeacao === 'string' && emp.data_nomeacao.trim() !== '')
        ? emp.data_nomeacao.trim().split('/').reverse().join('-')
        : null;
      // Salário: se fornecido e válido, convertemos; caso contrário, null.
      const salarioNumerico = (typeof emp.salario === 'string' && emp.salario.trim() !== '')
        ? Number(emp.salario.replace(/[^\d,]/g, '').replace(',', '.'))
        : null;

      // Status: deve ser "provido" ou "vago" (após trim e conversão para minúsculas)
      const statusTemp = emp.status.trim().toLowerCase();
      const statusCorrigido = (statusTemp === 'provido' || statusTemp === 'vago')
        ? (statusTemp === 'provido' ? 'Provido' : 'Vago')
        : null;
      if (!statusCorrigido) {
        console.error('Registro inválido: campo "status" com valor inválido.', emp);
        continue;
      }

      // Obter a sigla da secretaria
      const siglaSecretaria = await getSiglaFromSecretaria(secretaria, client);

      await client.query(
        `INSERT INTO employees (servidor, cargo_efetivo, simbolo, data_nomeacao, salario, redistribuicao, status, secretaria)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (servidor, cargo_efetivo, simbolo, data_nomeacao, secretaria) DO NOTHING`,
        [servidor, cargoEfetivo, simbolo, dataNomeacao, salarioNumerico, redistribuicao, statusCorrigido, siglaSecretaria]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Dados de employees inseridos com sucesso!');
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    if (error instanceof Error) {
      console.error('❌ Erro ao inserir dados:', error.message);
    } else {
      console.error('❌ Erro desconhecido ao inserir dados.');
    }
  } finally {
    client.release();
    pool.end();
  }
};

insertEmployees().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('❌ Erro inesperado:', error.message);
  } else {
    console.error('❌ Erro desconhecido durante a execução do script.');
  }
});
