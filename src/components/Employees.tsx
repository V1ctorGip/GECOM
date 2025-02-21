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
  Legend,
} from 'chart.js';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

import jsPDF from 'jspdf';
// Import para injetar autoTable no prototype do jsPDF
import 'jspdf-autotable';

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

// Interface para o evento de reorder no DataTable
interface RowReorderEvent {
  originalEvent: React.DragEvent<HTMLElement>;
  value: Employee[];
  dragIndex: number;
  dropIndex: number;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Helper para data
const formatDateToBR = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

// Transforma do backend para Employee do frontend
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
  redistribuicao: emp.redistribuicao || 'Não',
  dtPublicacao: emp.data_nomeacao
    ? new Date(emp.data_nomeacao).toISOString().split('T')[0]
    : '',
  valorCC: Number(emp.salario) || 0,
  secretaria: emp.secretaria,
  ordem: emp.ordem || 0,
});

type ModalMode = 'edit' | 'addVacant' | 'addNew';
const getMode = (employee: Employee): ModalMode => {
  if (employee.id === 'new') return 'addNew';
  if (employee.status === 'Vago') return 'addVacant';
  return 'edit';
};

/** Props do modal */
type EditModalProps = {
  employee: Employee;
  mode: ModalMode;
  organizations: Organization[];
  positions: Position[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
};

function EditModal({
  employee,
  mode,
  organizations,
  positions,
  isOpen,
  onClose,
  onSave,
}: EditModalProps) {
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });

  useEffect(() => {
    setEditedEmployee({ ...employee });
  }, [employee]);

  if (!isOpen) return null;

  const dedupedCargos = useMemo(() => {
    const set = new Set(positions.map((pos) => pos.cargo_efetivo));
    return Array.from(set);
  }, [positions]);

  const dedupedSimbolos = useMemo(() => {
    const set = new Set(positions.map((pos) => pos.simbolo));
    return Array.from(set);
  }, [positions]);

  const handleSave = async () => {
    if (mode === 'addNew' || mode === 'addVacant') {
      const updated: Employee = {
        ...editedEmployee,
        nomeServidor: editedEmployee.nomeServidor.toUpperCase(),
        status: 'Provido',
      };
      if (mode === 'addNew') {
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
              simbolo: updated.cargo.simbolo,
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
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
              value={editedEmployee.nomeServidor}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  nomeServidor:
                    mode === 'addNew' || mode === 'addVacant'
                      ? e.target.value.toUpperCase()
                      : e.target.value,
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
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
                  placeholder="Digite ou selecione..."
                  value={editedEmployee.cargo.cargo_efetivo}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      cargo: {
                        ...editedEmployee.cargo,
                        cargo_efetivo: e.target.value,
                      },
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
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
                value={editedEmployee.cargo.cargo_efetivo}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    cargo: {
                      ...editedEmployee.cargo,
                      cargo_efetivo: e.target.value,
                    },
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
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
                value={editedEmployee.cargo.simbolo}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    cargo: { ...editedEmployee.cargo, simbolo: e.target.value },
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
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
              value={editedEmployee.redistribuicao}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  redistribuicao: e.target.value,
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
              className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
              value={editedEmployee.dtPublicacao}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  dtPublicacao: e.target.value,
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
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
                value={editedEmployee.valorCC}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    valorCC: Number(e.target.value),
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

          {/* Status */}
          {mode === 'edit' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
                value={editedEmployee.status}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    status: e.target.value as 'Provido' | 'Vago',
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
                  className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm"
                  value={editedEmployee.status}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      status: e.target.value as 'Provido',
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
    return organizations.filter((org) =>
      employeesData.some((emp) => emp.secretaria === org.sigla)
    );
  }, [organizations, employeesData]);

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

  const organizationRows = useMemo(() => {
    const filtered = employeesData.filter((emp) => emp.secretaria === selectedOrgan);
    return filtered.sort((a, b) => a.ordem - b.ordem);
  }, [employeesData, selectedOrgan]);

  const totalCC = useMemo(() => {
    return organizationRows
      .filter((emp) => emp.status === 'Provido')
      .reduce((sum, emp) => sum + (emp.valorCC || 0), 0);
  }, [organizationRows]);

  const chartData = useMemo(() => {
    const providoCount = organizationRows.filter((emp) => emp.status === 'Provido').length;
    const vagoCount = organizationRows.filter((emp) => emp.status === 'Vago').length;
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
      cargo: {
        id: '',
        cargo_efetivo: '',
        numero: 0,
        simbolo: '',
        secretaria: selectedOrgan,
      },
      status: 'Vago',
      redistribuicao: '',
      dtPublicacao: '',
      valorCC: 0,
      secretaria: selectedOrgan,
      ordem: organizationRows.length + 1,
    };
    setEditingEmployee(newEmployee);
  };

  const handleRowReorder = async (e: RowReorderEvent) => {
    const reordered = e.value;
    const updatedOrgRows = reordered.map((emp, index) => ({
      ...emp,
      ordem: index + 1,
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

  // Renderiza a coluna # (índice da linha)
  const rowNumberTemplate = (_emp: Employee, options: { rowIndex: number }) => {
    return options.rowIndex + 1;
  };

  // Mostra nome do servidor ou "Vago"
  const servidorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return emp.nomeServidor;
    }
    return <span className="text-gray-500">Vago</span>;
  };

  // Mostra valor formatado ou "-"
  const valorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return `R$ ${emp.valorCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return '-';
  };

  // Mostra data no formato BR
  const dataPublicacaoTemplate = (emp: Employee) => {
    return emp.dtPublicacao ? formatDateToBR(emp.dtPublicacao) : '-';
  };

  // Botões de ação
  const acoesTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return (
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
      );
    }
    return (
      <button
        onClick={() => setEditingEmployee(emp)}
        className="bg-green-600 text-white px-2 py-1 rounded"
      >
        Adicionar
      </button>
    );
  };

  // Gera PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(12);
    doc.text(`Relatório de Servidores - ${selectedOrgan}`, 40, 40);

    // Em vez de head + body com arrays de objetos,
    // vamos usar a forma columns + body.
    // "columns" define {header, dataKey}, e "body" é array de objetos.
    // Assim não teremos [object Object].
    const columns = [
      { header: '#', dataKey: 'numero' },
      { header: 'Cargo', dataKey: 'cargo' },
      { header: 'Símbolo', dataKey: 'simbolo' },
      { header: 'Servidor', dataKey: 'servidor' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Redistribuição', dataKey: 'redistribuicao' },
      { header: 'Publicação', dataKey: 'publicacao' },
      { header: 'Valor C.C.', dataKey: 'valorCC' },
    ];

    // "rows": array de objetos, cada um com as chaves dataKey
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
          : '-',
    }));

    // Use "columns" em vez de "head"
    doc.autoTable({
      columns, // colunas definidas acima
      body: rows, // dados
      startY: 60,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 40, right: 40 },
    });

    doc.save(`Relatorio-${selectedOrgan}.pdf`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Servidores</h1>

      <div className="mb-4 flex items-center space-x-4">
        <div>
          <label className="mr-2 font-medium">Selecione o Órgão:</label>
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

        {/* Botão PDF */}
        <button
          onClick={handleDownloadPDF}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
          title="Baixar PDF da tabela atual"
        >
          <FileText size={18} />
          <span>PDF</span>
        </button>
      </div>

      <DataTable
        value={organizationRows}
        reorderableRows
        onRowReorder={handleRowReorder}
        tableStyle={{ minWidth: '50rem' }}
        responsiveLayout="scroll"
      >
        <Column rowReorder style={{ width: '3rem' }} />
        <Column
          header="#"
          body={rowNumberTemplate}
          style={{ width: '3rem', textAlign: 'center' }}
        />
        <Column
          field="cargo.cargo_efetivo"
          header="Cargo Genérico"
          style={{ minWidth: '8rem' }}
        />
        <Column
          field="cargo.simbolo"
          header="Símbolo"
          style={{ minWidth: '6rem', textAlign: 'center' }}
        />
        <Column
          header="Servidor"
          body={servidorTemplate}
          style={{ minWidth: '10rem' }}
        />
        <Column
          field="status"
          header="Status"
          style={{ minWidth: '6rem', textAlign: 'center' }}
        />
        <Column
          field="redistribuicao"
          header="Redistribuição"
          style={{ minWidth: '7rem', textAlign: 'center' }}
        />
        <Column
          header="Publicação"
          body={dataPublicacaoTemplate}
          style={{ minWidth: '6rem', textAlign: 'center' }}
        />
        <Column
          header="Valor C.C."
          body={valorTemplate}
          style={{ minWidth: '7rem', textAlign: 'center' }}
        />
        <Column
          header="Ações"
          body={acoesTemplate}
          style={{ minWidth: '6rem', textAlign: 'center' }}
        />
      </DataTable>

      <div className="text-center py-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleAddNew}>
          Adicionar Novo
        </button>
      </div>

      <div className="mb-4">
        <p className="font-bold">
          Total de Valor C.C.: R${' '}
          {totalCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
