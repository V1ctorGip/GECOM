// src/components/Positions.tsx

import React, { useState, useEffect, useMemo } from 'react';
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

import { fetchPositions, fetchEmployees } from '../data/api.js';
import { Position, Employee } from '../types/index.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function Positions() {
  // Dados básicos
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros para a tabela
  const [searchText, setSearchText] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');

  // Para o gráfico de comparação
  // - Quais cargos o usuário quer comparar
  const [selectedCargos, setSelectedCargos] = useState<string[]>([]);
  // - Filtro de texto para a *lista de checkboxes* do gráfico
  const [checkboxSearch, setCheckboxSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const pos = await fetchPositions();
        setPositions(pos);

        const emps = await fetchEmployees();
        setEmployees(emps);
      } catch (err) {
        console.error('Erro ao carregar dados de cargos e servidores:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --------------------------------------------------
  // 1) LÓGICA DA TABELA

  // Filtra a lista de positions conforme searchText e symbolFilter
  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      const matchText =
        p.cargo_efetivo.toLowerCase().includes(searchText.toLowerCase()) ||
        p.simbolo.toLowerCase().includes(searchText.toLowerCase()) ||
        p.numero.toString().includes(searchText);
      const matchSymbol = !symbolFilter || p.simbolo === symbolFilter;
      return matchText && matchSymbol;
    });
  }, [positions, searchText, symbolFilter]);

  // Opções de símbolo (para <select>)
  const symbolOptions = useMemo(() => {
    const setSimbolos = new Set(positions.map((p) => p.simbolo));
    return Array.from(setSimbolos).sort();
  }, [positions]);

  // Map cargoEfetivo -> total de servidores Provido
  const cargoCountMap = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((emp) => {
      if (emp.status === 'Provido') {
        // Se o campo for "emp.cargo_efetivo", ajuste aqui
        const cargoEfetivo = emp.cargo.cargo_efetivo || '';
        map.set(cargoEfetivo, (map.get(cargoEfetivo) || 0) + 1);
      }
    });
    return map;
  }, [employees]);

  // Coluna "Ocupantes (Provido)" na tabela
  const ocupantesBodyTemplate = (rowData: Position) => {
    return cargoCountMap.get(rowData.cargo_efetivo) || 0;
  };

  // --------------------------------------------------
  // 2) LÓGICA DO GRÁFICO DE COMPARAÇÃO

  // Montar array com { cargoName, count }
  const cargoArray = useMemo(() => {
    const arr: Array<{ cargoName: string; count: number }> = [];
    cargoCountMap.forEach((count, cargoName) => {
      arr.push({ cargoName, count });
    });
    // Ordenar por count desc
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [cargoCountMap]);

  // Se "selectedCargos" ainda estiver vazio, colocar top 5
  useEffect(() => {
    if (cargoArray.length > 0 && selectedCargos.length === 0) {
      const top5 = cargoArray.slice(0, 5).map((c) => c.cargoName);
      setSelectedCargos(top5);
    }
  }, [cargoArray, selectedCargos]);

  // Filtra cargoArray para exibir só os selectedCargos
  const displayedCargos = useMemo(() => {
    return cargoArray.filter((item) => selectedCargos.includes(item.cargoName));
  }, [cargoArray, selectedCargos]);

  // Prepara dados do gráfico
  const chartLabels = displayedCargos.map((item) => item.cargoName);
  const chartValues = displayedCargos.map((item) => item.count);

  const barData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Servidores Providos',
        data: chartValues,
        backgroundColor: 'rgba(75,192,192, 0.6)',
        borderColor: 'rgba(75,192,192, 1)',
        borderWidth: 2,
        borderRadius: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#374151' },
        grid: { color: '#E5E7EB' },
        beginAtZero: true
      },
      y: {
        ticks: { color: '#374151' },
        grid: { color: '#E5E7EB' }
      }
    },
    plugins: {
      legend: {
        labels: { color: '#1F2937' }
      },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        titleColor: '#111827',
        bodyColor: '#111827',
        borderColor: '#D1D5DB',
        borderWidth: 1
      }
    }
  };

  // Lista de todos os cargos (checkboxes). Pesquisamos com checkboxSearch
  const allCargoNames = useMemo(() => {
    return cargoArray.map((c) => c.cargoName).sort();
  }, [cargoArray]);

  const filteredCheckboxCargos = useMemo(() => {
    return allCargoNames.filter((cargoName) =>
      cargoName.toLowerCase().includes(checkboxSearch.toLowerCase())
    );
  }, [allCargoNames, checkboxSearch]);

  // Toggle de checkbox
  const handleToggleCargo = (cargoName: string) => {
    setSelectedCargos((prev) => {
      if (prev.includes(cargoName)) {
        // se já está, remove
        return prev.filter((c) => c !== cargoName);
      } else {
        // senão, adiciona
        return [...prev, cargoName];
      }
    });
  };

  if (loading) {
    return <p className="text-center">Carregando dados de Cargos...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Cargos
      </h1>

      {/* FILTROS DA TABELA */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-center">
        <input
          type="text"
          placeholder="Buscar por número, cargo ou símbolo..."
          className="p-2 border rounded-lg w-full md:w-72"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          className="p-2 border rounded-lg w-full md:w-48"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        >
          <option value="">Todos Símbolos</option>
          {symbolOptions.map((symb) => (
            <option key={symb} value={symb}>
              {symb}
            </option>
          ))}
        </select>
      </div>

      {/* TABELA DE CARGOS */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <DataTable
          value={filteredPositions}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          className="p-datatable-sm p-datatable-gridlines"
          dataKey="id"
          scrollable
          responsiveLayout="scroll"
        >
          <Column
            field="numero"
            header="Número"
            style={{ width: '6rem' }}
            sortable
          />
          <Column
            field="cargo_efetivo"
            header="Cargo Efetivo"
            style={{ minWidth: '12rem' }}
            sortable
          />
          <Column
            field="simbolo"
            header="Símbolo"
            style={{ width: '8rem' }}
            sortable
          />
          <Column
            header="Ocupantes (Provido)"
            body={ocupantesBodyTemplate}
            style={{ width: '10rem', textAlign: 'center' }}
          />
        </DataTable>
      </div>

      {/* COMPARAÇÃO NO GRÁFICO */}
      <div className="mt-8 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Comparar Cargos (Gráfico)
        </h2>

        <p className="text-gray-600 mb-2">
          Por padrão, exibimos o Top 5. Você pode marcar/desmarcar outros cargos abaixo
          para comparar. Use a busca para filtrar a lista de checkboxes.
        </p>

        {/* Filtro de texto para as checkboxes */}
        <div className="mb-2">
          <input
            type="text"
            placeholder="Filtrar cargo..."
            className="p-2 border rounded-lg w-full md:w-72"
            value={checkboxSearch}
            onChange={(e) => setCheckboxSearch(e.target.value)}
          />
        </div>

        {/* CHECKBOX LIST (scroll se quiser) */}
        <div
          className="border p-2 rounded mb-4"
          style={{
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {filteredCheckboxCargos.map((cargoName) => {
            const checked = selectedCargos.includes(cargoName);
            return (
              <div key={cargoName} className="mb-1">
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleCargo(cargoName)}
                  />
                  <span>{cargoName}</span>
                </label>
              </div>
            );
          })}
          {filteredCheckboxCargos.length === 0 && (
            <p className="text-gray-500 text-sm">Nenhum cargo encontrado...</p>
          )}
        </div>

        {/* Gráfico */}
        <div style={{ height: '400px' }}>
          {displayedCargos.length === 0 ? (
            <p className="text-center text-gray-500">
              Selecione ao menos um cargo para visualizar.
            </p>
          ) : (
            <Bar data={barData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
}
