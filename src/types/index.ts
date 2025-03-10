export type Organization = {
  codigo: number;
  secretaria: string;
  sigla: string;
  classificacao: 'DIRETA' | 'INDIRETA';
};

export type Position = {
  id: string;
  numero: number;
  cargo_efetivo: string;  // agora usando o nome do campo conforme o DB
  simbolo: string;
  secretaria: string; 
  salario?: number;     // para filtrar os cargos da secretaria específica
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
  ordem: number; // Nova propriedade para controlar a ordem/posição no datatable
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
