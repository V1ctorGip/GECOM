const API_URL = import.meta.env.VITE_API_URL || "http://gecom_backend:5000/api";

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
