CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  codigo INT NOT NULL UNIQUE,
  secretaria VARCHAR(255) NOT NULL,  
  sigla VARCHAR(20) NOT NULL UNIQUE,
  classificacao VARCHAR(50) CHECK (classificacao IN ('DIRETA', 'INDIRETA')) NOT NULL
);

CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  numero INT NOT NULL,
  cargo_efetivo VARCHAR(255) NOT NULL,
  simbolo VARCHAR(20) NOT NULL
);


CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  servidor VARCHAR(255),
  cargo_efetivo VARCHAR(255),
  simbolo VARCHAR(50),
  data_nomeacao DATE,
  salario DECIMAL(10,2) DEFAULT 0,
  redistribuicao VARCHAR(100) REFERENCES organizations(sigla) ON DELETE SET NULL,
  status VARCHAR(50) CHECK (status IN ('Vago','Provido')) NOT NULL,
  secretaria VARCHAR(255) NOT NULL REFERENCES organizations(sigla) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  UNIQUE (servidor, cargo_efetivo, simbolo, data_nomeacao, secretaria)
);

-- Função para definir automaticamente a ordem por secretaria
CREATE OR REPLACE FUNCTION set_default_ordem()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ordem IS NULL OR NEW.ordem = 0 THEN
    NEW.ordem := COALESCE((SELECT MAX(ordem) FROM employees WHERE secretaria = NEW.secretaria), 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que chama a função antes da inserção
CREATE TRIGGER trg_set_default_ordem
BEFORE INSERT ON employees
FOR EACH ROW
EXECUTE PROCEDURE set_default_ordem();

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'user')) NOT NULL
);
