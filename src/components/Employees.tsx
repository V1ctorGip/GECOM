/* src/components/Employees.tsx */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Edit2, Trash2, FileText } from 'lucide-react';
// import { Bar } from 'react-chartjs-2'; // ← COMENTADO para não exibir o gráfico
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
import autoTable from 'jspdf-autotable'; // para tipagem
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

const formatDateToBR = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

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
        status: 'Provido'
      };
      if (mode === 'addNew') {
        // Verifica se cargo + símbolo já existe
        const exists = positions.find(
          (pos) =>
            pos.cargo_efetivo.trim().toLowerCase() ===
              updated.cargo.cargo_efetivo.trim().toLowerCase() &&
            pos.simbolo.trim().toLowerCase() ===
              updated.cargo.simbolo.trim().toLowerCase()
        );
        if (!exists) {
          // Cria nova Position
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
          {/* Status */}
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

        {/* Botões */}
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

export function Employees() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);

  // ======= Estados para os 3 "Multi-Select + Busca" (Órgão, Cargo, Símbolo) =======
  const [orgSearch, setOrgSearch] = useState('');
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  const [cargoSearch, setCargoSearch] = useState('');
  const [cargoDropdownOpen, setCargoDropdownOpen] = useState(false);
  const [selectedCargos, setSelectedCargos] = useState<string[]>([]);

  const [symbolSearch, setSymbolSearch] = useState('');
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);

  // ======= Filtro de Status (simples) =======
  const [statusFilter, setStatusFilter] = useState('');

  // ======= Estado de edição (modal) =======
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // ======= Refs para cada dropdown, para fechar ao clicar fora =======
  const orgRef = useRef<HTMLDivElement>(null);
  const cargoRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef<HTMLDivElement>(null);

  // ======= Carrega dados iniciais =======
  const loadData = async () => {
    try {
      const orgs = await fetchOrganizations();
      const emps = await fetchEmployees();
      const poss = await fetchPositions();

      setOrganizations(orgs);
      setPositions(poss);

      // Aplica transform e ordena
      const transformed = emps.map(transformEmployee);
      transformed.sort((a, b) => a.ordem - b.ordem);
      setEmployeesData(transformed);

      // Ordenação no array original
      emps.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
      setEmployeesData(emps);

    } catch (error) {
      console.error('Erro ao carregar os dados', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ======= Fechar dropdowns ao clicar fora =======
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (cargoRef.current && !cargoRef.current.contains(event.target as Node)) {
        setCargoDropdownOpen(false);
      }
      if (symbolRef.current && !symbolRef.current.contains(event.target as Node)) {
        setSymbolDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ======= Se não selecionar nada, pega o primeiro órgão por padrão =======
  useEffect(() => {
    if (organizations.length > 0 && selectedOrgs.length === 0) {
      const firstOrg = organizations[0];
      if (firstOrg) {
        setSelectedOrgs([firstOrg.sigla]);
      }
    }
  }, [organizations, selectedOrgs]);

  // ======= Lista de órgãos disponíveis (que aparecem nos employeesData) =======
  const availableOrganizations = useMemo(() => {
    return organizations.filter((org) =>
      employeesData.some((emp) => emp.secretaria === org.sigla)
    );
  }, [organizations, employeesData]);

  // ======= Filtro interno de órgão pela busca orgSearch =======
  const filteredOrgOptions = useMemo(() => {
    return availableOrganizations.filter((org) => {
      const texto = `${org.sigla} ${org.secretaria}`.toLowerCase();
      return texto.includes(orgSearch.toLowerCase());
    });
  }, [availableOrganizations, orgSearch]);

  // ======= Filtrar employeesData por orgs selecionadas, para descobrir cargos/símbolos =======
  const allRowsFromSelectedOrgs = useMemo(() => {
    // Se selectedOrgs estiver vazio => consideramos sem órgãos => result = []
    if (selectedOrgs.length === 0) {
      return [];
    }
    return employeesData.filter((emp) => selectedOrgs.includes(emp.secretaria));
  }, [employeesData, selectedOrgs]);

  // ======= Opções de cargo e símbolo (somente das orgs selecionadas) =======
  const cargoOptions = useMemo(() => {
    const setCargos = new Set(
      allRowsFromSelectedOrgs.map((emp) => emp.cargo.cargo_efetivo)
    );
    return Array.from(setCargos).sort();
  }, [allRowsFromSelectedOrgs]);

  const symbolOptions = useMemo(() => {
    const setSymbols = new Set(
      allRowsFromSelectedOrgs.map((emp) => emp.cargo.simbolo)
    );
    return Array.from(setSymbols).sort();
  }, [allRowsFromSelectedOrgs]);

  // ======= Filtrar cargos e símbolos pela busca =======
  const filteredCargoOptions = useMemo(() => {
    return cargoOptions.filter((cargo) =>
      cargo.toLowerCase().includes(cargoSearch.toLowerCase())
    );
  }, [cargoOptions, cargoSearch]);

  const filteredSymbolOptions = useMemo(() => {
    return symbolOptions.filter((symbol) =>
      symbol.toLowerCase().includes(symbolSearch.toLowerCase())
    );
  }, [symbolOptions, symbolSearch]);

  // ======= Exibir texto resumido no botão do multi-select =======
  function getMultiSelectDisplayText(selectedList: string[]): string {
    if (selectedList.length === 0) return 'Nenhum';
    if (selectedList.length <= 2) return selectedList.join(', ');
    const firstTwo = selectedList.slice(0, 2).join(', ');
    return firstTwo + '...';
  }

  // ======= Filtragem final para a DataTable =======
  const filteredRows = useMemo(() => {
    // Se selectedOrgs está vazio => sem órgãos => array vazio
    if (selectedOrgs.length === 0) {
      return [];
    }
    return employeesData.filter((emp) => {
      // 1) Órgãos
      if (!selectedOrgs.includes(emp.secretaria)) {
        return false;
      }
      // 2) Cargo
      if (selectedCargos.length > 0 && !selectedCargos.includes(emp.cargo.cargo_efetivo)) {
        return false;
      }
      // 3) Símbolo
      if (selectedSymbols.length > 0 && !selectedSymbols.includes(emp.cargo.simbolo)) {
        return false;
      }
      // 4) Status
      if (statusFilter && emp.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [employeesData, selectedOrgs, selectedCargos, selectedSymbols, statusFilter]);

  // ======= Cálculos de rodapé =======
  const totalProvido = useMemo(() => {
    return filteredRows
      .filter((emp) => emp.status === 'Provido')
      .reduce((sum, emp) => sum + (emp.valorCC || 0), 0);
  }, [filteredRows]);

  const totalVago = useMemo(() => {
    return filteredRows
      .filter((emp) => emp.status === 'Vago')
      .reduce((sum, emp) => sum + (emp.valorCC || 0), 0);
  }, [filteredRows]);

  const totalGeral = totalProvido + totalVago;

  const qtdProvidos = useMemo(() => {
    return filteredRows.filter((emp) => emp.status === 'Provido').length;
  }, [filteredRows]);

  const qtdVagos = useMemo(() => {
    return filteredRows.filter((emp) => emp.status === 'Vago').length;
  }, [filteredRows]);

  // ======= Descobrir quais órgãos aparecem no resultado filtrado =======
  const orgsInFilteredData = useMemo(() => {
    const siglasSet = new Set(filteredRows.map((emp) => emp.secretaria));
    return organizations.filter((org) => siglasSet.has(org.sigla));
  }, [filteredRows, organizations]);

  // ======= Exibir mini-card com nome do(s) órgão(s) =======
  const orgDisplayText = useMemo(() => {
    if (orgsInFilteredData.length === 0) return '';
    if (orgsInFilteredData.length === 1) {
      const o = orgsInFilteredData[0];
      return `${o.secretaria} (${o.sigla})`;
    } else {
      return orgsInFilteredData.map((o) => o.sigla).join(', ');
    }
  }, [orgsInFilteredData]);

  // ======= CRUD =======
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

  // ======= Botão Adicionar Novo (usa o primeiro órgão selecionado) =======
  const handleAddNew = () => {
    // Se não houver nenhum órgão selecionado, fica vazio
    const defaultOrg = selectedOrgs.length > 0 ? selectedOrgs[0] : '';
    const newEmployee: Employee = {
      id: 'new',
      nomeServidor: '',
      cargo: {
        id: '',
        cargo_efetivo: '',
        numero: 0,
        simbolo: '',
        secretaria: defaultOrg
      },
      status: 'Vago',
      redistribuicao: '',
      dtPublicacao: '',
      valorCC: 0,
      secretaria: defaultOrg,
      ordem: employeesData.length + 1
    };
    setEditingEmployee(newEmployee);
  };

  // ======= Reordenar linhas (idêntico ao código antigo, mas multi) =======
  const handleRowReorder = async (e: RowReorderEvent) => {
    const reordered = e.value;
    // Atualiza a propriedade ordem em cada linha
    const updatedOrgRows = reordered.map((emp, index) => ({
      ...emp,
      ordem: index + 1
    }));

    // Substitui no array principal
    const newEmployeesData = [...employeesData];
    updatedOrgRows.forEach((upd) => {
      const idx = newEmployeesData.findIndex((x) => x.id === upd.id);
      if (idx !== -1) {
        newEmployeesData[idx] = upd;
      }
    });

    setEmployeesData(newEmployeesData);

    // Persiste no backend
    try {
      await updateEmployeePositions(updatedOrgRows);
    } catch (error) {
      console.error('Erro ao atualizar posições no backend:', error);
    }
  };

  // ======= PDF (com divisão por órgão e salário alinhado) =======
  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(12);

    // Agrupa as linhas filtradas por órgão
    const grouped: Record<string, Employee[]> = {};
    for (const emp of filteredRows) {
      if (!grouped[emp.secretaria]) {
        grouped[emp.secretaria] = [];
      }
      grouped[emp.secretaria].push(emp);
    }

    const orgSiglas = Object.keys(grouped).sort();
    let currentY = 40;

    for (const sigla of orgSiglas) {
      const org = organizations.find((o) => o.sigla === sigla);
      let orgTitle = sigla;
      if (org) {
        orgTitle = `${org.secretaria} (${org.sigla})`;
      }

      doc.text(`Relatório de Servidores - ${orgTitle}`, 40, currentY);

      const orgRows = grouped[sigla].map((emp, index) => ({
        numero: index + 1,
        cargo: emp.cargo.cargo_efetivo,
        simbolo: emp.cargo.simbolo,
        servidor: emp.status === 'Provido' ? emp.nomeServidor : 'Vago',
        status: emp.status,
        redistribuicao: emp.redistribuicao || '',
        publicacao: emp.dtPublicacao ? formatDateToBR(emp.dtPublicacao) : '-',
        valorCC: `R$\u00A0${emp.valorCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }));

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

      (doc as any).autoTable({
        startY: currentY + 20,
        head: [columns.map((col) => col.header)],
        body: orgRows.map((r) => columns.map((col) => r[col.dataKey])),
        styles: {
          fontSize: 10,
          cellPadding: 4,
          valign: 'middle'
        },
        headStyles: {
          fillColor: [41, 128, 185],
          valign: 'middle',
          textColor: 255
        },
        columnStyles: {
          7: { halign: 'right' }
        },
        margin: { left: 40, right: 40 }
      });

      const finalY = (doc as any).lastAutoTable.finalY;
      currentY = finalY + 30;
    }

    doc.save('Relatorio-Servidores.pdf');
  };

  // ======= Templates =======
  const servidorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return emp.nomeServidor;
    }
    return <span className="text-green-700 font-bold">VAGO</span>;
  };

  const valorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return `R$ ${emp.valorCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return '-';
  };

  const dataPublicacaoTemplate = (emp: Employee) => {
    return emp.dtPublicacao ? formatDateToBR(emp.dtPublicacao) : '-';
  };

  const acoesTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') {
      return (
        <div className="flex gap-2">
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
      <div>
        <button
          onClick={() => setEditingEmployee(emp)}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
        >
          Adicionar
        </button>
      </div>
    );
  };

  const rowClassName = (emp: Employee) => {
    return emp.status === 'Vago' ? 'bg-green-50' : '';
  };

  return (
    <div className="p-6">
      {/* Força table-layout: fixed, mas sem textAlign center global */}
      <style>
        {`
          .p-datatable-scrollable-header-table,
          .p-datatable-scrollable-body-table {
            table-layout: fixed !important;
          }
        `}
      </style>

      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Gerenciamento de Servidores
      </h1>

      {/* Mini-card do(s) órgão(s), só se houver linhas */}
      {orgDisplayText && filteredRows.length > 0 && (
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-md">
            <span className="font-bold text-lg">{orgDisplayText}</span>
          </div>
        </div>
      )}

      {/* Filtros principais */}
      <div className="flex flex-col md:flex-row flex-wrap items-start justify-center gap-4 mb-4">

        {/* MULTI-SELECT de Órgão */}
        <div className="relative" ref={orgRef}>
          <label className="font-medium block mb-1">Órgão:</label>
          <button
            type="button"
            className="p-2 border rounded-lg min-w-[200px] text-left bg-white flex items-center justify-between"
            onClick={() => setOrgDropdownOpen((prev) => !prev)}
          >
            <span>{getMultiSelectDisplayText(selectedOrgs)}</span>
            <span className="ml-2">▼</span>
          </button>
          {orgDropdownOpen && (
            <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-w-[250px]">
              <input
                type="text"
                className="p-2 border rounded w-full mb-2"
                placeholder="Pesquisar órgão..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
              />
              <div className="max-h-60 overflow-auto">
                {filteredOrgOptions.map((org) => {
                  const checked = selectedOrgs.includes(org.sigla);
                  return (
                    <label
                      key={org.sigla}
                      className="flex items-center space-x-2 mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrgs((prev) => [...prev, org.sigla]);
                          } else {
                            setSelectedOrgs((prev) =>
                              prev.filter((o) => o !== org.sigla)
                            );
                          }
                        }}
                      />
                      <span>{org.secretaria} ({org.sigla})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MULTI-SELECT de Cargo */}
        <div className="relative" ref={cargoRef}>
          <label className="font-medium block mb-1">Cargo:</label>
          <button
            type="button"
            className="p-2 border rounded-lg min-w-[200px] text-left bg-white flex items-center justify-between"
            onClick={() => setCargoDropdownOpen((prev) => !prev)}
          >
            <span>{getMultiSelectDisplayText(selectedCargos)}</span>
            <span className="ml-2">▼</span>
          </button>
          {cargoDropdownOpen && (
            <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-w-[250px]">
              <input
                type="text"
                className="p-2 border rounded w-full mb-2"
                placeholder="Pesquisar cargo..."
                value={cargoSearch}
                onChange={(e) => setCargoSearch(e.target.value)}
              />
              <div className="max-h-60 overflow-auto">
                {filteredCargoOptions.map((cargo) => {
                  const checked = selectedCargos.includes(cargo);
                  return (
                    <label
                      key={cargo}
                      className="flex items-center space-x-2 mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedCargos((prev) => [...prev, cargo]);
                          } else {
                            setSelectedCargos((prev) =>
                              prev.filter((c) => c !== cargo)
                            );
                          }
                        }}
                      />
                      <span>{cargo}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filtro de Status (simples) */}
        <div className="flex flex-col">
          <label className="font-medium mb-1">Status:</label>
          <select
            className="p-2 border rounded-lg bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="Provido">Provido</option>
            <option value="Vago">Vago</option>
          </select>
        </div>

        {/* MULTI-SELECT de Símbolo */}
        <div className="relative" ref={symbolRef}>
          <label className="font-medium block mb-1">Símbolo:</label>
          <button
            type="button"
            className="p-2 border rounded-lg min-w-[200px] text-left bg-white flex items-center justify-between"
            onClick={() => setSymbolDropdownOpen((prev) => !prev)}
          >
            <span>{getMultiSelectDisplayText(selectedSymbols)}</span>
            <span className="ml-2">▼</span>
          </button>
          {symbolDropdownOpen && (
            <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-w-[250px]">
              <input
                type="text"
                className="p-2 border rounded w-full mb-2"
                placeholder="Pesquisar símbolo..."
                value={symbolSearch}
                onChange={(e) => setSymbolSearch(e.target.value)}
              />
              <div className="max-h-60 overflow-auto">
                {filteredSymbolOptions.map((symbol) => {
                  const checked = selectedSymbols.includes(symbol);
                  return (
                    <label
                      key={symbol}
                      className="flex items-center space-x-2 mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedSymbols((prev) => [...prev, symbol]);
                          } else {
                            setSelectedSymbols((prev) =>
                              prev.filter((s) => s !== symbol)
                            );
                          }
                        }}
                      />
                      <span>{symbol}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botão PDF */}
        <div className="flex flex-col justify-end">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            title="Baixar PDF da tabela atual"
          >
            <FileText size={18} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Tabela com emptyMessage se não houver dados */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <DataTable
          value={filteredRows}
          dataKey="id"
          reorderableRows
          onRowReorder={handleRowReorder}
          scrollable
          tableStyle={{ minWidth: '900px', tableLayout: 'fixed' }}
          className="p-datatable-gridlines p-datatable-striped p-datatable-sm"
          rowClassName={rowClassName}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100, filteredRows.length]}
          emptyMessage="Nenhum dado encontrado. Selecione ao menos um órgão ou ajuste seus filtros."
        >
          {/* Alça de arraste */}
          <Column
            rowReorder
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '50px' }}
            body={(rowData, options) => (
              <i className="pi pi-bars cursor-move" style={{ fontSize: '1rem' }} />
            )}
          />
          {/* Índice # */}
          <Column
            header="#"
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '50px' }}
            body={(rowData, options) => options.rowIndex + 1}
          />
          {/* Cargo Genérico */}
          <Column
            field="cargo.cargo_efetivo"
            header="Cargo Genérico"
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '220px' }}
          />
          {/* Símbolo */}
          <Column
            field="cargo.simbolo"
            header="Símbolo"
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '100px' }}
          />
          {/* Nome Servidor */}
          <Column
            header="Nome Servidor"
            body={servidorTemplate}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '200px' }}
          />
          {/* Status */}
          <Column
            field="status"
            header="Status"
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '100px' }}
          />
          {/* Redistribuição */}
          <Column
            field="redistribuicao"
            header="Redistribuição"
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '120px' }}
          />
          {/* Publicação */}
          <Column
            header="Publicação"
            body={dataPublicacaoTemplate}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '120px' }}
          />
          {/* Valor C.C. */}
          <Column
            header="Valor C.C."
            body={valorTemplate}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '130px' }}
          />
          {/* Ações */}
          <Column
            header="Ações"
            body={acoesTemplate}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            style={{ width: '120px' }}
          />
        </DataTable>
      </div>

      {/* Botão Adicionar Novo */}
      <div className="text-center py-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          onClick={handleAddNew}
        >
          Adicionar Novo
        </button>
      </div>

      {/* MINI-CARDS de estatísticas */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4 flex-wrap">
        <div className="bg-blue-600 text-white rounded-md p-4 shadow-md">
          <p className="font-bold">Custo Providos</p>
          <p className="text-lg">
            R${' '}
            {totalProvido.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
          </p>
        </div>

        <div className="bg-green-600 text-white rounded-md p-4 shadow-md">
          <p className="font-bold">Custo Vagos</p>
          <p className="text-lg">
            R${' '}
            {totalVago.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
          </p>
        </div>

        <div className="bg-yellow-600 text-white rounded-md p-4 shadow-md">
          <p className="font-bold">Qtd. Providos</p>
          <p className="text-lg">{qtdProvidos}</p>
        </div>

        <div className="bg-red-600 text-white rounded-md p-4 shadow-md">
          <p className="font-bold">Qtd. Vagos</p>
          <p className="text-lg">{qtdVagos}</p>
        </div>

        <div className="bg-indigo-600 text-white rounded-md p-4 shadow-md">
          <p className="font-bold">Total Salarial</p>
          <p className="text-lg">
            R${' '}
            {totalGeral.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      {/* (Gráfico comentado) */}
      {/*
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">
          Distribuição de Cargos
        </h2>
        <div style={{ position: 'relative', height: '300px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
      */}

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
