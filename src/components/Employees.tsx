/* src/components/Employees.tsx */
import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, FileText } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  fetchOrganizations,
  fetchEmployees,
  fetchPositions,
  updateEmployee,
  deleteEmployee,
  createEmployee,
  updateEmployeePositions,
  createPosition
} from '../data/api.js';
import { Employee, Organization, Position } from '../types/index.js';

interface RowReorderEvent {
  originalEvent: React.DragEvent<HTMLElement>;
  value: Employee[];
  dragIndex: number;
  dropIndex: number;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Converte data no formato ISO (YYYY-MM-DD) para DD/MM/YYYY
 */
const formatDateToBR = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Transforma o objeto retornado pelo backend em Employee
 */
const transformEmployee = (emp: any): Employee => ({
  id: String(emp.id),
  nomeServidor: emp.servidor || '',
  cargo: {
    id: String(emp.cargo_efetivo) || '',
    cargo_efetivo: emp.cargo_efetivo || 'Desconhecido',
    numero: 0,
    simbolo: emp.simbolo || '',
    secretaria: emp.secretaria
  },
  status: emp.status === 'Provido' ? 'Provido' : 'Vago',
  redistribuicao: emp.redistribuicao || 'Não',
  dtPublicacao: emp.data_nomeacao
    ? new Date(emp.data_nomeacao).toISOString().split('T')[0]
    : '',
  valorCC: Number(emp.salario) || 0,
  secretaria: emp.secretaria,
  ordem: emp.ordem || 0
});

type ModalMode = 'edit' | 'addVacant' | 'addNew';
const getMode = (employee: Employee): ModalMode => {
  if (employee.id === 'new') return 'addNew';
  if (employee.status === 'Vago') return 'addVacant';
  return 'edit';
};

type EditModalProps = {
  employee: Employee;
  mode: ModalMode;
  organizations: Organization[];
  positions: Position[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
};

/**
 * Modal de edição/criação de servidor
 */
function EditModal({
  employee,
  mode,
  organizations,
  positions,
  isOpen,
  onClose,
  onSave
}: EditModalProps) {
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });

  useEffect(() => {
    setEditedEmployee({ ...employee });
  }, [employee]);

  if (!isOpen) return null;

  // Remove duplicados de cargos e símbolos
  const dedupedCargos = useMemo(() => {
    const set = new Set(positions.map((pos) => pos.cargo_efetivo));
    return Array.from(set);
  }, [positions]);

  const dedupedSimbolos = useMemo(() => {
    const set = new Set(positions.map((pos) => pos.simbolo));
    return Array.from(set);
  }, [positions]);

