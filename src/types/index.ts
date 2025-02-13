// src/types/index.ts
export type Organization = {
  codigo: number;
  nome: string;
  sigla: string;
  classificacao: 'DIRETA' | 'INDIRETA';
};

export type Position = {
  id: string;                // Identificador único do cargo
  numero: number;           // Nº (conforme a planilha)
  cargoGenerico: string;    // Texto do cargo genérico
  simbolo: string;          // Ex.: NE, DAS-1, FG etc.
};

export type Employee = {
  id: string;
  nomeServidor: string;     // Nome do servidor (ou vazio se estiver Vago)
  cargo: Position;
  status: 'Provido' | 'Vago';
  redistribuicao: string;   // Ex.: 'Não', 'Sim' ou 'Vago'
  dtPublicacao: string;     // Data de Publicação em D.O.
  valorCC: number;          // Valor do Cargo em Comissão
  secretaria: string;       // Sigla do órgão (ex.: 'CACIVIL')
};

export type OrganizationGrowth = {
  mes: string;
  total: number;
};

export type User = {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
};

export type Report = {
  id: string;
  title: string;
  description: string;
  type: 'organizations' | 'employees' | 'positions' | 'costs';
};
