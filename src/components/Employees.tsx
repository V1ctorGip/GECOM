// src/components/Employees.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
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
import { fetchEmployees, fetchPositions, fetchOrganizations } from '../data/api.js';
import { Employee, Position, Organization } from '../types/index.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Transforma os dados da API para o formato esperado.
 * Mapeia os campos da tabela employees:
 * - servidor        → nomeServidor
 * - cargo_efetivo   → cargo.cargoGenerico (e id)
 * - simbolo         → cargo.simbolo
 * - data_nomeacao   → dtPublicacao (formatado para pt-BR)
 * - salario         → valorCC
 * - redistribuicao  → redistribuicao
 * - status          → status
 * - secretaria      → secretaria
 */
const transformEmployee = (emp: any): Employee => {
  return {
    id: String(emp.id),
    nomeServidor: emp.servidor || '',
    cargo: {
      id: String(emp.cargo_efetivo) || '',
      cargoGenerico: emp.cargo_efetivo || 'Desconhecido',
      // Como a tabela employees não possui um "número" definido,
      // esse campo ficará em zero (poderá ser sobrescrito se houver dados de posição)
      numero: 0,
      simbolo: emp.simbolo || '',
    },
    status: emp.status === 'Provido' ? 'Provido' : 'Vago',
    redistribuicao: emp.redistribuicao || 'Não',
    dtPublicacao: emp.data_nomeacao
      ? new Date(emp.data_nomeacao).toLocaleDateString('pt-BR')
      : '',
    valorCC: Number(emp.salario) || 0,
    secretaria: emp.secretaria,
  };
};

type EditModalProps = {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
};

/**
 * Modal para edição ou adição de um servidor.
 */
