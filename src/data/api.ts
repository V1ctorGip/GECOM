const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const fetchOrganizations = async () => {
  try {
    const response = await fetch(`${API_URL}/organizations`);
    if (!response.ok) throw new Error("Erro ao buscar organizações");
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao buscar organizações:", error);
    return [];
  }
};

export const fetchEmployees = async () => {
  try {
    const response = await fetch(`${API_URL}/employees`);
    if (!response.ok) throw new Error("Erro ao buscar funcionários");
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao buscar funcionários:", error);
    return [];
  }
};

export const fetchPositions = async () => {
  try {
    const response = await fetch(`${API_URL}/positions`);
    if (!response.ok) throw new Error("Erro ao buscar cargos");
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao buscar cargos:", error);
    return [];
  }
};

export const fetchOrganizationGrowth = async () => {
  try {
    const response = await fetch(`${API_URL}/organization-growth`);
    if (!response.ok) throw new Error("Erro ao buscar crescimento organizacional");
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao buscar crescimento organizacional:", error);
    return [];
  }
};

export const updateEmployee = async (employee) => {
  try {
    const response = await fetch(`${API_URL}/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employee),
    });
    if (!response.ok) throw new Error("Erro ao atualizar funcionário");
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao atualizar funcionário:", error);
    throw error;
  }
};

export const deleteEmployee = async (employeeId) => {
  try {
    const response = await fetch(`${API_URL}/employees/${employeeId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Erro ao excluir funcionário");
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao excluir funcionário:", error);
    throw error;
  }
};

export const createEmployee = async (employee) => {
  try {
    const response = await fetch(`${API_URL}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employee),
    });
    if (!response.ok) throw new Error("Erro ao criar funcionário");
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao criar funcionário:", error);
    throw error;
  }
};
