const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mapeia os campos do Employee para o formato esperado pelo backend
const mapEmployeeForServer = (employee) => ({
  servidor: employee.nomeServidor,
  cargo_efetivo: employee.cargo.cargo_efetivo, // usamos o campo correto
  simbolo: employee.cargo.simbolo,
  data_nomeacao: employee.dtPublicacao, // formato ISO (YYYY-MM-DD)
  salario: employee.valorCC,
  redistribuicao: employee.redistribuicao && employee.redistribuicao.trim() !== '' 
    ? employee.redistribuicao 
    : 'Não',
  status: employee.status,
  secretaria: employee.secretaria,
  ordem: employee.ordem,
});

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
    return await response.json();
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

export const updateEmployee = async (employee) => {
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

export const deleteEmployee = async (employeeId) => {
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

export const createEmployee = async (employee) => {
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

export const updateEmployeePositions = async (employees) => {
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

export const createPosition = async (position) => {
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
