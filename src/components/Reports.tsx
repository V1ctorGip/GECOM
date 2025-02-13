import React from 'react';
import { FileText } from 'lucide-react';
import { Report } from '../types';

const reports: Report[] = [
  { id: '1', title: 'Lista de Organizações', description: 'Relatório completo de todas as organizações', type: 'organizations' },
  { id: '2', title: 'Cargos Vagos', description: 'Lista de posições em aberto', type: 'positions' },
  { id: '3', title: 'Custos com Funcionários', description: 'Relatório de custos por funcionário', type: 'costs' },
  { id: '4', title: 'Funcionários por Data de Nomeação', description: 'Lista de funcionários ordenada por data', type: 'employees' },
];

export function Reports() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Relatórios</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">{report.title}</h2>
            </div>
            <p className="text-gray-600 mb-4">{report.description}</p>
            <button
              className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => alert('Funcionalidade em desenvolvimento')}
            >
              Gerar Relatório
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
