/* src/components/Dashboard.tsx */
import React, { useEffect, useState } from 'react';
import { fetchOrganizations, fetchEmployees, fetchPositions } from '../data/api.js';
import { LayoutDashboard, Users, Building2, Briefcase } from 'lucide-react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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

  // Vetor para “Quantidade de cargos_efetivo distintos por órgão”
  const [cargosByOrg, setCargosByOrg] = useState<Array<{ sigla: string; total: number }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const orgs = await fetchOrganizations();
        const emps = await fetchEmployees();
        const pos = await fetchPositions();

        setOrganizations(orgs);
        setEmployees(emps);
        setPositions(pos);

        // Agrupar os EMPLOYEES por sigla, contando CARGOS distintos
        const mapCargosPorOrg = new Map<string, Set<string>>();
        emps.forEach((emp: Employee) => {
          // Pega a sigla do orgão
          const sigla = emp.secretaria || 'N/D';

          if (!mapCargosPorOrg.has(sigla)) {
            mapCargosPorOrg.set(sigla, new Set());
          }

          // Adiciona o cargo do emp no Set. 
          // Se seu employee é aninhado => emp.cargo.cargo_efetivo
          mapCargosPorOrg.get(sigla)?.add(emp.cargo.cargo_efetivo);
        });

        // Transforma em array [{ sigla, total }, ...]
        const result = Array.from(mapCargosPorOrg.entries()).map(([sigla, cargoSet]) => ({
          sigla,
          total: cargoSet.size
        }));

        setCargosByOrg(result);
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

  // Cartões de resumo
  const occupiedPositions = employees.filter((e) => e.status === 'Provido').length;
  const vacantPositions = employees.filter((e) => e.status === 'Vago').length;
  const diretaCount = organizations.filter((org) => org.classificacao === 'DIRETA').length;
  const indiretaCount = organizations.filter((org) => org.classificacao === 'INDIRETA').length;
  const totalOrganizations = organizations.length;

  // GRÁFICO 1: Distribuição de Órgãos (barras)
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

  // GRÁFICO 2: Percentual por Classificação (pizza)
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

  // GRÁFICO 3: “Quantidade de cargos_efetivo distintos por Órgão”
  const orgLabels = cargosByOrg.map((item) => item.sigla);
  const orgValues = cargosByOrg.map((item) => item.total);

  // Cores (uma cor por órgão)
  const colorPalette = [
    'rgba(59, 130, 246, 0.6)',
    'rgba(34, 197, 94, 0.6)',
    'rgba(139, 92, 246, 0.6)',
    'rgba(251, 191, 36, 0.6)',
    'rgba(239, 68, 68, 0.6)',
    'rgba(236, 72, 153, 0.6)',
    'rgba(45, 212, 191, 0.6)',
    'rgba(250, 204, 21, 0.6)',
    'rgba(16, 185, 129, 0.6)'
    // Adicione mais cores se precisar
  ];

  const orgBarChartData = {
    labels: orgLabels,
    datasets: [
      {
        label: 'Cargos Efetivos Distintos',
        data: orgValues,
        backgroundColor: orgLabels.map((_, i) => colorPalette[i % colorPalette.length]),
        borderColor: orgLabels.map(
          (_, i) => colorPalette[i % colorPalette.length].replace('0.6', '1')
        ),
        borderWidth: 2,
        borderRadius: 5
      }
    ]
  };

  // Opções de estilo e tooltips
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#1F2937' }
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
        ticks: { color: '#374151' },
        grid: { color: '#E5E7EB' }
      },
      y: {
        ticks: { color: '#374151' },
        grid: { color: '#E5E7EB' }
      }
    }
  };

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Painel de Controle</h1>
      </header>

      {/* CARDS DE RESUMO */}
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

      {/* GRÁFICOS: DISTRIBUIÇÃO (BARRA) e CLASSIFICAÇÃO (PIZZA) */}
      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico 1 */}
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Distribuição de Órgãos</h2>
          <div className="relative h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico 2 */}
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Percentual por Classificação</h2>
          <div className="relative h-64">
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </div>
      </section>

      {/* GRÁFICO 3: Quantidade de Cargos por Órgão */}
      <section className="mb-8">
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
          <h2 className="text-xl font-bold mb-2 text-gray-800">
            Quantidade de Cargos por Órgão
          </h2>

          {/* Se houver muitos órgãos, podemos permitir rolagem horizontal */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ minWidth: '800px', height: '400px', position: 'relative' }}>
              <Bar data={orgBarChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