function EditModal({ employee, isOpen, onClose, onSave }: EditModalProps) {
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });

  useEffect(() => {
    setEditedEmployee({ ...employee });
  }, [employee]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedEmployee);
    onClose();
  };

  // Converte a data para o formato YYYY-MM-DD (para input date)
  const formattedDate = editedEmployee.dtPublicacao
    ? editedEmployee.dtPublicacao.split('/').reverse().join('-')
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {employee.id.startsWith('vacant-') ? 'Adicionar Servidor' : 'Editar Servidor'}
        </h2>
        <div className="space-y-4">
          {/* Nome Servidor */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nome Servidor
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.nomeServidor}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  nomeServidor: e.target.value,
                })
              }
            />
          </div>
          {/* Redistribuição */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Redistribuição
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.redistribuicao}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  redistribuicao: e.target.value,
                })
              }
            >
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
          {/* Data de Publicação */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data de Publicação
            </label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formattedDate}
              onChange={(e) => {
                const date = new Date(e.target.value);
                const formatted = date.toLocaleDateString('pt-BR');
                setEditedEmployee({
                  ...editedEmployee,
                  dtPublicacao: formatted,
                });
              }}
            />
          </div>
          {/* Valor C.C. */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Valor C.C.
            </label>
            <input
              type="number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={editedEmployee.valorCC}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  valorCC: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={handleSave}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente principal: Gerenciamento de Servidores.
 *
 * Este componente busca os dados reais da API e monta a _datatable_
 * e o gráfico usando os dados da tabela employees.
 *
 * Se houver dados de posições (positionsData) eles serão utilizados para
 * mesclar informações (como o número do cargo). Caso contrário, usaremos
 * apenas os funcionários filtrados pelo órgão selecionado.
 *
 * As colunas exibidas serão:
 * - Nº (número da posição ou índice)
 * - Cargo Genérico (campo cargo_efetivo)
 * - Símbolo (campo simbolo)
 * - Nome Servidor (campo servidor)
 * - Status (campo status)
 * - Redistribuição (campo redistribuicao)
 * - Dt P./D.O. (campo data_nomeacao)
 * - Valor C.C. (campo salario)
 * - Ações
 */
export function Employees() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positionsData, setPositionsData] = useState<Position[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [selectedOrgan, setSelectedOrgan] = useState<string>('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Busca os dados reais via API
  useEffect(() => {
    fetchOrganizations().then((data) => {
      setOrganizations(data);
      if (data.length > 0) {
        setSelectedOrgan(data[0].sigla);
      }
    });
    fetchPositions().then((data) => {
      setPositionsData(data);
    });
    fetchEmployees().then((data) => {
      const transformed = data.map(transformEmployee);
      setEmployeesData(transformed);
    });
  }, []);

  const organizationRows = useMemo(() => {
    // Filtra os funcionários pelo órgão selecionado.
    const filteredEmployees = employeesData.filter(
      (emp) => emp.secretaria === selectedOrgan
    );
    // Se houver dados de posições, usamos para montar as linhas (para exibir vagas se necessário)
    if (positionsData && positionsData.length > 0) {
      return positionsData.map((position) => {
        const emp = filteredEmployees.find(
          (e) =>
            e.cargo.id === String(position.id) ||
            e.cargo.id === position.cargoGenerico
        );
        if (emp) {
          return { ...emp, cargo: { ...position } };
        }
        return {
          id: `vacant-${position.id}`,
          nomeServidor: '',
          cargo: position,
          status: 'Vago',
          redistribuicao: 'Não',
          dtPublicacao: '',
          valorCC: 0,
          secretaria: selectedOrgan,
        } as Employee;
      });
    } else {
      // Se não houver positionsData, usa apenas os funcionários filtrados.
      return filteredEmployees.map((emp, index) => ({
        ...emp,
        // Define o "número" como o índice + 1.
        cargo: { ...emp.cargo, numero: index + 1 },
      }));
    }
  }, [employeesData, positionsData, selectedOrgan]);

  const totalCC = useMemo(() => {
    return organizationRows.reduce(
      (total, row) =>
        total + (row.status === 'Provido' ? (row.valorCC ?? 0) : 0),
      0
    );
  }, [organizationRows]);

  const chartData = useMemo(() => {
    const providoCount = organizationRows.filter(
      (row) => row.status === 'Provido'
    ).length;
    const vagoCount = organizationRows.filter(
      (row) => row.status === 'Vago'
    ).length;
    return {
      labels: ['Provido', 'Vago'],
      datasets: [
        {
          label: 'Cargos',
          data: [providoCount, vagoCount],
          backgroundColor: [
            'rgba(75, 192, 192, 0.5)',
            'rgba(255, 99, 132, 0.5)',
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [organizationRows]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  // Se houver positionsData, o drag & drop reordena as posições.
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (positionsData && positionsData.length > 0) {
      const newPositions = Array.from(positionsData);
      const [removed] = newPositions.splice(result.source.index, 1);
      newPositions.splice(result.destination.index, 0, removed);
      setPositionsData(newPositions);
    }
  };

  const handleSaveEmployee = (updatedEmployee: Employee) => {
    if (updatedEmployee.id.startsWith('vacant-')) {
      const newEmployee: Employee = {
        ...updatedEmployee,
        id: String(new Date().getTime()),
        status: 'Provido',
        valorCC: updatedEmployee.valorCC ?? 0,
      };
      setEmployeesData([...employeesData, newEmployee]);
    } else {
      setEmployeesData(
        employeesData.map((emp) =>
          emp.id === updatedEmployee.id ? { ...updatedEmployee } : emp
        )
      );
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (
      window.confirm('Tem certeza que deseja excluir este servidor?')
    ) {
      setEmployeesData(
        employeesData.filter((emp) => emp.id !== employee.id)
      );
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Gerenciamento de Servidores
      </h1>

      {/* Filtro de Órgão */}
      <div className="mb-4">
        <label className="mr-2 font-medium">Selecione o Órgão:</label>
        <select
          className="p-2 border rounded-lg"
          value={selectedOrgan}
          onChange={(e) => setSelectedOrgan(e.target.value)}
        >
          {organizations.map((org) => (
            <option key={org.codigo} value={org.sigla}>
              {org.secretaria} ({org.sigla})
            </option>
          ))}
        </select>
      </div>

      {/* Tabela com Drag & Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="table">
          {(provided) => (
            <table
              className="min-w-full border-collapse mb-4"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
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
                {organizationRows.map((row, index) => (
                  <Draggable
                    key={row.cargo.id}
                    draggableId={row.cargo.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <tr
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={snapshot.isDragging ? 'bg-blue-100' : ''}
                      >
                        {/* Pegador para drag & drop */}
                        <td className="border px-4 py-2" {...provided.dragHandleProps}>
                          {row.cargo.numero || index + 1}
                        </td>
                        <td className="border px-4 py-2">
                          {row.cargo.cargoGenerico}
                        </td>
                        <td className="border px-4 py-2">
                          {row.cargo.simbolo}
                        </td>
                        <td className="border px-4 py-2">
                          {row.status === 'Provido' ? (
                            row.nomeServidor
                          ) : (
                            <span className="text-gray-500">Vago</span>
                          )}
                        </td>
                        <td className="border px-4 py-2">{row.status}</td>
                        <td className="border px-4 py-2">
                          {row.redistribuicao}
                        </td>
                        <td className="border px-4 py-2">
                          {row.dtPublicacao || '-'}
                        </td>
                        <td className="border px-4 py-2">
                          {row.status === 'Provido'
                            ? `R$ ${row.valorCC.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`
                            : '-'}
                        </td>
                        <td className="border px-4 py-2">
                          {row.status === 'Provido' ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingEmployee(row)}
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(row)}
                                title="Excluir"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingEmployee(row)}
                              className="bg-green-600 text-white px-2 py-1 rounded"
                            >
                              Adicionar
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            </table>
          )}
        </Droppable>
      </DragDropContext>

      {/* Total de Valor C.C. */}
      <div className="mb-4">
        <p className="font-bold">
          Total de Valor C.C.: R${' '}
          {totalCC.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}
        </p>
      </div>

      {/* Gráfico de Distribuição de Cargos */}
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <h2 className="text-xl font-bold mb-4">
          Distribuição de Cargos
        </h2>
        <div style={{ position: 'relative', height: '300px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Modal para edição/adicionar servidor */}
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