  /**
   * Salva alterações (editar ou criar)
   */
  const handleSave = async () => {
    if (mode === 'addNew' || mode === 'addVacant') {
      // Ao criar servidor num cargo que estava vago
      const updated: Employee = {
        ...editedEmployee,
        nomeServidor: editedEmployee.nomeServidor.toUpperCase(),
        status: 'Provido'
      };
      if (mode === 'addNew') {
        // Cria um novo cargo caso não exista
        const exists = positions.find(
          (pos) =>
            pos.cargo_efetivo.trim().toLowerCase() ===
            updated.cargo.cargo_efetivo.trim().toLowerCase() &&
            pos.simbolo.trim().toLowerCase() ===
            updated.cargo.simbolo.trim().toLowerCase()
        );
        if (!exists) {
          const maxNumero =
            positions.length > 0 ? Math.max(...positions.map((p) => p.numero)) : 0;
          const novoNumero = maxNumero + 1;
          try {
            const newPos = await createPosition({
              numero: novoNumero,
              cargo_efetivo: updated.cargo.cargo_efetivo,
              simbolo: updated.cargo.simbolo
            });
            updated.cargo.id = String(newPos.id);
          } catch (error) {
            console.error('Erro ao criar nova posição:', error);
            alert('Erro ao criar nova posição');
            return;
          }
        }
      }
      alert('Servidor salvo com sucesso!');
      onSave(updated);
      onClose();
    } else {
      // Edição de servidor existente
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
          {/* Nome do Servidor */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Servidor</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
              value={editedEmployee.nomeServidor}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  nomeServidor:
                    mode === 'addNew' || mode === 'addVacant'
                      ? e.target.value.toUpperCase()
                      : e.target.value
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
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
                  placeholder="Digite ou selecione..."
                  value={editedEmployee.cargo.cargo_efetivo}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      cargo: {
                        ...editedEmployee.cargo,
                        cargo_efetivo: e.target.value
                      }
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
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
                value={editedEmployee.cargo.cargo_efetivo}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    cargo: {
                      ...editedEmployee.cargo,
                      cargo_efetivo: e.target.value
                    }
                  })
                }
                disabled={mode === 'edit' ? false : true}
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
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
                  placeholder="Digite ou selecione..."
                  value={editedEmployee.cargo.simbolo}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      cargo: { ...editedEmployee.cargo, simbolo: e.target.value }
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
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
                value={editedEmployee.cargo.simbolo}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    cargo: { ...editedEmployee.cargo, simbolo: e.target.value }
                  })
                }
                disabled={mode === 'edit' ? false : true}
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
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
              value={editedEmployee.redistribuicao}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  redistribuicao: e.target.value
                })
              }
            >
              <option value="">Nenhuma</option>
              {organizations.map((org) => (
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
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
              value={editedEmployee.dtPublicacao}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  dtPublicacao: e.target.value
                })
              }
            />
          </div>
          {/* Valor C.C. */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor C.C.</label>
            {(mode === 'addNew' || mode === 'edit') ? (
              <input
                type="number"
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
                value={editedEmployee.valorCC}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    valorCC: Number(e.target.value)
                  })
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
          {/* Status (só é editável se for modo edit) */}
          {mode === 'edit' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
                value={editedEmployee.status}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    status: e.target.value as 'Provido' | 'Vago'
                  })
                }
              >
                <option value="Provido">Provido</option>
                <option value="Vago">Vago</option>
              </select>
            </div>
          ) : (
            (mode === 'addNew' || mode === 'addVacant') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:ring focus:ring-blue-500"
                  value={editedEmployee.status}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      status: e.target.value as 'Provido'
                    })
                  }
                  disabled={mode === 'addVacant'}
                >
                  <option value="Provido">Provido</option>
                </select>
              </div>
            )
          )}
        </div>
        {/* Botões de ação do modal */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
 * Componente principal de gerenciamento de servidores
 */
export function Employees() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [selectedOrgan, setSelectedOrgan] = useState<string>('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  /**
   * Carrega dados iniciais (organizations, employees, positions)
   */
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

  /**
   * Lista de órgãos realmente disponíveis, ou seja,
   * aqueles que têm pelo menos um servidor/cargo cadastrado
   */
  const availableOrganizations = useMemo(() => {
    return organizations.filter((org) =>
      employeesData.some((emp) => emp.secretaria === org.sigla)
    );
  }, [organizations, employeesData]);

  /**
   * Ajusta selectedOrgan se não existir mais
   */
  useEffect(() => {
    if (availableOrganizations.length > 0) {
      const stillExists = availableOrganizations.find((org) => org.sigla === selectedOrgan);
      if (!stillExists) {
        setSelectedOrgan(availableOrganizations[0].sigla);
      }
    } else {
      setSelectedOrgan('');
    }
  }, [availableOrganizations, selectedOrgan]);

  /**
   * Filtra employees pelo órgão selecionado
   */
  const organizationRows = useMemo(() => {
    const filtered = employeesData.filter((emp) => emp.secretaria === selectedOrgan);
    return filtered.sort((a, b) => a.ordem - b.ordem);
  }, [employeesData, selectedOrgan]);

  /**
   * Soma de Valor C.C. (salário) dos servidores providos
   */
  const totalCC = useMemo(() => {
    return organizationRows
      .filter((emp) => emp.status === 'Provido')
      .reduce((sum, emp) => sum + (emp.valorCC || 0), 0);
  }, [organizationRows]);

  /**
   * Gráfico de barras "Distribuição de Cargos" (Provido vs Vago)
   */
  const chartData = useMemo(() => {
    const providoCount = organizationRows.filter((emp) => emp.status === 'Provido').length;
    const vagoCount = organizationRows.filter((emp) => emp.status === 'Vago').length;
    return {
      labels: ['Provido', 'Vago'],
      datasets: [
        {
          label: 'Cargos',
          data: [providoCount, vagoCount],
          backgroundColor: ['rgba(59, 130, 246, 0.2)', 'rgba(16, 185, 129, 0.2)'],
          borderColor: ['rgba(59, 130, 246, 1)', 'rgba(16, 185, 129, 1)'],
          borderWidth: 2,
          borderRadius: 5
        }
      ]
    };
  }, [organizationRows]);

  /**
   * Opções de estilo e tooltip do gráfico
   */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#1F2937'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#111827',
        bodyColor: '#111827',
        borderColor: '#D1D5DB',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#374151'
        },
        grid: {
          color: '#E5E7EB'
        }
      },
      y: {
        ticks: {
          color: '#374151'
        },
        grid: {
          color: '#E5E7EB'
        }
      }
    }
  };

  /**
   * Salva (cria ou atualiza) o employee
   */
  const handleSaveEmployee = async (updatedEmployee: Employee) => {
    if (updatedEmployee.id === 'new') {
      // Criar novo
      try {
        await createEmployee(updatedEmployee);
        await loadData();
      } catch (error) {
        console.error('Erro ao criar funcionário', error);
      }
    } else {
      // Editar existente
      try {
        await updateEmployee(updatedEmployee);
        await loadData();
      } catch (error) {
        console.error('Erro ao atualizar funcionário', error);
      }
    }
  };

  /**
   * Exclui employee
   */
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

  /**
   * Adiciona novo employee (status = 'Vago')
   */
  const handleAddNew = () => {
    const newEmployee: Employee = {
      id: 'new',
      nomeServidor: '',
      cargo: {
        id: '',
        cargo_efetivo: '',
        numero: 0,
        simbolo: '',
        secretaria: selectedOrgan
      },
      status: 'Vago',
      redistribuicao: '',
      dtPublicacao: '',
      valorCC: 0,
      secretaria: selectedOrgan,
      ordem: organizationRows.length + 1
    };
    setEditingEmployee(newEmployee);
  };

  /**
   * Reordena as linhas (arrastar e soltar)
   */
  const handleRowReorder = async (e: RowReorderEvent) => {
    const reordered = e.value;
    const updatedOrgRows = reordered.map((emp, index) => ({
      ...emp,
      ordem: index + 1
    }));
    const newEmployeesData = employeesData.map((emp) => {
      if (emp.secretaria === selectedOrgan) {
        const updatedEmp = updatedOrgRows.find((it) => it.id === emp.id);
        return updatedEmp || emp;
      }
      return emp;
    });
    setEmployeesData(newEmployeesData);
    try {
      await updateEmployeePositions(updatedOrgRows);
    } catch (error) {
      console.error('Erro ao atualizar posições no backend:', error);
    }
  };

  /**
   * Retorna o nome completo do órgão (secretaria) ao invés da sigla
   */
  const selectedOrganizationFullName = useMemo(() => {
    const org = organizations.find((o) => o.sigla === selectedOrgan);
    return org ? org.secretaria : '';
  }, [organizations, selectedOrgan]);

  /**
   * Template para exibir o número da linha
   */
  const rowNumberTemplate = (_emp: Employee, options: { rowIndex: number }) => {
    return options.rowIndex + 1;
  };

  /**
   * Template para exibir o nome do servidor ou 'VAGO'
   */
  const servidorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return emp.nomeServidor;
    }
    return <span className="text-green-700 font-bold">VAGO</span>;
  };

  /**
   * Template para exibir o valor formatado ou '-'
   */
  const valorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return `R$ ${emp.valorCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return '-';
  };

  /**
   * Template para exibir a data de publicação formatada
   */
  const dataPublicacaoTemplate = (emp: Employee) => {
    return emp.dtPublicacao ? formatDateToBR(emp.dtPublicacao) : '-';
  };

  /**
   * Template para exibir botões de ação (Editar/Excluir ou Adicionar)
   */
  const acoesTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setEditingEmployee(emp)}
            title="Editar"
            className="p-2 rounded-full text-white bg-blue-600 hover:bg-blue-800 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteEmployee(emp)}
            title="Excluir"
            className="p-2 rounded-full text-white bg-red-600 hover:bg-red-800 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      );
    }
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setEditingEmployee(emp)}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
        >
          Adicionar
        </button>
      </div>
    );
  };

  /**
   * Gera PDF com base nos dados do órgão selecionado
   */
  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(12);

    // Usar o nome completo do órgão no PDF
    doc.text(`Relatório de Servidores - ${selectedOrganizationFullName}`, 40, 40);

    const columns = [
      { header: '#', dataKey: 'numero' },
      { header: 'Cargo', dataKey: 'cargo' },
      { header: 'Símbolo', dataKey: 'simbolo' },
      { header: 'Servidor', dataKey: 'servidor' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Redistribuição', dataKey: 'redistribuicao' },
      { header: 'Publicação', dataKey: 'publicacao' },
      { header: 'Valor C.C.', dataKey: 'valorCC' }
    ];
    const rows = organizationRows.map((emp, index) => ({
      numero: index + 1,
      cargo: emp.cargo.cargo_efetivo,
      simbolo: emp.cargo.simbolo,
      servidor: emp.status === 'Provido' ? emp.nomeServidor : 'Vago',
      status: emp.status,
      redistribuicao: emp.redistribuicao || '',
      publicacao: emp.dtPublicacao ? formatDateToBR(emp.dtPublicacao) : '-',
      valorCC:
        emp.status === 'Provido'
          ? `R$ ${emp.valorCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '-'
    }));
    doc.autoTable({
      columns,
      body: rows,
      startY: 60,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 40, right: 40 }
    });
    doc.save(`Relatorio-${selectedOrganizationFullName}.pdf`);
  };

  /**
   * Destaca linha se for "Vago" (bg-green-50)
   */
  const rowClassName = (emp: Employee) => {
    return emp.status === 'Vago' ? 'bg-green-50' : '';
  };

  return (
    <div className="p-6">
      {/* Título principal */}
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Gerenciamento de Servidores</h1>

      {/* Filtro + PDF */}
      <div className="flex flex-col items-center justify-center md:flex-row md:justify-center gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <label className="font-medium">Selecione o Órgão:</label>
          <select
            className="p-2 border rounded-lg"
            value={selectedOrgan}
            onChange={(e) => setSelectedOrgan(e.target.value)}
          >
            {availableOrganizations.map((org) => (
              <option key={org.codigo} value={org.sigla}>
                {org.secretaria} ({org.sigla})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          title="Baixar PDF da tabela atual"
        >
          <FileText size={18} />
          <span>PDF</span>
        </button>
      </div>

      {/* Nome do órgão filtrado ao centro (com nome completo) */}
      {selectedOrgan && selectedOrganizationFullName && (
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-md">
            <span className="font-bold text-lg">{selectedOrganizationFullName}</span>
          </div>
        </div>
      )}

      {/* DataTable com gridlines e centralização */}
      {/* DATA TABLE COM GRIDLINES, ZEBRADO E ALINHAMENTO VERTICAL ENTRE CABEÇALHO E DADOS */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <DataTable
          value={organizationRows}
          dataKey="id"
          reorderableRows
          onRowReorder={handleRowReorder}
          scrollable
          responsiveLayout="scroll"
          rowClassName={rowClassName}
          className="p-datatable-gridlines p-datatable-striped p-datatable-sm"
          tableStyle={{ minWidth: '50rem' }}
        >
          {/* Coluna combinada: Ícone de reorder + número da linha */}
          <Column
            header="#"
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ width: '5rem' }}
            body={(rowData, options) => (
              <div className="flex items-center justify-center space-x-2">
                <i className="pi pi-bars cursor-move" style={{ fontSize: '1rem' }}></i>
                <span>{options.rowIndex + 1}</span>
              </div>
            )}
            rowReorder
          />

          <Column
            field="cargo.cargo_efetivo"
            header="Cargo Genérico"
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '10rem' }}
          />

          <Column
            field="cargo.simbolo"
            header="Símbolo"
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '6rem' }}
          />

          <Column
            header="Nome Servidor"
            body={servidorTemplate}
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '10rem' }}
          />

          <Column
            field="status"
            header="Status"
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '6rem' }}
          />

          <Column
            field="redistribuicao"
            header="Redistribuição"
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '7rem' }}
          />

          <Column
            header="Publicação"
            body={dataPublicacaoTemplate}
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '6rem' }}
          />

          <Column
            header="Valor C.C."
            body={valorTemplate}
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '7rem' }}
          />

          <Column
            header="Ações"
            body={acoesTemplate}
            headerClassName="text-center"
            bodyClassName="text-center"
            className="text-center"
            headerStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            bodyStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
            style={{ minWidth: '6rem' }}
          />
        </DataTable>
      </div>

      {/* Botão de adicionar novo */}
      <div className="text-center py-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          onClick={handleAddNew}
        >
          Adicionar Novo
        </button>
      </div>

      {/* Total Salarial centralizado */}
      <div className="mb-4 text-center">
        <p className="font-bold text-lg">
          Total Salarial: R${' '}
          {totalCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Gráfico de barras (Provido vs Vago) */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">Distribuição de Cargos</h2>
        <div style={{ position: 'relative', height: '300px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Modal de edição/adição de servidor */}
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
