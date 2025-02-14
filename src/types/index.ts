export type Organization = {
  codigo: number;
  secretaria: string;
  sigla: string;
  classificacao: 'DIRETA' | 'INDIRETA';
};

export type Position = {
  id: string;                
  numero: number;           // Se não houver, use 0 como default
  cargoGenerico: string;    
  simbolo: string;          // Se não houver, use uma string vazia
};

export interface Employee {
  id: string;
  nomeServidor: string;
  cargo: Position;
  status: 'Vago' | 'Provido';
  redistribuicao: string;
  dtPublicacao: string;
  valorCC: number;
  secretaria: string;
}

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
