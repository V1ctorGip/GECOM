/* src/components/Employees.tsx */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Edit2, Trash2, FileText } from 'lucide-react';
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
import autoTable from 'jspdf-autotable';
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

// Formata datas 'YYYY-MM-DD' → 'DD/MM/YYYY'
const formatDateToBR = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

// Função de transformação (código antigo)
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
  // Converte para número; se não for possível, ficará 0
  valorCC: Number(emp.salario) || 0,
  secretaria: emp.secretaria,
  ordem: emp.ordem || 0
});

type ModalMode = 'edit' | 'addVacant' | 'addNew';

// Decide o "modo" de edição, com base no Employee
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
  allEmployees: Employee[]; // Lista completa para checarmos duplicidade
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
};

function EditModal({
  employee,
  mode,
  organizations,
  positions,
  allEmployees,
  isOpen,
  onClose,
  onSave
}: EditModalProps) {
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });

  // Erros de validação
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Controle de modal de conflito (servidor duplicado)
  const [conflict, setConflict] = useState<{ name: string; org: string } | null>(null);

  // Dropdown customizado para Cargo/Símbolo + Input livre
  const [isCargoInput, setIsCargoInput] = useState(false);
  const [isSymbolInput, setIsSymbolInput] = useState(false);

  // Pesquisas
  const [cargoDropdownOpen, setCargoDropdownOpen] = useState(false);
  const [cargoSearch, setCargoSearch] = useState('');

  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');

  // Dropdown customizado para Redistribuição
  const [redisDropdownOpen, setRedisDropdownOpen] = useState(false);
  const [redisSearch, setRedisSearch] = useState('');
  const redisRef = useRef<HTMLDivElement>(null);

  // Refs para fechar dropdown
  const cargoRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef<HTMLDivElement>(null);

  // Reseta o estado local quando o employee muda
  useEffect(() => {
    setEditedEmployee({ ...employee });
    setIsCargoInput(false);
    setIsSymbolInput(false);
    setCargoDropdownOpen(false);
    setSymbolDropdownOpen(false);
    setErrors({});
    setCargoSearch('');
    setSymbolSearch('');
    setRedisSearch('');
    setRedisDropdownOpen(false);
    setConflict(null);
  }, [employee]);

  // Atualiza automaticamente o valorCC sempre que o cargo ou símbolo mudam
  useEffect(() => {
    if (editedEmployee.cargo.cargo_efetivo.trim() && editedEmployee.cargo.simbolo.trim()) {
      const match = positions.find((pos) =>
        pos.cargo_efetivo.trim().toLowerCase() === editedEmployee.cargo.cargo_efetivo.trim().toLowerCase() &&
        pos.simbolo.trim().toLowerCase() === editedEmployee.cargo.simbolo.trim().toLowerCase()
      );
      if (match) {
        setEditedEmployee((prev) => ({
          ...prev,
          valorCC: match.salario ?? prev.valorCC
        }));
      }
    }
  }, [editedEmployee.cargo.cargo_efetivo, editedEmployee.cargo.simbolo, positions]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cargoRef.current && !cargoRef.current.contains(event.target as Node)) {
        setCargoDropdownOpen(false);
      }
      if (symbolRef.current && !symbolRef.current.contains(event.target as Node)) {
        setSymbolDropdownOpen(false);
      }
      if (redisRef.current && !redisRef.current.contains(event.target as Node)) {
        setRedisDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  // -----------------------------
  // LÓGICA PARA CARGO ↔ SÍMBOLO
  // -----------------------------
  const relevantPositionsForCargo = useMemo(() => {
    if (editedEmployee.cargo.simbolo.trim()) {
      return positions.filter(
        (pos) =>
          pos.simbolo.toLowerCase() === editedEmployee.cargo.simbolo.trim().toLowerCase()
      );
    }
    return positions;
  }, [positions, editedEmployee.cargo.simbolo]);

  const dedupedCargos = useMemo(() => {
    const set = new Set(relevantPositionsForCargo.map((pos) => pos.cargo_efetivo));
    return Array.from(set).sort();
  }, [relevantPositionsForCargo]);

  const relevantPositionsForSymbol = useMemo(() => {
    if (editedEmployee.cargo.cargo_efetivo.trim()) {
      return positions.filter(
        (pos) =>
          pos.cargo_efetivo.toLowerCase() === editedEmployee.cargo.cargo_efetivo.trim().toLowerCase()
      );
    }
    return positions;
  }, [positions, editedEmployee.cargo.cargo_efetivo]);

  const dedupedSymbols = useMemo(() => {
    const set = new Set(relevantPositionsForSymbol.map((pos) => pos.simbolo));
    return Array.from(set).sort();
  }, [relevantPositionsForSymbol]);

  const filteredCargos = useMemo(() => {
    return dedupedCargos.filter((c) =>
      c.toLowerCase().includes(cargoSearch.toLowerCase())
    );
  }, [dedupedCargos, cargoSearch]);

  const filteredSymbols = useMemo(() => {
    return dedupedSymbols.filter((s) =>
      s.toLowerCase().includes(symbolSearch.toLowerCase())
    );
  }, [dedupedSymbols, symbolSearch]);

  const [orgsForRedis] = useState(() => {
    return organizations.map((o) => o.sigla).sort();
  });
  const filteredRedisOptions = useMemo(() => {
    return orgsForRedis.filter((sigla) =>
      sigla.toLowerCase().includes(redisSearch.toLowerCase())
    );
  }, [orgsForRedis, redisSearch]);

  // Handlers de mudança para Cargo e Símbolo
  const handleCargoChange = (newCargo: string) => {
    setEditedEmployee((prev) => {
      const matches = positions.filter(
        (pos) => pos.cargo_efetivo.toLowerCase() === newCargo.toLowerCase()
      );
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          ...prev,
          cargo: {
            ...prev.cargo,
            cargo_efetivo: newCargo,
            simbolo: firstMatch.simbolo
          },
          valorCC: firstMatch.salario ?? prev.valorCC
        };
      }
      return {
        ...prev,
        cargo: {
          ...prev.cargo,
          cargo_efetivo: newCargo,
          simbolo: ''
        }
      };
    });
  };

  // Adicionar este parse no símbolo
  const handleSymbolChange = (newSymbol: string) => {
    setEditedEmployee((prev) => {
      const match = positions.find(
        (pos) =>
          pos.cargo_efetivo.trim().toLowerCase() ===
          prev.cargo.cargo_efetivo.trim().toLowerCase() &&
          pos.simbolo.trim().toLowerCase() ===
          newSymbol.trim().toLowerCase()
      );
      if (match) {
        return {
          ...prev,
          cargo: {
            ...prev.cargo,
            simbolo: match.simbolo
          },
          // Converte 'match.salario' para número
          valorCC: Number(match.salario) ?? prev.valorCC
        };
      }
      return {
        ...prev,
        cargo: {
          ...prev.cargo,
          simbolo: newSymbol
        }
      };
    });
  };

  // Validação simples
  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editedEmployee.nomeServidor.trim()) {
      newErrors.nomeServidor = 'Preencha este campo';
    }
    if (!editedEmployee.cargo.cargo_efetivo.trim()) {
      newErrors.cargo = 'Preencha este campo';
    }
    if (!editedEmployee.cargo.simbolo.trim()) {
      newErrors.simbolo = 'Preencha este campo';
    }
    if (!editedEmployee.dtPublicacao.trim()) {
      newErrors.dtPublicacao = 'Preencha este campo';
    }
    if (Number(editedEmployee.valorCC) <= 0) {
      newErrors.valorCC = 'Preencha este campo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvar
  const handleSave = async () => {
    if (!validateFields()) return;

    const normalized = {
      ...editedEmployee,
      nomeServidor: editedEmployee.nomeServidor.toUpperCase()
    };

    // [ALTERAÇÃO #1] - Verificação global (removemos "e.secretaria === ...").
    const conflictEmp = allEmployees.find(
      (e) =>
        e.nomeServidor.trim().toLowerCase() === normalized.nomeServidor.trim().toLowerCase() &&
        e.id !== normalized.id
    );
    if (conflictEmp) {
      const orgObj = organizations.find((o) => o.sigla === conflictEmp.secretaria);
      const orgName = orgObj ? orgObj.secretaria : conflictEmp.secretaria;
      setConflict({ name: conflictEmp.nomeServidor, org: orgName });
      return;
    }

    if (mode === 'addNew') {
      normalized.status = 'Provido';

      const exists = positions.find(
        (pos) =>
          pos.cargo_efetivo.trim().toLowerCase() === normalized.cargo.cargo_efetivo.trim().toLowerCase() &&
          pos.simbolo.trim().toLowerCase() === normalized.cargo.simbolo.trim().toLowerCase()
      );
      if (!exists) {
        const maxNum = positions.length > 0 ? Math.max(...positions.map((p) => p.numero)) : 0;
        try {
          await createPosition({
            numero: maxNum + 1,
            cargo_efetivo: normalized.cargo.cargo_efetivo,
            simbolo: normalized.cargo.simbolo
          });
        } catch (error) {
          alert('Erro ao criar nova posição');
          return;
        }
      }
      alert('Servidor salvo com sucesso!');
      onSave(normalized);
      onClose();
    } else if (mode === 'addVacant') {
      normalized.status = 'Provido';
      alert('Servidor salvo com sucesso!');
      onSave(normalized);
      onClose();
    } else {
      alert('Servidor salvo com sucesso!');
      onSave(normalized);
      onClose();
    }
  };

  // Renderização do Modal
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl relative">
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
                className={`mt-1 block w-full rounded-md border p-2 focus:ring focus:ring-blue-500 ${
                  errors.nomeServidor ? 'border-red-500' : 'border-gray-300'
                }`}
                value={editedEmployee.nomeServidor.toUpperCase()}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    nomeServidor: e.target.value.toUpperCase()
                  })
                }
              />
              {errors.nomeServidor && (
                <p className="text-red-600 text-sm mt-1">{errors.nomeServidor}</p>
              )}
            </div>

            {/* Cargo Genérico */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Cargo Genérico</label>
              <div className="relative" ref={cargoRef}>
                {mode === 'addNew' ? (
                  <div className="flex items-center gap-2">
                    {!isCargoInput ? (
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCargoDropdownOpen((prev) => !prev);
                            setSymbolDropdownOpen(false);
                          }}
                          className={`p-2 border rounded-md w-full text-left bg-white flex items-center justify-between ${
                            errors.cargo ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <span>
                            {editedEmployee.cargo.cargo_efetivo || 'Selecione um cargo...'}
                          </span>
                          <span className="ml-2">▼</span>
                        </button>
                        {cargoDropdownOpen && (
                          <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-h-60 overflow-auto">
                            <input
                              type="text"
                              className="p-2 border rounded w-full mb-2"
                              placeholder="Pesquisar cargo..."
                              value={cargoSearch}
                              onChange={(e) => setCargoSearch(e.target.value)}
                            />
                            <div
                              className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                              onClick={() => {
                                setEditedEmployee((prev) => ({
                                  ...prev,
                                  cargo: { ...prev.cargo, cargo_efetivo: '', simbolo: '' }
                                }));
                                setCargoDropdownOpen(false);
                              }}
                            >
                              Desmarcar todos
                            </div>
                            {filteredCargos.map((c) => (
                              <div
                                key={c}
                                className="cursor-pointer p-1 hover:bg-gray-200"
                                onClick={() => {
                                  handleCargoChange(c);
                                  setCargoDropdownOpen(false);
                                }}
                              >
                                {c}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className={`flex-1 block w-full rounded-md p-2 focus:ring focus:ring-blue-500 ${
                          errors.cargo ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Digite o novo cargo..."
                        value={editedEmployee.cargo.cargo_efetivo}
                        onChange={(e) => handleCargoChange(e.target.value)}
                      />
                    )}
                    <button
                      type="button"
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      onClick={() => {
                        setIsCargoInput((prev) => !prev);
                        setCargoDropdownOpen(false);
                      }}
                    >
                      {isCargoInput ? '↩' : '+'}
                    </button>
                  </div>
                ) : mode === 'addVacant' ? (
                  <input
                    type="text"
                    className={`p-2 border rounded-md w-full bg-gray-100 ${
                      errors.cargo ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={editedEmployee.cargo.cargo_efetivo}
                    disabled
                  />
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCargoDropdownOpen((prev) => !prev);
                        setSymbolDropdownOpen(false);
                      }}
                      className={`p-2 border rounded-md w-full text-left bg-white flex items-center justify-between ${
                        errors.cargo ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <span>
                        {editedEmployee.cargo.cargo_efetivo || 'Selecione um cargo...'}
                      </span>
                      <span className="ml-2">▼</span>
                    </button>
                    {cargoDropdownOpen && (
                      <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-h-60 overflow-auto">
                        <input
                          type="text"
                          className="p-2 border rounded w-full mb-2"
                          placeholder="Pesquisar cargo..."
                          value={cargoSearch}
                          onChange={(e) => setCargoSearch(e.target.value)}
                        />
                        <div
                          className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                          onClick={() => {
                            setEditedEmployee((prev) => ({
                              ...prev,
                              cargo: { ...prev.cargo, cargo_efetivo: '', simbolo: '' }
                            }));
                            setCargoDropdownOpen(false);
                          }}
                        >
                          Desmarcar todos
                        </div>
                        {filteredCargos.map((c) => (
                          <div
                            key={c}
                            className="cursor-pointer p-1 hover:bg-gray-200"
                            onClick={() => {
                              handleCargoChange(c);
                              setCargoDropdownOpen(false);
                            }}
                          >
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.cargo && (
                <p className="text-red-600 text-sm mt-1">{errors.cargo}</p>
              )}
            </div>

            {/* Símbolo */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Símbolo</label>
              <div className="relative" ref={symbolRef}>
                {mode === 'addNew' ? (
                  <div className="flex items-center gap-2">
                    {!isSymbolInput ? (
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSymbolDropdownOpen((prev) => !prev);
                            setCargoDropdownOpen(false);
                          }}
                          className={`p-2 border rounded-md w-full text-left bg-white flex items-center justify-between ${
                            errors.simbolo ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <span>
                            {editedEmployee.cargo.simbolo || 'Selecione um símbolo...'}
                          </span>
                          <span className="ml-2">▼</span>
                        </button>
                        {symbolDropdownOpen && (
                          <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-h-60 overflow-auto">
                            <input
                              type="text"
                              className="p-2 border rounded w-full mb-2"
                              placeholder="Pesquisar símbolo..."
                              value={symbolSearch}
                              onChange={(e) => setSymbolSearch(e.target.value)}
                            />
                            <div
                              className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                              onClick={() => {
                                setEditedEmployee((prev) => ({
                                  ...prev,
                                  cargo: { ...prev.cargo, simbolo: '' }
                                }));
                                setSymbolDropdownOpen(false);
                              }}
                            >
                              Desmarcar todos
                            </div>
                            {filteredSymbols.map((s) => (
                              <div
                                key={s}
                                className="cursor-pointer p-1 hover:bg-gray-200"
                                onClick={() => {
                                  handleSymbolChange(s);
                                  setSymbolDropdownOpen(false);
                                }}
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className={`flex-1 block w-full rounded-md p-2 focus:ring focus:ring-blue-500 ${
                          errors.simbolo ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Digite o novo símbolo..."
                        value={editedEmployee.cargo.simbolo}
                        onChange={(e) => handleSymbolChange(e.target.value)}
                      />
                    )}
                    <button
                      type="button"
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      onClick={() => {
                        setIsSymbolInput((prev) => !prev);
                        setSymbolDropdownOpen(false);
                      }}
                    >
                      {isSymbolInput ? '↩' : '+'}
                    </button>
                  </div>
                ) : mode === 'addVacant' ? (
                  <input
                    type="text"
                    className={`p-2 border rounded-md w-full bg-gray-100 ${
                      errors.simbolo ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={editedEmployee.cargo.simbolo}
                    disabled
                  />
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setSymbolDropdownOpen((prev) => !prev);
                        setCargoDropdownOpen(false);
                      }}
                      className={`p-2 border rounded-md w-full text-left bg-white flex items-center justify-between ${
                        errors.simbolo ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <span>
                        {editedEmployee.cargo.simbolo || 'Selecione um símbolo...'}
                      </span>
                      <span className="ml-2">▼</span>
                    </button>
                    {symbolDropdownOpen && (
                      <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-h-60 overflow-auto">
                        <input
                          type="text"
                          className="p-2 border rounded w-full mb-2"
                          placeholder="Pesquisar símbolo..."
                          value={symbolSearch}
                          onChange={(e) => setSymbolSearch(e.target.value)}
                        />
                        <div
                          className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                          onClick={() => {
                            setEditedEmployee((prev) => ({
                              ...prev,
                              cargo: { ...prev.cargo, simbolo: '' }
                            }));
                            setSymbolDropdownOpen(false);
                          }}
                        >
                          Desmarcar todos
                        </div>
                        {filteredSymbols.map((s) => (
                          <div
                            key={s}
                            className="cursor-pointer p-1 hover:bg-gray-200"
                            onClick={() => {
                              handleSymbolChange(s);
                              setSymbolDropdownOpen(false);
                            }}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.simbolo && (
                <p className="text-red-600 text-sm mt-1">{errors.simbolo}</p>
              )}
            </div>

            {/* Redistribuição */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Redistribuição</label>
              <div className="relative" ref={redisRef}>
                <button
                  type="button"
                  onClick={() => setRedisDropdownOpen((prev) => !prev)}
                  className="mt-1 p-2 border rounded-md w-full text-left bg-white flex items-center justify-between border-gray-300 focus:ring focus:ring-blue-500"
                >
                  <span>{editedEmployee.redistribuicao || 'Nenhuma'}</span>
                  <span className="ml-2">▼</span>
                </button>
                {redisDropdownOpen && (
                  <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-h-60 overflow-auto">
                    <input
                      type="text"
                      className="p-2 border rounded w-full mb-2"
                      placeholder="Pesquisar redistribuição..."
                      value={redisSearch}
                      onChange={(e) => setRedisSearch(e.target.value)}
                    />
                    <div
                      className="cursor-pointer p-1 hover:bg-gray-200"
                      onClick={() => {
                        setEditedEmployee({ ...editedEmployee, redistribuicao: '' });
                        setRedisDropdownOpen(false);
                      }}
                    >
                      Nenhuma
                    </div>
                    {filteredRedisOptions.map((sigla) => (
                      <div
                        key={sigla}
                        className="cursor-pointer p-1 hover:bg-gray-200"
                        onClick={() => {
                          setEditedEmployee({ ...editedEmployee, redistribuicao: sigla });
                          setRedisDropdownOpen(false);
                        }}
                      >
                        {sigla}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Data de Publicação */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Data de Publicação</label>
              <input
                type="date"
                className={`mt-1 block w-full rounded-md p-2 focus:ring focus:ring-blue-500 ${
                  errors.dtPublicacao ? 'border-red-500' : 'border-gray-300 border'
                }`}
                value={editedEmployee.dtPublicacao}
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    dtPublicacao: e.target.value
                  })
                }
              />
              {errors.dtPublicacao && (
                <p className="text-red-600 text-sm mt-1">{errors.dtPublicacao}</p>
              )}
            </div>

            {/* Valor C.C. */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor C.C.</label>
              <input
                type="number"
                className={`mt-1 block w-full rounded-md p-2 ${
                  errors.valorCC ? 'border-red-500' : 'border-gray-300 border'
                }`}
                value={
                  typeof editedEmployee.valorCC === 'string'
                    ? Number(editedEmployee.valorCC)
                    : editedEmployee.valorCC
                }
                onChange={(e) =>
                  setEditedEmployee({
                    ...editedEmployee,
                    valorCC: Number(e.target.value)
                  })
                }
                disabled={mode === 'addVacant'}
              />

              {errors.valorCC && (
                <p className="text-red-600 text-sm mt-1">{errors.valorCC}</p>
              )}
            </div>

            {/* Status */}
            {mode === 'edit' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 block w-full rounded-md border p-2 shadow-sm focus:ring focus:ring-blue-500 border-gray-300"
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
                    className="mt-1 block w-full rounded-md border p-2 shadow-sm focus:ring focus:ring-blue-500 border-gray-300"
                    value={editedEmployee.status}
                    onChange={(e) =>
                      setEditedEmployee({
                        ...editedEmployee,
                        status: 'Provido'
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

      {/* Modal de conflito (Servidor duplicado) */}
      {conflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p className="text-red-600 text-lg font-semibold">
              Servidor já nomeado - Nome: {conflict.name} em {conflict.org}
            </p>
            <div className="mt-4 text-right">
              <button
                onClick={() => setConflict(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Employees() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);

  // ======= Filtros =======
  const [orgSearch, setOrgSearch] = useState('');
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  const [cargoSearch, setCargoSearch] = useState('');
  const [cargoDropdownOpen, setCargoDropdownOpen] = useState(false);
  const [selectedCargos, setSelectedCargos] = useState<string[]>([]);

  const [symbolSearch, setSymbolSearch] = useState('');
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);

  const [statusFilter, setStatusFilter] = useState('');

  // ---- NOVO FILTRO (NOME SERVIDOR) ----
  const [serverSearch, setServerSearch] = useState('');
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const serverRef = useRef<HTMLDivElement>(null);
  // -------------------------------------

  // Modal
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Refs para fechar dropdown
  const orgRef = useRef<HTMLDivElement>(null);
  const cargoRef2 = useRef<HTMLDivElement>(null);
  const symbolRef2 = useRef<HTMLDivElement>(null);

  // Carrega dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Carrega preferências
  useEffect(() => {
    const storedOrgs = localStorage.getItem('selectedOrgs');
    const storedCargos = localStorage.getItem('selectedCargos');
    const storedSymbols = localStorage.getItem('selectedSymbols');
    const storedStatus = localStorage.getItem('statusFilter');
    const storedServers = localStorage.getItem('selectedServers');

    if (storedOrgs) setSelectedOrgs(JSON.parse(storedOrgs));
    if (storedCargos) setSelectedCargos(JSON.parse(storedCargos));
    if (storedSymbols) setSelectedSymbols(JSON.parse(storedSymbols));
    if (storedStatus) setStatusFilter(storedStatus);
    if (storedServers) setSelectedServers(JSON.parse(storedServers));
  }, []);

  // Se não tiver órgão selecionado, limpa
  useEffect(() => {
    if (selectedOrgs.length === 0) {
      setSelectedCargos([]);
      setSelectedSymbols([]);
      setStatusFilter('');
      setSelectedServers([]);
    }
  }, [selectedOrgs]);

  const handleSavePreferences = () => {
    localStorage.setItem('selectedOrgs', JSON.stringify(selectedOrgs));
    localStorage.setItem('selectedCargos', JSON.stringify(selectedCargos));
    localStorage.setItem('selectedSymbols', JSON.stringify(selectedSymbols));
    localStorage.setItem('statusFilter', statusFilter);
    localStorage.setItem('selectedServers', JSON.stringify(selectedServers));
    alert('Preferências salvas com sucesso!');
  };

  // Busca do backend
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

      emps.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
      setEmployeesData(emps);
    } catch (error) {
      console.error('Erro ao carregar os dados', error);
    }
  };

  // Fecha dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (cargoRef2.current && !cargoRef2.current.contains(event.target as Node)) {
        setCargoDropdownOpen(false);
      }
      if (symbolRef2.current && !symbolRef2.current.contains(event.target as Node)) {
        setSymbolDropdownOpen(false);
      }
      if (serverRef.current && !serverRef.current.contains(event.target as Node)) {
        setServerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const availableOrganizations = useMemo(() => {
    return organizations.filter((org) =>
      employeesData.some((emp) => emp.secretaria === org.sigla)
    );
  }, [organizations, employeesData]);

  const filteredOrgOptions = useMemo(() => {
    return availableOrganizations.filter((org) => {
      const txt = `${org.sigla} ${org.secretaria}`.toLowerCase();
      return txt.includes(orgSearch.toLowerCase());
    });
  }, [availableOrganizations, orgSearch]);

  const allRowsFromSelectedOrgs = useMemo(() => {
    if (selectedOrgs.length === 0) return [];
    return employeesData.filter((emp) => selectedOrgs.includes(emp.secretaria));
  }, [employeesData, selectedOrgs]);

  const cargoOptions = useMemo(() => {
    const setCargos = new Set(allRowsFromSelectedOrgs.map((emp) => emp.cargo.cargo_efetivo));
    return Array.from(setCargos).sort();
  }, [allRowsFromSelectedOrgs]);

  const symbolOptions = useMemo(() => {
    const setSyms = new Set(allRowsFromSelectedOrgs.map((emp) => emp.cargo.simbolo));
    return Array.from(setSyms).sort();
  }, [allRowsFromSelectedOrgs]);

  const serverOptions = useMemo(() => {
    if (selectedOrgs.length === 0) return [];
    const setServers = new Set(allRowsFromSelectedOrgs.map((emp) => emp.nomeServidor));
    return Array.from(setServers).sort();
  }, [allRowsFromSelectedOrgs, selectedOrgs]);

  const filteredCargoOptions = useMemo(() => {
    return cargoOptions.filter((c) => c.toLowerCase().includes(cargoSearch.toLowerCase()));
  }, [cargoOptions, cargoSearch]);

  const filteredSymbolOptions = useMemo(() => {
    return symbolOptions.filter((s) => s.toLowerCase().includes(symbolSearch.toLowerCase()));
  }, [symbolOptions, symbolSearch]);

  const filteredServerOptions = useMemo(() => {
    return serverOptions.filter((name) =>
      name.toLowerCase().includes(serverSearch.toLowerCase())
    );
  }, [serverOptions, serverSearch]);

  function getMultiSelectDisplayText(list: string[]): string {
    if (list.length === 0) return 'Nenhum';
    if (list.length <= 2) return list.join(', ');
    return list.slice(0, 2).join(', ') + '...';
  }

  const filteredRows = useMemo(() => {
    if (selectedOrgs.length === 0) return [];

    return employeesData.filter((emp) => {
      if (!emp.cargo.cargo_efetivo || !emp.cargo.simbolo) return false;
      if (!selectedOrgs.includes(emp.secretaria)) return false;
      if (selectedCargos.length > 0 && !selectedCargos.includes(emp.cargo.cargo_efetivo)) {
        return false;
      }
      if (selectedSymbols.length > 0 && !selectedSymbols.includes(emp.cargo.simbolo)) {
        return false;
      }
      if (selectedServers.length > 0 && !selectedServers.includes(emp.nomeServidor)) {
        return false;
      }
      if (statusFilter && emp.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [employeesData, selectedOrgs, selectedCargos, selectedSymbols, selectedServers, statusFilter]);

  const totalProvido = useMemo(() => {
    return filteredRows
      .filter((e) => e.status === 'Provido')
      .reduce((sum, e) => sum + Number(e.valorCC), 0);
  }, [filteredRows]);

  const totalVago = useMemo(() => {
    return filteredRows
      .filter((e) => e.status === 'Vago')
      .reduce((sum, e) => sum + Number(e.valorCC), 0);
  }, [filteredRows]);

  const totalGeral = totalProvido + totalVago;

  const qtdProvidos = useMemo(() => {
    return filteredRows.filter((e) => e.status === 'Provido').length;
  }, [filteredRows]);

  const qtdVagos = useMemo(() => {
    return filteredRows.filter((e) => e.status === 'Vago').length;
  }, [filteredRows]);

  const orgsInFilteredData = useMemo(() => {
    const siglas = new Set(filteredRows.map((e) => e.secretaria));
    return organizations.filter((org) => siglas.has(org.sigla));
  }, [filteredRows, organizations]);

  const orgDisplayText = useMemo(() => {
    if (orgsInFilteredData.length === 0) return '';
    if (orgsInFilteredData.length === 1) {
      const o = orgsInFilteredData[0];
      return `${o.secretaria} (${o.sigla})`;
    }
    return orgsInFilteredData.map((o) => o.sigla).join(', ');
  }, [orgsInFilteredData]);

  const handleSaveEmployee = async (emp: Employee) => {
    if (emp.id === 'new') {
      try {
        await createEmployee(emp);
        await loadData();
      } catch (error) {
        console.error('Erro ao criar funcionário', error);
      }
    } else {
      try {
        await updateEmployee(emp);
        await loadData();
      } catch (error) {
        console.error('Erro ao atualizar funcionário', error);
      }
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (window.confirm('Tem certeza que deseja excluir este servidor?')) {
      try {
        await deleteEmployee(emp.id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir funcionário', error);
      }
    }
  };

  const handleAddNew = () => {
    const defOrg = selectedOrgs.length > 0 ? selectedOrgs[0] : '';
    const newEmp: Employee = {
      id: 'new',
      nomeServidor: '',
      cargo: {
        id: '',
        cargo_efetivo: '',
        numero: 0,
        simbolo: '',
        secretaria: defOrg
      },
      status: 'Vago',
      redistribuicao: '',
      dtPublicacao: '',
      valorCC: 0,
      secretaria: defOrg,
      ordem: employeesData.length + 1
    };
    setEditingEmployee(newEmp);
  };

  const handleRowReorder = async (e: RowReorderEvent) => {
    const reordered = e.value;
    reordered.forEach((emp, i) => {
      emp.ordem = i + 1;
    });
    setEmployeesData((prev) => {
      const arr = [...prev];
      for (const row of reordered) {
        const idx = arr.findIndex((x) => x.id === row.id);
        if (idx !== -1) arr[idx] = row;
      }
      return arr;
    });
    try {
      await updateEmployeePositions(reordered);
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar posições no backend:', error);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(12);

    const sorted = [...filteredRows].sort((a, b) => a.ordem - b.ordem);

    const grouped: Record<string, Employee[]> = {};
    for (const emp of sorted) {
      if (!grouped[emp.secretaria]) grouped[emp.secretaria] = [];
      grouped[emp.secretaria].push(emp);
    }

    const siglas = Object.keys(grouped).sort();
    let currentY = 40;

    for (const sig of siglas) {
      const org = organizations.find((o) => o.sigla === sig);
      let title = sig;
      if (org) title = `${org.secretaria} (${org.sigla})`;

      doc.text(`Relatório de Servidores - ${title}`, 40, currentY);

      const orgRows = grouped[sig].map((emp, i) => ({
        numero: i + 1,
        cargo: emp.cargo.cargo_efetivo,
        simbolo: emp.cargo.simbolo,
        servidor: emp.status === 'Provido' ? emp.nomeServidor : 'Vago',
        status: emp.status,
        redistribuicao: emp.redistribuicao || '',
        publicacao: emp.dtPublicacao ? formatDateToBR(emp.dtPublicacao) : '-',
        valorCC: `R$ ${Number(emp.valorCC).toLocaleString('pt-BR', {
          minimumFractionDigits: 2
        })}`
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
        head: [columns.map((c) => c.header)],
        body: orgRows.map((r) => columns.map((c) => r[c.dataKey])),
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

  const valorTemplate = (emp: Employee) => {
    return `R$ ${Number(emp.valorCC).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const servidorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') return emp.nomeServidor;
    return <span className="text-green-700 font-bold">VAGO</span>;
  };

  // Ajustando para manter como estava (provavelmente era dtPublicacao):
  const dataPublicacaoFixed = (emp: Employee) => {
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
      <button
        onClick={() => setEditingEmployee(emp)}
        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
      >
        Adicionar
      </button>
    );
  };

  const rowClassName = (emp: Employee) => {
    return emp.status === 'Vago' ? 'bg-green-50' : '';
  };

  return (
    <div className="p-6">
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

      {orgDisplayText && filteredRows.length > 0 && (
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-md">
            <span className="font-bold text-lg">{orgDisplayText}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-wrap items-start justify-center gap-4 mb-4">
        {/* MULTI-SELECT de Órgão */}
        <div className="relative" ref={orgRef}>
          <label className="font-medium block mb-1">Órgão:</label>
          <button
            type="button"
            className="p-2 border rounded-lg min-w-[500px] text-left bg-white flex items-center justify-between"
            onClick={() => setOrgDropdownOpen((prev) => !prev)}
          >
            <span>{getMultiSelectDisplayText(selectedOrgs)}</span>
            <span className="ml-2">▼</span>
          </button>
          {orgDropdownOpen && (
            <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-w-[600px]">
              <input
                type="text"
                className="p-2 border rounded w-full mb-2"
                placeholder="Pesquisar órgão..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
              />

              {/* [ALTERAÇÃO #2] - Botão "Selecionar todos" acima de "Desmarcar todos" */}
              <div
                className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                onClick={() => {
                  setSelectedOrgs(filteredOrgOptions.map((org) => org.sigla));
                  setOrgDropdownOpen(false);
                }}
              >
                Selecionar todos
              </div>

              <div
                className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                onClick={() => {
                  setSelectedOrgs([]);
                  setOrgDropdownOpen(false);
                }}
              >
                Desmarcar todos
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredOrgOptions.map((org) => {
                  const checked = selectedOrgs.includes(org.sigla);
                  return (
                    <label key={org.sigla} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedOrgs((prev) => [...prev, org.sigla]);
                          } else {
                            setSelectedOrgs((prev) => prev.filter((o) => o !== org.sigla));
                          }
                        }}
                      />
                      <span>
                        {org.secretaria} ({org.sigla})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MULTI-SELECT de Servidor */}
        <div className="relative" ref={serverRef}>
          <label className="font-medium block mb-1">Servidor:</label>
          <button
            type="button"
            className="p-2 border rounded-lg min-w-[500px] text-left bg-white flex items-center justify-between"
            onClick={() => setServerDropdownOpen((prev) => !prev)}
          >
            <span>{getMultiSelectDisplayText(selectedServers)}</span>
            <span className="ml-2">▼</span>
          </button>
          {serverDropdownOpen && (
            <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-w-[600px]">
              <input
                type="text"
                className="p-2 border rounded w-full mb-2"
                placeholder="Pesquisar servidor..."
                value={serverSearch}
                onChange={(e) => setServerSearch(e.target.value)}
              />
              <div
                className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                onClick={() => {
                  setSelectedServers([]);
                  setServerDropdownOpen(false);
                }}
              >
                Desmarcar todos
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredServerOptions.map((name) => {
                  const checked = selectedServers.includes(name);
                  return (
                    <label key={name} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedServers((prev) => [...prev, name]);
                          } else {
                            setSelectedServers((prev) => prev.filter((x) => x !== name));
                          }
                        }}
                      />
                      <span>{name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MULTI-SELECT de Cargo */}
        <div className="relative" ref={cargoRef2}>
          <label className="font-medium block mb-1">Cargo:</label>
          <button
            type="button"
            className="p-2 border rounded-lg min-w-[500px] text-left bg-white flex items-center justify-between"
            onClick={() => setCargoDropdownOpen((prev) => !prev)}
          >
            <span>{getMultiSelectDisplayText(selectedCargos)}</span>
            <span className="ml-2">▼</span>
          </button>
          {cargoDropdownOpen && (
            <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-w-[600px]">
              <input
                type="text"
                className="p-2 border rounded w-full mb-2"
                placeholder="Pesquisar cargo..."
                value={cargoSearch}
                onChange={(e) => setCargoSearch(e.target.value)}
              />
              <div
                className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                onClick={() => {
                  setSelectedCargos([]);
                  setCargoDropdownOpen(false);
                }}
              >
                Desmarcar todos
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredCargoOptions.map((c) => {
                  const checked = selectedCargos.includes(c);
                  return (
                    <label key={c} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedCargos((prev) => [...prev, c]);
                          } else {
                            setSelectedCargos((prev) => prev.filter((x) => x !== c));
                          }
                        }}
                      />
                      <span>{c}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status */}
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
        <div className="relative" ref={symbolRef2}>
          <label className="font-medium block mb-1">Símbolo:</label>
          <button
            type="button"
            className="p-2 border rounded-lg min-w-[500px] text-left bg-white flex items-center justify-between"
            onClick={() => setSymbolDropdownOpen((prev) => !prev)}
          >
            <span>{getMultiSelectDisplayText(selectedSymbols)}</span>
            <span className="ml-2">▼</span>
          </button>
          {symbolDropdownOpen && (
            <div className="absolute z-10 bg-white border shadow-md p-2 mt-1 w-full max-w-[600px]">
              <input
                type="text"
                className="p-2 border rounded w-full mb-2"
                placeholder="Pesquisar símbolo..."
                value={symbolSearch}
                onChange={(e) => setSymbolSearch(e.target.value)}
              />
              <div
                className="cursor-pointer p-1 bg-gray-200 text-gray-800 font-semibold mb-2"
                onClick={() => {
                  setSelectedSymbols([]);
                  setSymbolDropdownOpen(false);
                }}
              >
                Desmarcar todos
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredSymbolOptions.map((s) => {
                  const checked = selectedSymbols.includes(s);
                  return (
                    <label key={s} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedSymbols((prev) => [...prev, s]);
                          } else {
                            setSelectedSymbols((prev) => prev.filter((x) => x !== s));
                          }
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botões PDF / Preferências */}
        <div className="flex flex-col justify-end space-y-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            <FileText size={18} />
            <span>PDF</span>
          </button>
          <button
            onClick={handleSavePreferences}
            className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            <span>Salvar Preferências</span>
          </button>
        </div>
      </div>

      {/* Tabela */}
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
          <Column
            rowReorder
            style={{ width: '50px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            body={(rowData, options) => (
              <i className="pi pi-bars cursor-move" style={{ fontSize: '1rem' }} />
            )}
          />
          <Column
            header="#"
            style={{ width: '50px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            body={(rowData, options) => options.rowIndex + 1}
          />
          <Column
            field="cargo.cargo_efetivo"
            header="Cargo Genérico"
            style={{ width: '220px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
          />
          <Column
            field="cargo.simbolo"
            header="Símbolo"
            style={{ width: '100px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
          />
          <Column
            header="Nome Servidor"
            style={{ width: '200px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            body={servidorTemplate}
          />
          <Column
            field="status"
            header="Status"
            style={{ width: '100px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
          />
          <Column
            field="redistribuicao"
            header="Redistribuição"
            style={{ width: '120px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
          />
          <Column
            header="Publicação"
            style={{ width: '120px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            body={dataPublicacaoFixed}
          />
          <Column
            header="Valor C.C."
            style={{ width: '130px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            body={valorTemplate}
          />
          <Column
            header="Ações"
            style={{ width: '120px' }}
            headerStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            bodyStyle={{ verticalAlign: 'middle', textAlign: 'left' }}
            body={acoesTemplate}
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

      {/* MINI-CARDS */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4 flex-wrap">
        <div className="bg-blue-600 text-white rounded-md px-4 py-2 shadow-md">
          <p className="font-bold text-lg">
            Custo Providos: R${' '}
            {totalProvido.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
          </p>
        </div>
        <div className="bg-green-600 text-white rounded-md px-4 py-2 shadow-md">
          <p className="font-bold text-lg">
            Custo Vagos: R${' '}
            {totalVago.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
          </p>
        </div>
        <div className="bg-yellow-600 text-white rounded-md px-4 py-2 shadow-md">
          <p className="font-bold text-lg">Qtd. Providos: {qtdProvidos}</p>
        </div>
        <div className="bg-red-600 text-white rounded-md px-4 py-2 shadow-md">
          <p className="font-bold text-lg">Qtd. Vagos: {qtdVagos}</p>
        </div>
        <div className="bg-indigo-600 text-white rounded-md px-4 py-2 shadow-md">
          <p className="font-bold text-lg">
            Total Salarial: R${' '}
            {totalGeral.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      {/* Modal (Edição/Adição) */}
      {editingEmployee && (
        <EditModal
          employee={editingEmployee}
          mode={getMode(editingEmployee)}
          organizations={organizations}
          positions={positions}
          allEmployees={employeesData}
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  );
}
