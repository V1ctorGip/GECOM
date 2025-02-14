import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import {
  fetchOrganizations,
  fetchEmployees,
  updateEmployee,
  deleteEmployee,
  createEmployee,
} from '../data/api.js';
import { Employee, Organization } from '../types/index.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Transforma os dados retornados pela API para o formato usado internamente.
const transformEmployee = (emp: any): Employee => ({
  id: String(emp.id),
  nomeServidor: emp.servidor || '',
  cargo: {
    id: String(emp.cargo_efetivo) || '',
    cargoGenerico: emp.cargo_efetivo || 'Desconhecido',
    numero: 0,
    simbolo: emp.simbolo || '',
  },
  status: emp.status === 'Provido' ? 'Provido' : 'Vago',
  redistribuicao: emp.redistribuicao || 'Não',
  dtPublicacao: emp.data_nomeacao ? new Date(emp.data_nomeacao).toLocaleDateString('pt-BR') : '',
  valorCC: Number(emp.salario) || 0,
  secretaria: emp.secretaria,
});

type EditModalProps = {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
};

function EditModal({ employee, isOpen, onClose, onSave }: EditModalProps) {
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });
  useEffect(() => {
    setEditedEmployee({ ...employee });
  }, [employee]);
  if (!isOpen) return null;
  const formattedDate = editedEmployee.dtPublicacao
    ? editedEmployee.dtPublicacao.split('/').reverse().join('-')
    : '';
  const handleSave = () => {
    onSave(editedEmployee);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {employee.id === "new" ? 'Adicionar Servidor' : 'Editar Servidor'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Servidor</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.nomeServidor}
              onChange={(e) =>
                setEditedEmployee({ ...editedEmployee, nomeServidor: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo Genérico</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 cursor-not-allowed"
              value={editedEmployee.cargo.cargoGenerico}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Símbolo</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 cursor-not-allowed"
              value={editedEmployee.cargo.simbolo}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Redistribuição</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.redistribuicao}
              onChange={(e) =>
                setEditedEmployee({ ...editedEmployee, redistribuicao: e.target.value })
              }
            >
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Publicação</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formattedDate}
              onChange={(e) => {
                const date = new Date(e.target.value);
                const formatted = date.toLocaleDateString('pt-BR');
                setEditedEmployee({ ...editedEmployee, dtPublicacao: formatted });
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor C.C.</label>
            <input
              type="number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.valorCC}
              onChange={(e) =>
                setEditedEmployee({ ...editedEmployee, valorCC: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50" onClick={onClose}>
            Cancelar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export function Employees() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [selectedOrgan, setSelectedOrgan] = useState<string>('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Função para carregar dados do backend e atualizar o estado
  const loadData = async () => {
    const orgs = await fetchOrganizations();
    const emps = await fetchEmployees();
    setOrganizations(orgs);
    setEmployeesData(emps.map(transformEmployee));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Exibe no filtro apenas secretarias que possuem pelo menos um funcionário
  const availableOrganizations = useMemo(() => {
    return organizations.filter(org => employeesData.some(emp => emp.secretaria === org.sigla));
  }, [organizations, employeesData]);

  // Sempre que o filtro disponível mudar, garante que o "selectedOrgan" seja um dos disponíveis
  useEffect(() => {
    if (availableOrganizations.length > 0) {
      if (!availableOrganizations.find(org => org.sigla === selectedOrgan)) {
        setSelectedOrgan(availableOrganizations[0].sigla);
      }
    } else {
      setSelectedOrgan('');
    }
  }, [availableOrganizations, selectedOrgan]);

  // Filtra os funcionários pela secretaria selecionada
  const organizationRows = useMemo(() => {
    return employeesData.filter(emp => emp.secretaria === selectedOrgan);
  }, [employeesData, selectedOrgan]);

  // Calcula o total de Valor C.C. somente dos funcionários "Provido" da secretaria selecionada
  const totalCC = useMemo(() => {
    return organizationRows
      .filter(emp => emp.status === 'Provido')
      .reduce((sum, emp) => sum + (emp.valorCC || 0), 0);
  }, [organizationRows]);

  // Dados para o gráfico (contagem de cargos Providos vs Vagos)
  const chartData = useMemo(() => {
    const providoCount = organizationRows.filter(emp => emp.status === 'Provido').length;
    const vagoCount = organizationRows.filter(emp => emp.status === 'Vago').length;
    return {
      labels: ['Provido', 'Vago'],
      datasets: [
        {
          label: 'Cargos',
          data: [providoCount, vagoCount],
          backgroundColor: ['rgba(75,192,192,0.5)', 'rgba(255,99,132,0.5)'],
          borderColor: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)'],
          borderWidth: 1,
        },
      ],
    };
  }, [organizationRows]);

  const chartOptions = { responsive: true, maintainAspectRatio: false };

  // Ações: criação, atualização e exclusão chamam a API e recarregam os dados
  const handleSaveEmployee = async (updatedEmployee: Employee) => {
    if (updatedEmployee.id === 'new') {
      try {
        await createEmployee(updatedEmployee);
        await loadData();
      } catch (error) {
        console.error('Erro ao criar funcionário', error);
      }
    } else {
      try {
        await updateEmployee(updatedEmployee);
        await loadData();
      } catch (error) {
        console.error('Erro ao atualizar funcionário', error);
      }
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (window.confirm('Tem certeza que deseja excluir este servidor?')) {
      try {
        await deleteEmployee(employee.id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir funcionário', error);
      }
    }
  };

  // Prepara um novo registro para inserção
  const handleAddNew = () => {
    const newEmployee: Employee = {
      id: 'new',
      nomeServidor: '',
      cargo: { id: '', cargoGenerico: 'Novo Cargo', numero: 0, simbolo: '' },
      status: 'Vago',
      redistribuicao: 'Não',
      dtPublicacao: '',
      valorCC: 0,
      secretaria: selectedOrgan,
    };
    setEditingEmployee(newEmployee);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Servidores</h1>
      <div className="mb-4">
        <label className="mr-2 font-medium">Selecione o Órgão:</label>
        <select className="p-2 border rounded-lg" value={selectedOrgan} onChange={(e) => setSelectedOrgan(e.target.value)}>
          {availableOrganizations.map(org => (
            <option key={org.codigo} value={org.sigla}>
              {org.secretaria} ({org.sigla})
            </option>
          ))}
        </select>
      </div>
      <table className="min-w-full border-collapse mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Nº</th>
            <th className="border px-4 py-2">Cargo Genérico</th>
            <th className="border px-4 py-2">Símbolo</th>
            <th className="border px-4 py-2">Nome Servidor</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Redistribuição</th>
            <th className="border px-4 py-2">Dt P./D.O.</th>
            <th className="border px-4 py-2">Valor C.C.</th>
            <th className="border px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {organizationRows.map((emp, index) => (
            <tr key={emp.id}>
              <td className="border px-4 py-2">{index + 1}</td>
              <td className="border px-4 py-2">{emp.cargo.cargoGenerico}</td>
              <td className="border px-4 py-2">{emp.cargo.simbolo}</td>
              <td className="border px-4 py-2">
                {emp.status === 'Provido' ? emp.nomeServidor : <span className="text-gray-500">Vago</span>}
              </td>
              <td className="border px-4 py-2">{emp.status}</td>
              <td className="border px-4 py-2">{emp.redistribuicao}</td>
              <td className="border px-4 py-2">{emp.dtPublicacao || '-'}</td>
              <td className="border px-4 py-2">
                {emp.status === 'Provido'
                  ? `R$ ${emp.valorCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : '-'}
              </td>
              <td className="border px-4 py-2">
                {emp.status === 'Provido' ? (
                  <div className="flex space-x-2">
                    <button onClick={() => setEditingEmployee(emp)} title="Editar">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteEmployee(emp)} title="Excluir" className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingEmployee(emp)} className="bg-green-600 text-white px-2 py-1 rounded">
                    Adicionar
                  </button>
                )}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={9} className="text-center py-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleAddNew}>
                Adicionar Novo
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mb-4">
        <p className="font-bold">Total de Valor C.C.: R$ {totalCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <h2 className="text-xl font-bold mb-4">Distribuição de Cargos</h2>
        <div style={{ position: 'relative', height: '300px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
      {editingEmployee && (
        <EditModal
          employee={editingEmployee}
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  );
}
