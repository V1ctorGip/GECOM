// src/data/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 1. Mapeia os campos do FRONT-END (Employee) para o BACKEND
const mapEmployeeForServer = (employee: any) => ({
  servidor: employee.nomeServidor,
  cargo_efetivo: employee.cargo.cargo_efetivo, // do cargo aninhado
  simbolo: employee.cargo.simbolo,
  data_nomeacao: employee.dtPublicacao, // formato ISO (YYYY-MM-DD)
  salario: employee.valorCC,
  redistribuicao:
    employee.redistribuicao && employee.redistribuicao.trim() !== ''
      ? employee.redistribuicao
      : 'Não',
  status: employee.status,
  secretaria: employee.secretaria,
  ordem: employee.ordem,
});

// 2. FUNÇÃO DE TRANSFORMACAO: do BACKEND para o FRONT (Employee)
function transformEmployee(dbRow: any) {
  return {
    id: String(dbRow.id),
    nomeServidor: dbRow.servidor || '',

    // "cargo" aninhado (Position) –> inclui os campos exigidos pelo seu type Position
    cargo: {
      id: '', // caso queira preencher com algo real depois
      numero: 0, // idem
      cargo_efetivo: dbRow.cargo_efetivo || '',
      simbolo: dbRow.simbolo || '',
      secretaria: dbRow.secretaria || '', // Para não dar erro no TS (Position tem 'secretaria')
    },

    status: dbRow.status === 'Provido' ? 'Provido' : 'Vago',
    redistribuicao: dbRow.redistribuicao || 'Não',

    // data_nomeacao vira dtPublicacao (YYYY-MM-DD)
    dtPublicacao: dbRow.data_nomeacao
      ? new Date(dbRow.data_nomeacao).toISOString().split('T')[0]
      : '',

    // salario vira valorCC
    valorCC: Number(dbRow.salario) || 0,

    // "secretaria" do próprio Employee (não confundir com cargo.secretaria)
    secretaria: dbRow.secretaria || '',

    ordem: dbRow.ordem || 0,
  };
}

// ====================== FETCHES ======================

export const fetchOrganizations = async () => {
  try {
    const response = await fetch(`${API_URL}/organizations`);
    if (!response.ok) throw new Error('Erro ao buscar organizações');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao buscar organizações:', error);
    return [];
  }
};

export const fetchEmployees = async () => {
  try {
    const response = await fetch(`${API_URL}/employees`);
    if (!response.ok) throw new Error('Erro ao buscar funcionários');

    // 1) Ler JSON cru (dbRows)
    const data = await response.json();

    // 2) Transformar cada "dbRow" em um Employee coerente
    const employees = data.map(transformEmployee);

    return employees;
  } catch (error) {
    console.error('❌ Erro ao buscar funcionários:', error);
    return [];
  }
};

export const fetchPositions = async () => {
  try {
    const response = await fetch(`${API_URL}/positions`);
    if (!response.ok) throw new Error('Erro ao buscar cargos');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao buscar cargos:', error);
    return [];
  }
};

export const fetchOrganizationGrowth = async () => {
  try {
    const response = await fetch(`${API_URL}/organization-growth`);
    if (!response.ok) throw new Error('Erro ao buscar crescimento organizacional');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao buscar crescimento organizacional:', error);
    return [];
  }
};

// ====================== CRUD EMPLOYEE ======================

export const updateEmployee = async (employee: any) => {
  try {
    const payload = mapEmployeeForServer(employee);
    const response = await fetch(`${API_URL}/employees/${employee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Erro ao atualizar funcionário');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao atualizar funcionário:', error);
    throw error;
  }
};

export const deleteEmployee = async (employeeId: string) => {
  try {
    const response = await fetch(`${API_URL}/employees/${employeeId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erro ao excluir funcionário');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao excluir funcionário:', error);
    throw error;
  }
};

export const createEmployee = async (employee: any) => {
  try {
    const payload = mapEmployeeForServer(employee);
    const response = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Erro ao criar funcionário');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao criar funcionário:', error);
    throw error;
  }
};

export const updateEmployeePositions = async (employees: any[]) => {
  try {
    const response = await fetch(`${API_URL}/employees/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees }),
    });
    if (!response.ok) throw new Error('Erro ao atualizar posições dos funcionários');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao atualizar posições dos funcionários:', error);
    throw error;
  }
};

// ====================== CRUD POSITION ======================

export const createPosition = async (position: any) => {
  try {
    const response = await fetch(`${API_URL}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(position),
    });
    if (!response.ok) throw new Error('Erro ao criar posição');
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao criar posição:', error);
    throw error;
  }
};
