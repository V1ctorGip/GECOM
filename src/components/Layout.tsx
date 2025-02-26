/* src/components/Layout.tsx */
import React, { useState } from 'react'; // ADICIONADO useState
import { Building2, Users, Briefcase, LayoutDashboard, FileText, LogOut, Menu } from 'lucide-react'; // ADICIONADO Menu
import { useAuth } from '../context/AuthContext.js';

type LayoutProps = {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();

  // ADICIONADO: estado para controlar abertura/fechamento da sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* SIDEBAR COM LARGURA DINÂMICA E BOTÃO PARA COLAPSAR */}
      <div
        className={`
          flex flex-col
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white shadow-lg
          transition-all duration-300
          ${isSidebarOpen ? 'w-64' : 'w-20'} 
          relative
        `}
      >
        {/* TOPO DA SIDEBAR: BOTÃO DE MENU E INFO DO USUÁRIO */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-400">
          {/* Caso a sidebar esteja aberta, mostramos o título e o "Olá" */}
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-bold">GECOM</h1>
              <p className="text-sm text-indigo-100 mt-1">Olá, {user?.name}</p>
            </div>
          )}

          {/* BOTÃO PARA COLAPSAR A SIDEBAR */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-white hover:bg-indigo-500 p-2 rounded-md"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* LINKS DE NAVEGAÇÃO */}
        <nav className="p-4 flex-grow">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  currentPage === 'dashboard' ? 'bg-indigo-800' : 'hover:bg-indigo-700'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                {/* Se a sidebar estiver aberta, mostramos o texto */}
                {isSidebarOpen && <span>Dashboard</span>}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('organizations')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  currentPage === 'organizations' ? 'bg-indigo-800' : 'hover:bg-indigo-700'
                }`}
              >
                <Building2 className="w-5 h-5" />
                {isSidebarOpen && <span>Órgãos</span>}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('positions')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  currentPage === 'positions' ? 'bg-indigo-800' : 'hover:bg-indigo-700'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                {isSidebarOpen && <span>Cargos</span>}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('employees')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  currentPage === 'employees' ? 'bg-indigo-800' : 'hover:bg-indigo-700'
                }`}
              >
                <Users className="w-5 h-5" />
                {isSidebarOpen && <span>Servidores</span>}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('reports')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  currentPage === 'reports' ? 'bg-indigo-800' : 'hover:bg-indigo-700'
                }`}
              >
                <FileText className="w-5 h-5" />
                {isSidebarOpen && <span>Relatórios</span>}
              </button>
            </li>
          </ul>
        </nav>

        {/* BOTÃO DE SAIR FICA NO FINAL */}
        <div className="p-4 border-t border-indigo-400 mt-auto">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-auto">
        {/* Ajuste de padding para manter espaçamento */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
