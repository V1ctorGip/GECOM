import React from 'react';
import { Building2, Users, Briefcase, LayoutDashboard, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type LayoutProps = {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">GECOM</h1>
          <p className="text-sm text-gray-600 mt-1">Olá, {user?.name}</p>
        </div>
        <nav className="p-4 flex-grow">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg ${
                  currentPage === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('organizations')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg ${
                  currentPage === 'organizations' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Órgãos</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('positions')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg ${
                  currentPage === 'positions' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                <span>Cargos</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('employees')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg ${
                  currentPage === 'employees' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Servidores</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('reports')}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg ${
                  currentPage === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Relatórios</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t mt-auto">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
