import React, { useEffect, useState } from 'react';
import { 
  fetchOrganizations, 
  fetchEmployees, 
  fetchPositions, 
  fetchOrganizationGrowth 
} from '../data/api';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
} from 'lucide-react';

import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Organization, Employee, Position, OrganizationGrowth } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function Dashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [organizationGrowth, setOrganizationGrowth] = useState<OrganizationGrowth[]>([]);

  useEffect(() => {
    fetchOrganizations().then(setOrganizations);
    fetchEmployees().then(setEmployees);
    fetchPositions().then(setPositions);
    fetchOrganizationGrowth().then(setOrganizationGrowth);
  }, []);

  const occupiedPositions = employees.filter((employee) => employee.status === 'Provido').length;
  const vacantPositions = employees.filter((employee) => employee.status === 'Vago').length;

  const diretaCount = organizations.filter((organization) => organization.classificacao === 'DIRETA').length;
  const indiretaCount = organizations.filter((organization) => organization.classificacao === 'INDIRETA').length;
  const totalOrganizations = organizations.length;

  const barChartData = {
    labels: ['DIRETA', 'INDIRETA'],
    datasets: [
      {
        label: 'Quantidade de Órgãos',
        data: [diretaCount, indiretaCount],
        backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(255, 99, 132, 0.5)'],
        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: ['DIRETA', 'INDIRETA'],
    datasets: [
      {
        data: [(diretaCount / totalOrganizations) * 100, (indiretaCount / totalOrganizations) * 100],
        backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(255, 99, 132, 0.5)'],
        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
      },
    ],
  };

  const lineChartData = {
    labels: organizationGrowth.map((item) => item.mes),
    datasets: [
      {
        label: 'Total de Órgãos',
        data: organizationGrowth.map((item) => item.total),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Painel de Controle</h1>
      </header>

      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total de Órgãos</p>
              <p className="text-2xl font-bold">{organizations.length}</p>
            </div>
            <Building2 className="text-blue-500 w-8 h-8" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total de Cargos</p>
              <p className="text-2xl font-bold">{positions.length}</p>
            </div>
            <Briefcase className="text-green-500 w-8 h-8" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Cargos Ocupados</p>
              <p className="text-2xl font-bold">{occupiedPositions}</p>
            </div>
            <Users className="text-purple-500 w-8 h-8" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Cargos Vagos</p>
              <p className="text-2xl font-bold">{vacantPositions}</p>
            </div>
            <LayoutDashboard className="text-red-500 w-8 h-8" />
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">Distribuição de Órgãos</h2>
          <div style={{ position: 'relative', height: '200px' }}>
            <Bar data={barChartData} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">Percentual por Classificação</h2>
          <div style={{ position: 'relative', height: '200px' }}>
            <Pie data={pieChartData} />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">Evolução do Número de Órgãos</h2>
          <div style={{ position: 'relative', height: '200px' }}>
            <Line data={lineChartData} />
          </div>
        </div>
      </section>
    </div>
  );
}
