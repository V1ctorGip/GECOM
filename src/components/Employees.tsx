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

  // Erros de validação
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Ao mudar employee externamente, resetar o estado local
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
  }, [employee]);

  // Fechar dropdown ao clicar fora
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

  // Filtra "positions" considerando o símbolo escolhido (para exibir cargos)
  const relevantPositionsForCargo = useMemo(() => {
    // Se já tiver um símbolo selecionado, só mostra cargos compatíveis com aquele símbolo
    if (editedEmployee.cargo.simbolo.trim()) {
      return positions.filter(
        (pos) =>
          pos.simbolo.toLowerCase() ===
          editedEmployee.cargo.simbolo.trim().toLowerCase()
      );
    }
    // Caso não tenha símbolo selecionado, exibe todos os cargos possíveis
    return positions;
  }, [positions, editedEmployee.cargo.simbolo]);

  // Deduplica cargos relevantes
  const dedupedCargos = useMemo(() => {
    const set = new Set(relevantPositionsForCargo.map((pos) => pos.cargo_efetivo));
    return Array.from(set).sort();
  }, [relevantPositionsForCargo]);

  // Filtra "positions" considerando o cargo escolhido (para exibir símbolos)
  const relevantPositionsForSymbol = useMemo(() => {
    // Se já tiver um cargo selecionado, só mostra símbolos compatíveis com aquele cargo
    if (editedEmployee.cargo.cargo_efetivo.trim()) {
      return positions.filter(
        (pos) =>
          pos.cargo_efetivo.toLowerCase() ===
          editedEmployee.cargo.cargo_efetivo.trim().toLowerCase()
      );
    }
    // Caso não tenha cargo selecionado, exibe todos os símbolos possíveis
    return positions;
  }, [positions, editedEmployee.cargo.cargo_efetivo]);

  // Deduplica símbolos relevantes
  const dedupedSymbols = useMemo(() => {
    const set = new Set(relevantPositionsForSymbol.map((pos) => pos.simbolo));
    return Array.from(set).sort();
  }, [relevantPositionsForSymbol]);

  // Agora aplicamos o filtro de texto (search) em cada lista
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

  // Opções de redistribuição (todas as siglas)
  const [orgsForRedis] = useState(() => {
    return organizations.map((o) => o.sigla).sort();
  });
  const filteredRedisOptions = useMemo(() => {
    return orgsForRedis.filter((sigla) =>
      sigla.toLowerCase().includes(redisSearch.toLowerCase())
    );
  }, [orgsForRedis, redisSearch]);

  // ------------------------------------
  // Handlers de mudança (Cargo/Símbolo)
  // ------------------------------------

  // Ao selecionar Cargo
  const handleCargoChange = (newCargo: string) => {
    setEditedEmployee((prev) => {
      // Filtra todas as positions que tenham esse cargo
      const matches = positions.filter(
        (pos) => pos.cargo_efetivo.toLowerCase() === newCargo.toLowerCase()
      );

      // Se encontrar ao menos uma, pegamos a primeira para preencher valorCC e símbolo
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

      // Se não encontrar nada, apenas atualiza o cargo e zera o símbolo
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

  // Ao selecionar Símbolo
  const handleSymbolChange = (newSymbol: string) => {
    setEditedEmployee((prev) => {
      // Filtra positions que combinem com cargo e símbolo
      const match = positions.find(
        (pos) =>
          pos.cargo_efetivo.toLowerCase() ===
            prev.cargo.cargo_efetivo.trim().toLowerCase() &&
          pos.simbolo.toLowerCase() === newSymbol.toLowerCase()
      );
      if (match) {
        return {
          ...prev,
          cargo: {
            ...prev.cargo,
            simbolo: match.simbolo
          },
          valorCC: match.salario ?? prev.valorCC
        };
      }
      // Se não encontrou, apenas atualiza o símbolo
      return {
        ...prev,
        cargo: {
          ...prev.cargo,
          simbolo: newSymbol
        }
      };
    });
  };

  // ----------------
  // Validação simples
  // ----------------
  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Nome Servidor
    if (!editedEmployee.nomeServidor.trim()) {
      newErrors.nomeServidor = 'Preencha este campo';
    }

    // Cargo
    if (!editedEmployee.cargo.cargo_efetivo.trim()) {
      newErrors.cargo = 'Preencha este campo';
    }

    // Símbolo
    if (!editedEmployee.cargo.simbolo.trim()) {
      newErrors.simbolo = 'Preencha este campo';
    }

    // Data Publicação
    if (!editedEmployee.dtPublicacao.trim()) {
      newErrors.dtPublicacao = 'Preencha este campo';
    }

    // Valor C.C.
    if (editedEmployee.valorCC <= 0) {
      newErrors.valorCC = 'Preencha este campo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ----------------
  // Salvar
  // ----------------
  const handleSave = async () => {
    if (!validateFields()) return;

    const normalized = {
      ...editedEmployee,
      nomeServidor: editedEmployee.nomeServidor.toUpperCase()
    };

    if (mode === 'addNew') {
      // Força status = Provido
      normalized.status = 'Provido';

      // Se cargo+simbolo não existe, cria no backend
      const exists = positions.find(
        (pos) =>
          pos.cargo_efetivo.trim().toLowerCase() ===
            normalized.cargo.cargo_efetivo.trim().toLowerCase() &&
          pos.simbolo.trim().toLowerCase() ===
            normalized.cargo.simbolo.trim().toLowerCase()
      );
      if (!exists) {
        const maxNum =
          positions.length > 0 ? Math.max(...positions.map((p) => p.numero)) : 0;
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
      // Vinha com status=Vago, agora vira Provido
      normalized.status = 'Provido';
      alert('Servidor salvo com sucesso!');
      onSave(normalized);
      onClose();
    } else {
      // Edit
      alert('Servidor salvo com sucesso!');
      onSave(normalized);
      onClose();
    }
  };

  // ---------------------------------
  // Renderização do Modal
  // ---------------------------------
  return (
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
                // Modo "Adicionar Novo" => tem "+"
                <div className="flex items-center gap-2">
                  {!isCargoInput ? (
                    // Dropdown
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
                    // Input livre
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
                // Modo "Adicionar Servidor" numa vaga -> campo bloqueado
                <input
                  type="text"
                  className={`p-2 border rounded-md w-full bg-gray-100 ${
                    errors.cargo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={editedEmployee.cargo.cargo_efetivo}
                  disabled
                />
              ) : (
                // Modo "Edit"
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
                    // Dropdown
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
                    // Input livre
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
                // Campo bloqueado para "Adicionar Servidor" numa vaga
                <input
                  type="text"
                  className={`p-2 border rounded-md w-full bg-gray-100 ${
                    errors.simbolo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={editedEmployee.cargo.simbolo}
                  disabled
                />
              ) : (
                // Modo Edit
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

          {/* Redistribuição - dropdown custom com pesquisa */}
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
                  {/* Opção de 'Nenhuma' */}
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
              className={`mt-1 block w-full rounded-md p-2 focus:ring focus:ring-blue-500 ${
                errors.valorCC ? 'border-red-500' : 'border-gray-300 border'
              }`}
              value={editedEmployee.valorCC}
              onChange={(e) =>
                setEditedEmployee({
                  ...editedEmployee,
                  valorCC: Number(e.target.value)
                })
              }
              disabled={mode === 'addVacant'}  // Bloqueia se estiver adicionando em vaga
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
                  disabled={mode === 'addVacant'} // "addVacant" fica travado
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

  // Modal
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Refs para fechar dropdown
  const orgRef = useRef<HTMLDivElement>(null);
  const cargoRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef<HTMLDivElement>(null);

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

    if (storedOrgs) setSelectedOrgs(JSON.parse(storedOrgs));
    if (storedCargos) setSelectedCargos(JSON.parse(storedCargos));
    if (storedSymbols) setSelectedSymbols(JSON.parse(storedSymbols));
    if (storedStatus) setStatusFilter(storedStatus);
  }, []);

  // Se não tiver órgão selecionado, limpa
  useEffect(() => {
    if (selectedOrgs.length === 0) {
      setSelectedCargos([]);
      setSelectedSymbols([]);
      setStatusFilter('');
    }
  }, [selectedOrgs]);

  const handleSavePreferences = () => {
    localStorage.setItem('selectedOrgs', JSON.stringify(selectedOrgs));
    localStorage.setItem('selectedCargos', JSON.stringify(selectedCargos));
    localStorage.setItem('selectedSymbols', JSON.stringify(selectedSymbols));
    localStorage.setItem('statusFilter', statusFilter);
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

      // Primeiro, aplicamos transform e ordenamos
      const transformed = emps.map(transformEmployee);
      transformed.sort((a, b) => a.ordem - b.ordem);
      setEmployeesData(transformed);

      // Depois, repetimos o "comportamento do código antigo":
      // ordenando o array cru e setando no state
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

  // Lista de órgãos disponíveis
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

  // Filtra employees das orgs selecionadas
  const allRowsFromSelectedOrgs = useMemo(() => {
    if (selectedOrgs.length === 0) return [];
    return employeesData.filter((emp) => selectedOrgs.includes(emp.secretaria));
  }, [employeesData, selectedOrgs]);

  // Cargos e símbolos presentes nas orgs selecionadas
  const cargoOptions = useMemo(() => {
    const setCargos = new Set(allRowsFromSelectedOrgs.map((emp) => emp.cargo.cargo_efetivo));
    return Array.from(setCargos).sort();
  }, [allRowsFromSelectedOrgs]);

  const symbolOptions = useMemo(() => {
    const setSyms = new Set(allRowsFromSelectedOrgs.map((emp) => emp.cargo.simbolo));
    return Array.from(setSyms).sort();
  }, [allRowsFromSelectedOrgs]);

  // Filtro de texto
  const filteredCargoOptions = useMemo(() => {
    return cargoOptions.filter((c) => c.toLowerCase().includes(cargoSearch.toLowerCase()));
  }, [cargoOptions, cargoSearch]);

  const filteredSymbolOptions = useMemo(() => {
    return symbolOptions.filter((s) => s.toLowerCase().includes(symbolSearch.toLowerCase()));
  }, [symbolOptions, symbolSearch]);

  function getMultiSelectDisplayText(list: string[]): string {
    if (list.length === 0) return 'Nenhum';
    if (list.length <= 2) return list.join(', ');
    return list.slice(0, 2).join(', ') + '...';
  }

  // Filtragem final
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
      if (statusFilter && emp.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [employeesData, selectedOrgs, selectedCargos, selectedSymbols, statusFilter]);

  // Cálculos mini-cards
  const totalProvido = useMemo(() => {
    return filteredRows
      .filter((e) => e.status === 'Provido')
      .reduce((sum, e) => sum + e.valorCC, 0);
  }, [filteredRows]);

  const totalVago = useMemo(() => {
    return filteredRows
      .filter((e) => e.status === 'Vago')
      .reduce((sum, e) => sum + e.valorCC, 0);
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

  // CRUD
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

  // Reordenar (Drag & Drop)
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

  // PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(12);

    const sorted = [...filteredRows].sort((a, b) => a.ordem - b.ordem);

    // Agrupar por secretaria
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
        valorCC: `R$ ${emp.valorCC.toLocaleString('pt-BR', {
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

  // Templates de colunas
  const valorTemplate = (emp: Employee) => {
    return `R$ ${emp.valorCC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const servidorTemplate = (emp: Employee) => {
    if (emp.status === 'Provido') return emp.nomeServidor;
    return <span className="text-green-700 font-bold">VAGO</span>;
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

  // -------------------------------------
  // Render principal do componente
  // -------------------------------------
  return (
    <div className="p-6">
      {/* Forçar table-layout: fixed */}
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

      {/* Mini-card de órgão(s) */}
      {orgDisplayText && filteredRows.length > 0 && (
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-md">
            <span className="font-bold text-lg">{orgDisplayText}</span>
          </div>
        </div>
      )}

      {/* Filtros + Botões */}
      <div className="flex flex-col md:flex-row flex-wrap items-start justify-center gap-4 mb-4">
        {/* MULTI-SELECT de Órgão (500px) */}
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
                            setSelectedOrgs((prev) =>
                              prev.filter((o) => o !== org.sigla)
                            );
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

        {/* MULTI-SELECT de Cargo (500px) */}
        <div className="relative" ref={cargoRef}>
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

        {/* MULTI-SELECT de Símbolo (500px) */}
        <div className="relative" ref={symbolRef}>
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
            body={dataPublicacaoTemplate}
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

      {/* Modal */}
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
