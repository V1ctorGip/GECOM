/* src/components/Organizations.tsx */
import React, { useEffect, useMemo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Organization, Employee } from '../types/index.js';

// Você pode usar fetchOrganizations e fetchEmployees do mesmo jeito que no "Employees.tsx"
import { fetchOrganizations, fetchEmployees } from '../data/api.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterText, setFilterText] = useState('');
  const [classificacaoFilter, setClassificacaoFilter] = useState('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const orgs = await fetchOrganizations(); // buscar /api/organizations
        setOrganizations(orgs);

        const emps = await fetchEmployees(); // buscar /api/employees
        setEmployees(emps);
      } catch (err) {
        setError('Erro ao carregar dados de organizações e funcionários.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filtramos as organizations de acordo com a busca e classificação
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const texto = filterText.toLowerCase();
      const matchesText =
        org.secretaria.toLowerCase().includes(texto) ||
        org.sigla.toLowerCase().includes(texto) ||
        org.codigo.toString().includes(filterText);
      const matchesClass =
        !classificacaoFilter || org.classificacao === classificacaoFilter;
      return matchesText && matchesClass;
    });
  }, [organizations, filterText, classificacaoFilter]);

  // Definimos as colunas do PrimeReact DataTable
  const columns = [
    {
      field: 'codigo',
      header: 'Código',
      style: { width: '6rem' }
    },
    {
      field: 'secretaria',
      header: 'Órgão',
      style: { minWidth: '12rem' }
    },
    {
      field: 'sigla',
      header: 'Sigla',
      style: { width: '8rem' }
    },
    {
      field: 'classificacao',
      header: 'Classificação',
      style: { width: '8rem' }
    }
  ];

  // Contamos quantos employees "Provido" cada órgão tem
  const providoByOrg = useMemo(() => {
    // Mapeia sigla -> contador
    const mapCount = new Map<string, number>();
    employees.forEach((emp) => {
      if (emp.status === 'Provido') {
        const sigla = emp.secretaria || 'N/D';
        mapCount.set(sigla, (mapCount.get(sigla) || 0) + 1);
      }
    });
    // Retornamos um array de { sigla, total }
    return Array.from(mapCount.entries()).map(([sigla, total]) => ({
      sigla,
      total
    }));
  }, [employees]);

  // Ajustamos o chart data para exibir as barras
  // Apenas para as siglas que realmente aparecem no map (ou se quiser, filtra para orgs que existam)
  const barLabels = providoByOrg.map((item) => item.sigla);
  const barData = providoByOrg.map((item) => item.total);

  // Caso queira cores diferentes para cada sigla
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
    // adicione mais cores se precisar
  ];

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Servidores Providos',
        data: barData,
        backgroundColor: barLabels.map(
          (_, i) => colorPalette[i % colorPalette.length]
        ),
        borderColor: barLabels.map(
          (_, i) => colorPalette[i % colorPalette.length].replace('0.6', '1')
        ),
        borderWidth: 2,
        borderRadius: 5
      }
    ]
  };

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

  if (loading) {
    return <p className="text-center">Carregando dados...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Órgãos</h1>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="Buscar por código, nome ou sigla..."
          className="p-2 border rounded-lg flex-1"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <select
          className="p-2 border rounded-lg w-full md:w-48"
          value={classificacaoFilter}
          onChange={(e) => setClassificacaoFilter(e.target.value)}
        >
          <option value="">Todas Classificações</option>
          <option value="DIRETA">DIRETA</option>
          <option value="INDIRETA">INDIRETA</option>
        </select>
      </div>

      {/* Tabela no estilo do Employees (PrimeReact DataTable) */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <DataTable
          value={filteredOrganizations}
          scrollable
          responsiveLayout="scroll"
          className="p-datatable-gridlines p-datatable-striped p-datatable-sm"
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100, filteredOrganizations.length]}
          dataKey="sigla"
        >
          {columns.map((col, idx) => (
            <Column
              key={idx}
              field={col.field as string}
              header={col.header}
              style={col.style}
              sortable
            />
          ))}
        </DataTable>
      </div>

      {/* Dashboard abaixo da datatable */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 mt-8">
        <h2 className="text-xl font-bold mb-2 text-gray-800">
          Servidores Providos por Órgão
        </h2>
        <div className="relative h-64">
          <Bar data={barChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
