import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  fetchOrganizations,
  fetchEmployees,
  fetchPositions,
  updateEmployee,
  deleteEmployee,
  createEmployee,
  updateEmployeePositions,
  createPosition,
} from '../data/api.js';
import { Employee, Organization, Position } from '../types/index.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Helper: converte data ISO para DD/MM/YYYY
const formatDateToBR = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

// Transforma os dados do backend para o formato esperado
const transformEmployee = (emp: any): Employee => ({
  id: String(emp.id),
  nomeServidor: emp.servidor || '',
  cargo: {
    id: String(emp.cargo_efetivo) || '',
    cargo_efetivo: emp.cargo_efetivo || 'Desconhecido',
    numero: 0,
    simbolo: emp.simbolo || '',
    secretaria: emp.secretaria,
  },
  status: emp.status === 'Provido' ? 'Provido' : 'Vago',
  redistribuicao: emp.redistribuicao ? emp.redistribuicao : 'Não',
  dtPublicacao: emp.data_nomeacao
    ? new Date(emp.data_nomeacao).toISOString().split('T')[0]
    : '',
  valorCC: Number(emp.salario) || 0,
  secretaria: emp.secretaria,
  ordem: emp.ordem || 0,
});

// Modos do modal
type ModalMode = 'edit' | 'addVacant' | 'addNew';
const getMode = (employee: Employee): ModalMode => {
  if (employee.id === 'new') return 'addNew';
  if (employee.status === 'Vago') return 'addVacant';
  return 'edit';
};

