CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  codigo INT NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(20) NOT NULL UNIQUE,
  classificacao VARCHAR(50) CHECK (classificacao IN ('DIRETA', 'INDIRETA')) NOT NULL
);

CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  numero INT NOT NULL,
  cargo_generico VARCHAR(255) NOT NULL,
  simbolo VARCHAR(20) NOT NULL
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  nome_servidor VARCHAR(255),
  cargo_id INT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  status VARCHAR(50) CHECK (status IN ('Vago', 'Provido')) NOT NULL,
  redistribuicao VARCHAR(50) CHECK (redistribuicao IN ('Sim', 'Não', 'Vago')) NOT NULL,
  dt_publicacao DATE,
  valor_cc DECIMAL(10,2) NOT NULL DEFAULT 0,
  secretaria VARCHAR(50) NOT NULL REFERENCES organizations(sigla) ON DELETE CASCADE
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'user')) NOT NULL
);
