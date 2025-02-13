import React from 'react';
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
import {
  employees,
  organizations,
  positions,
  organizationGrowth,
} from '../data/mockData';

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
  // Cálculo dos dados dos cartões
  const occupiedPositions = employees.filter(
    (employee) => employee.status === 'Provido'
  ).length;
  const vacantPositions = employees.filter(
    (employee) => employee.status === 'Vago'
  ).length;

  // Cálculo dos dados das organizações
  const diretaCount = organizations.filter(
    (organization) => organization.classificacao === 'DIRETA'
  ).length;
  const indiretaCount = organizations.filter(
    (organization) => organization.classificacao === 'INDIRETA'
  ).length;
  const totalOrganizations = organizations.length;

  // Dados para o gráfico de barras
  const barChartData = {
    labels: ['DIRETA', 'INDIRETA'],
    datasets: [
      {
        label: 'Quantidade de Órgãos',
        data: [diretaCount, indiretaCount],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Dados para o gráfico de pizza
  const pieChartData = {
    labels: ['DIRETA', 'INDIRETA'],
    datasets: [
      {
        data: [
          (diretaCount / totalOrganizations) * 100,
          (indiretaCount / totalOrganizations) * 100,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
      },
    ],
  };

  // Dados para o gráfico de linhas
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="container mx-auto p-6">
      {/* Cabeçalho */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Painel de Controle</h1>
      </header>

      {/* Cartões de resumo (dashboard) em quadrantes */}
      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Total de Órgãos</p>
                <p className="text-2xl font-bold">
                  {organizations.length}
                </p>
              </div>
              <Building2 className="text-blue-500 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Total de Cargos</p>
                <p className="text-2xl font-bold">
                  {positions.length}
                </p>
              </div>
              <Briefcase className="text-green-500 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Cargos Ocupados</p>
                <p className="text-2xl font-bold">
                  {occupiedPositions}
                </p>
              </div>
              <Users className="text-purple-500 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Cargos Vagos</p>
                <p className="text-2xl font-bold">
                  {vacantPositions}
                </p>
              </div>
              <LayoutDashboard className="text-red-500 w-8 h-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Gráficos: Distribuição e Percentual */}
      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">
            Distribuição de Órgãos
          </h2>
          <div style={{ position: 'relative', height: '200px' }}>
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">
            Percentual por Classificação
          </h2>
          <div style={{ position: 'relative', height: '200px' }}>
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </div>
      </section>

      {/* Gráfico de evolução */}
      <section className="mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">
            Evolução do Número de Órgãos
          </h2>
          <div style={{ position: 'relative', height: '200px' }}>
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>
      </section>
    </div>
  );
}
