import React, { useState, useEffect, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
} from 'react-beautiful-dnd';
import { Edit2, Trash2 } from 'lucide-react';
import { fetchEmployees, fetchPositions, fetchOrganizations } from '../data/api.js';
import { Employee, Position, Organization } from "../types/index.js";

type EditModalProps = {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
};

function EditModal({ employee, isOpen, onClose, onSave }: EditModalProps) {
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });
  if (!isOpen) return null;
  const handleSave = () => {
    onSave(editedEmployee);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {String(employee.id).startsWith('vacant-') ? 'Adicionar Servidor' : 'Editar Servidor'}
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

// Função para transformar os dados da API para o formato Employee esperado pelo frontend
const transformEmployee = (emp: any): Employee => {
  return {
    id: String(emp.id),
    // Mapeia "servidor" para "nomeServidor"
    nomeServidor: emp.servidor || '',
    // Transforma "cargo_efetivo" em um objeto Position com valores default para numero e simbolo, se necessário
    cargo: {
      id: String(emp.cargo_efetivo) || '',
      cargoGenerico: emp.cargo_efetivo || 'Desconhecido',
      numero: emp.numero || 0,
      simbolo: emp.simbolo || '',
    },
    // Garante que status seja 'Vago' ou 'Provido'
    status: emp.status === 'Provido' ? 'Provido' : 'Vago',
    redistribuicao: emp.redistribuicao || '',
    // Mapeia "data_nomeacao" para "dtPublicacao"
    dtPublicacao: emp.data_nomeacao || '',
    valorCC: emp.salario || 0,
    secretaria: emp.secretaria,
  };
};

export function Employees() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedOrgan, setSelectedOrgan] = useState<string>('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchOrganizations().then(setOrganizations);
    fetchEmployees().then((data) => {
      const transformed = data.map(transformEmployee);
      setEmployees(transformed);
    });
    fetchPositions().then((data) => {
      // Caso o backend não retorne todos os campos de Position, garanta valores default
      const transformedPositions = data.map((pos: any): Position => ({
        id: String(pos.id),
        cargoGenerico: pos.cargoGenerico || 'Desconhecido',
        numero: pos.numero ?? 0,
        simbolo: pos.simbolo || '',
      }));
      setPositions(transformedPositions);
    });
  }, []);

  useEffect(() => {
    if (organizations.length > 0) {
      setSelectedOrgan(organizations[0].sigla);
    }
  }, [organizations]);

  const organizationRows = useMemo(() => {
    const filteredEmployees = employees.filter(emp => emp.secretaria === selectedOrgan);
    return positions.map((position) => {
      const emp = filteredEmployees.find((e) => e.cargo.id === position.id);
      if (emp) return emp;
      // Cria um funcionário "vaga" com os campos esperados
      const fallbackEmployee: Employee = {
        id: `vacant-${position.id}`,
        nomeServidor: '',
        cargo: {
          id: String(position.id),
          cargoGenerico: position.cargoGenerico,
          numero: position.numero,
          simbolo: position.simbolo,
        },
        status: 'Vago',
        redistribuicao: 'Não',
        dtPublicacao: '',
        valorCC: 0,
        secretaria: selectedOrgan,
      };
      return fallbackEmployee;
    });
  }, [selectedOrgan, positions, employees]);

  const handleSaveEmployee = (updatedEmployee: Employee) => {
    if (String(updatedEmployee.id).startsWith('vacant-')) {
      setEmployees([...employees, { ...updatedEmployee, id: String(new Date().getTime()), status: 'Provido' }]);
    } else {
      setEmployees(employees.map(emp => (emp.id === updatedEmployee.id ? updatedEmployee : emp)));
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (window.confirm('Tem certeza que deseja excluir este servidor?')) {
      setEmployees(employees.filter(emp => emp.id !== employee.id));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Servidores</h1>
      <div className="mb-4">
        <label className="mr-2 font-medium">Selecione o Órgão:</label>
        <select className="p-2 border rounded-lg" value={selectedOrgan} onChange={(e) => setSelectedOrgan(e.target.value)}>
          {organizations.map((org: Organization) => (
            <option key={org.codigo} value={org.sigla}>
              {org.nome} ({org.sigla})
            </option>
          ))}
        </select>
      </div>
      <DragDropContext onDragEnd={(result: DropResult) => {
        if (!result.destination) return;
        const newPositions = Array.from(positions);
        const [removed] = newPositions.splice(result.source.index, 1);
        newPositions.splice(result.destination.index, 0, removed);
        setPositions(newPositions);
      }}>
        <Droppable droppableId="table">
          {(provided: DroppableProvided) => (
            <table className="min-w-full border-collapse mb-4" ref={provided.innerRef} {...provided.droppableProps}>
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-4 py-2">Cargo</th>
                  <th className="border px-4 py-2">Servidor</th>
                  <th className="border px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {organizationRows.map((row, index) => (
                  <Draggable key={row.cargo.id} draggableId={row.cargo.id} index={index}>
                    {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                      <tr ref={provided.innerRef} {...provided.draggableProps} className={snapshot.isDragging ? 'bg-blue-100' : ''}>
                        <td className="border px-4 py-2" {...provided.dragHandleProps}>
                          {row.cargo.cargoGenerico}
                        </td>
                        <td className="border px-4 py-2">{row.nomeServidor || 'Vago'}</td>
                        <td className="border px-4 py-2">
                          <button onClick={() => setEditingEmployee(row)}><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteEmployee(row)} className="text-red-600"><Trash2 size={18} /></button>
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