// Props para o modal
type EditModalProps = {
  employee: Employee;
  mode: ModalMode;
  organizations: Organization[];
  positions: Position[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
};

function EditModal({ employee, mode, organizations, positions, isOpen, onClose, onSave }: EditModalProps) {
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });

  useEffect(() => {
    setEditedEmployee({ ...employee });
  }, [employee]);

  if (!isOpen) return null;

  // Para o modo addNew, criamos listas deduplicadas para cargos e símbolos
  const dedupedCargos = useMemo(() => {
    const set = new Set(positions.map(pos => pos.cargo_efetivo));
    return Array.from(set);
  }, [positions]);

  const dedupedSimbolos = useMemo(() => {
    const set = new Set(positions.map(pos => pos.simbolo));
    return Array.from(set);
  }, [positions]);

  const handleSave = async () => {
    if (mode === 'addNew') {
      // Converte nome para MAIÚSCULAS
      const updated = { ...editedEmployee, nomeServidor: editedEmployee.nomeServidor.toUpperCase() };
      // Forçamos o status para "Provido"
      updated.status = 'Provido';
      // Verifica se o cargo/símbolo digitado já existe
      const exists = positions.find(
        (pos) =>
          pos.cargo_efetivo.trim().toLowerCase() === updated.cargo.cargo_efetivo.trim().toLowerCase() &&
          pos.simbolo.trim().toLowerCase() === updated.cargo.simbolo.trim().toLowerCase()
      );
      if (!exists) {
        // Se não existir, calcula um novo número para a posição
        const maxNumero = positions.length > 0 ? Math.max(...positions.map(p => p.numero)) : 0;
        const novoNumero = maxNumero + 1;
        try {
          const newPos = await createPosition({
            numero: novoNumero,
            cargo_efetivo: updated.cargo.cargo_efetivo,
            simbolo: updated.cargo.simbolo,
          });
          updated.cargo.id = String(newPos.id);
        } catch (error) {
          console.error('Erro ao criar nova posição:', error);
          alert('Erro ao criar nova posição');
          return;
        }
      }
      setEditedEmployee(updated);
      alert('Servidor salvo com sucesso!');
      onSave(updated);
      onClose();
    } else {
      if (mode === 'addVacant') {
        setEditedEmployee(prev => ({ ...prev, status: 'Provido' }));
      }
      alert('Servidor salvo com sucesso!');
      onSave(editedEmployee);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === 'addNew'
            ? 'Adicionar Novo Servidor'
            : mode === 'addVacant'
            ? 'Adicionar Servidor'
            : 'Editar Servidor'}
        </h2>
        <div className="space-y-4">
          {/* Nome Servidor */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Servidor</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.nomeServidor}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  nomeServidor: mode === 'addNew' ? e.target.value.toUpperCase() : e.target.value,
                })
              }
            />
          </div>
          {/* Cargo Genérico */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo Genérico</label>
            {mode === 'addNew' ? (
              <>
                <input
                  type="text"
                  list="cargo-options"
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Digite ou selecione..."
                  value={editedEmployee.cargo.cargo_efetivo}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      cargo: { ...editedEmployee.cargo, cargo_efetivo: e.target.value },
                    })
                  }
                />
                <datalist id="cargo-options">
                  {dedupedCargos.map((cargo, idx) => (
                    <option key={idx} value={cargo} />
                  ))}
                </datalist>
              </>
            ) : (
              <select
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={editedEmployee.cargo.cargo_efetivo}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    cargo: { ...editedEmployee.cargo, cargo_efetivo: e.target.value },
                  })
                }
                disabled={mode === 'edit'}
              >
                {dedupedCargos.map((cargo, idx) => (
                  <option key={idx} value={cargo}>
                    {cargo}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Símbolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Símbolo</label>
            {mode === 'addNew' ? (
              <>
                <input
                  type="text"
                  list="simbolo-options"
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Digite ou selecione..."
                  value={editedEmployee.cargo.simbolo}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      cargo: { ...editedEmployee.cargo, simbolo: e.target.value },
                    })
                  }
                />
                <datalist id="simbolo-options">
                  {dedupedSimbolos.map((simbolo, idx) => (
                    <option key={idx} value={simbolo} />
                  ))}
                </datalist>
              </>
            ) : (
              <select
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={editedEmployee.cargo.simbolo}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    cargo: { ...editedEmployee.cargo, simbolo: e.target.value },
                  })
                }
                disabled={mode === 'edit'}
              >
                {dedupedSimbolos.map((simbolo, idx) => (
                  <option key={idx} value={simbolo}>
                    {simbolo}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Redistribuição */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Redistribuição</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.redistribuicao}
              onChange={(e) =>
                setEditedEmployee({ ...editedEmployee, redistribuicao: e.target.value })
              }
              disabled={mode === 'edit'}
            >
              <option value="">Nenhuma</option>
              {organizations.map(org => (
                <option key={org.sigla} value={org.sigla}>
                  {org.sigla}
                </option>
              ))}
            </select>
          </div>
          {/* Data de Publicação */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Publicação</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.dtPublicacao}
              onChange={(e) =>
                setEditedEmployee({ ...editedEmployee, dtPublicacao: e.target.value })
              }
            />
          </div>
          {/* Valor C.C. */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor C.C.</label>
            {mode === 'addNew' ? (
              <input
                type="number"
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={editedEmployee.valorCC}
                onChange={(e) =>
                  setEditedEmployee({ ...editedEmployee, valorCC: Number(e.target.value) })
                }
              />
            ) : (
              <input
                type="number"
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 cursor-not-allowed p-2"
                value={editedEmployee.valorCC}
                disabled
              />
            )}
          </div>
          {/* Status – somente no modo addNew, forçando "Provido" */}
          {mode === 'addNew' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={editedEmployee.status}
                onChange={(e) =>
                  setEditedEmployee({ ...editedEmployee, status: e.target.value as 'Vago' | 'Provido' })
                }
              >
                <option value="Provido">Provido</option>
              </select>
            </div>
          )}
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
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [selectedOrgan, setSelectedOrgan] = useState<string>('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const loadData = async () => {
    try {
      const orgs = await fetchOrganizations();
      const emps = await fetchEmployees();
      const poss = await fetchPositions();
      setOrganizations(orgs);
      setPositions(poss);
      const transformed = emps.map(transformEmployee);
      transformed.sort((a, b) => a.ordem - b.ordem);
      setEmployeesData(transformed);
    } catch (error) {
      console.error('Erro ao carregar os dados', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableOrganizations = useMemo(() => {
    return organizations.filter(org => employeesData.some(emp => emp.secretaria === org.sigla));
  }, [organizations, employeesData]);

  useEffect(() => {
    if (availableOrganizations.length > 0) {
      if (!availableOrganizations.find(org => org.sigla === selectedOrgan)) {
        setSelectedOrgan(availableOrganizations[0].sigla);
      }
    } else {
      setSelectedOrgan('');
    }
  }, [availableOrganizations, selectedOrgan]);

  const organizationRows = useMemo(() => {
    const filtered = employeesData.filter(emp => emp.secretaria === selectedOrgan);
    return filtered.sort((a, b) => a.ordem - b.ordem);
  }, [employeesData, selectedOrgan]);

  const totalCC = useMemo(() => {
    return organizationRows
      .filter(emp => emp.status === 'Provido')
      .reduce((sum, emp) => sum + (emp.valorCC || 0), 0);
  }, [organizationRows]);

  const chartData = useMemo(() => {
    const providoCount = organizationRows.filter(emp => emp.status === 'Provido').length;
    const vagoCount = organizationRows.filter(emp => emp.status === 'Vago').length;
    return {
      labels: ['Provido', 'Vago'],
      datasets: [{
        label: 'Cargos',
        data: [providoCount, vagoCount],
        backgroundColor: ['rgba(75,192,192,0.5)', 'rgba(255,99,132,0.5)'],
        borderColor: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)'],
        borderWidth: 1,
      }],
    };
  }, [organizationRows]);

  const chartOptions = { responsive: true, maintainAspectRatio: false };

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

  const handleAddNew = () => {
    const newEmployee: Employee = {
      id: 'new',
      nomeServidor: '',
      cargo: { id: '', cargo_efetivo: '', numero: 0, simbolo: '', secretaria: selectedOrgan },
      status: 'Vago',
      redistribuicao: '',
      dtPublicacao: '',
      valorCC: 0,
      secretaria: selectedOrgan,
      ordem: organizationRows.length + 1,
    };
    setEditingEmployee(newEmployee);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    const newOrder = Array.from(organizationRows);
    const [movedItem] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(destinationIndex, 0, movedItem);
    const updatedOrganizationRows = newOrder.map((emp, index) => ({
      ...emp,
      ordem: index + 1,
    }));
    const newEmployeesData = employeesData.map(emp => {
      if (emp.secretaria === selectedOrgan) {
        const updatedEmp = updatedOrganizationRows.find(e => e.id === emp.id);
        return updatedEmp ? updatedEmp : emp;
      }
      return emp;
    });
    setEmployeesData(newEmployeesData);
    try {
      await updateEmployeePositions(updatedOrganizationRows);
    } catch (error) {
      console.error('Erro ao atualizar posições', error);
    }
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <table className="min-w-full border-collapse mb-4">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">Nº</th>
              <th className="border px-4 py-2">Cargo Genérico</th>
              <th className="border px-4 py-2">Símbolo</th>
              <th className="border px-4 py-2">Nome do Servidor</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Redistribuição</th>
              <th className="border px-4 py-2">Dt P./D.O.</th>
              <th className="border px-4 py-2">Valor C.C.</th>
              <th className="border px-4 py-2">Ações</th>
            </tr>
          </thead>
          <Droppable droppableId="employees">
            {(provided) => (
              <tbody ref={provided.innerRef} {...provided.droppableProps}>
                {organizationRows.length > 0 ? (
                  organizationRows.map((emp, index) => (
                    <Draggable key={emp.id} draggableId={emp.id} index={index}>
                      {(provided) => (
                        <tr ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          <td className="border px-4 py-2">{index + 1}</td>
                          <td className="border px-4 py-2">{emp.cargo.cargo_efetivo}</td>
                          <td className="border px-4 py-2">{emp.cargo.simbolo}</td>
                          <td className="border px-4 py-2">
                            {emp.status === 'Provido' ? emp.nomeServidor : <span className="text-gray-500">Vago</span>}
                          </td>
                          <td className="border px-4 py-2">{emp.status}</td>
                          <td className="border px-4 py-2">{emp.redistribuicao}</td>
                          <td className="border px-4 py-2">
                            {emp.dtPublicacao ? formatDateToBR(emp.dtPublicacao) : '-'}
                          </td>
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
                                <button
                                  onClick={() => handleDeleteEmployee(emp)}
                                  title="Excluir"
                                  className="text-red-600 hover:text-red-800"
                                >
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
                      )}
                    </Draggable>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-4">Nenhum funcionário encontrado.</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={9} className="text-center py-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleAddNew}>
                      Adicionar Novo
                    </button>
                  </td>
                </tr>
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </table>
      </DragDropContext>
      <div className="mb-4">
        <p className="font-bold">
          Total de Valor C.C.: R$ {totalCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
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
          mode={getMode(editingEmployee)}
          organizations={organizations}
          positions={positions}
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  );
}
