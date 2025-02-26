/* src/components/Dashboard.tsx */
import React, { useEffect, useState } from 'react';
import { fetchOrganizations, fetchEmployees, fetchPositions } from '../data/api.js';
import { LayoutDashboard, Users, Building2, Briefcase } from 'lucide-react';
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
  ArcElement
} from 'chart.js';
import { Organization, Employee, Position } from '../types/index.js';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guardaremos um array para o último gráfico (quantidade de cargos por sigla)
  const [positionsBySecretaria, setPositionsBySecretaria] = useState<{ sigla: string; total: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const orgs = await fetchOrganizations();
        setOrganizations(orgs);
        const emps = await fetchEmployees();
        setEmployees(emps);
        const pos = await fetchPositions();
        setPositions(pos);

        // Agrupar positions por secretaria (caso a API retorne "secretaria" em cada Position)
        const mapSec = new Map<string, number>();
        pos.forEach((p) => {
          const sec = p.secretaria || 'N/D';
          mapSec.set(sec, (mapSec.get(sec) || 0) + 1);
        });
        const result = Array.from(mapSec.entries()).map(([key, value]) => ({
          sigla: key,
          total: value
        }));
        setPositionsBySecretaria(result);
      } catch (err) {
        setError('Erro ao carregar os dados. Verifique sua conexão com o backend.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <p className="text-center text-lg">Carregando dados...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  // Quantidades para uso nos cards
  const occupiedPositions = employees.filter((employee) => employee.status === 'Provido').length;
  const vacantPositions = employees.filter((employee) => employee.status === 'Vago').length;
  const diretaCount = organizations.filter((organization) => organization.classificacao === 'DIRETA').length;
  const indiretaCount = organizations.filter((organization) => organization.classificacao === 'INDIRETA').length;
  const totalOrganizations = organizations.length;

  // GRÁFICO 1: Distribuição de Órgãos (Barra)
  const barChartData = {
    labels: ['DIRETA', 'INDIRETA'],
    datasets: [
      {
        label: 'Quantidade de Órgãos',
        data: [diretaCount, indiretaCount],
        backgroundColor: ['rgba(59, 130, 246, 0.2)', 'rgba(239, 68, 68, 0.2)'],
        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 2,
        borderRadius: 5
      }
    ]
  };

  // GRÁFICO 2: Percentual por Classificação (Pizza)
  const pieChartData = {
    labels: ['DIRETA', 'INDIRETA'],
    datasets: [
      {
        data:
          totalOrganizations > 0
            ? [
                (diretaCount / totalOrganizations) * 100,
                (indiretaCount / totalOrganizations) * 100
              ]
            : [0, 0],
        backgroundColor: ['rgba(59, 130, 246, 0.2)', 'rgba(239, 68, 68, 0.2)'],
        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 2
      }
    ]
  };

  // GRÁFICO 3: Evolução do Número de Órgãos -> mostrando quantidade de cargos por sigla
  const lineLabels = positionsBySecretaria.map((item) => item.sigla);
  const lineValues = positionsBySecretaria.map((item) => item.total);

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Quantidade de Cargos',
        data: lineValues,
        borderColor: 'rgba(167, 139, 250, 1)',
        backgroundColor: 'rgba(167, 139, 250, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }
    ]
  };

  // Opções de estilo e tooltip para os gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#1F2937'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#111827',
        bodyColor: '#111827',
        borderColor: '#D1D5DB',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#374151'
        },
        grid: {
          color: '#E5E7EB'
        }
      },
      y: {
        ticks: {
          color: '#374151'
        },
        grid: {
          color: '#E5E7EB'
        }
      }
    }
  };

  return (
    // ALTERADO: Usamos container menor e deixamos a responsividade para o Layout
    <div className="p-6"> 
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Painel de Controle</h1>
      </header>

      {/* CARDS: cores mais suaves e transparentes, seguindo as cores dos ícones */}
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          className="rounded-lg p-6 shadow hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total de Órgãos</p>
              <p className="text-2xl font-bold text-gray-800">{totalOrganizations}</p>
            </div>
            <Building2 className="text-blue-500 w-8 h-8" />
          </div>
        </div>

        <div
          className="rounded-lg p-6 shadow hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total de Cargos</p>
              <p className="text-2xl font-bold text-gray-800">{positions.length}</p>
            </div>
            <Briefcase className="text-green-500 w-8 h-8" />
          </div>
        </div>

        <div
          className="rounded-lg p-6 shadow hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Cargos Ocupados</p>
              <p className="text-2xl font-bold text-gray-800">{occupiedPositions}</p>
            </div>
            <Users className="text-purple-500 w-8 h-8" />
          </div>
        </div>

        <div
          className="rounded-lg p-6 shadow hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Cargos Vagos</p>
              <p className="text-2xl font-bold text-gray-800">{vacantPositions}</p>
            </div>
            <LayoutDashboard className="text-red-500 w-8 h-8" />
          </div>
        </div>
      </section>

      {/* GRÁFICOS: cores mais suaves e tooltips brancos */}
      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Distribuição de Órgãos</h2>
          <div className="relative h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Percentual por Classificação</h2>
          <div className="relative h-64">
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Evolução do Número de Órgãos</h2>
          <div className="relative h-64">
            {/* AGORA MOSTRANDO QUANTIDADE DE CARGOS POR SIGLA (lineChartData) */}
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>
      </section>
    </div>
  );
}
