import React, { useEffect, useState, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { Organization } from '../types/index.js';

export function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filterText, setFilterText] = useState('');
  const [classificacaoFilter, setClassificacaoFilter] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/organizations')
      .then(res => res.json())
      .then(data => setOrganizations(data))
      .catch(error => console.error(error));
  }, []);

  const columns = [
    {
      name: 'Código',
      selector: (row: Organization) => row.codigo,
      sortable: true,
    },
    {
      name: 'Órgão',
      selector: (row: Organization) => row.secretaria, // Ajuste correto
      sortable: true,
    },
    {
      name: 'Sigla',
      selector: (row: Organization) => row.sigla,
      sortable: true,
    },
    {
      name: 'Classificação',
      selector: (row: Organization) => row.classificacao,
      sortable: true,
    },
  ];

  const filteredItems = useMemo(() => {
    return organizations.filter(item => {
      const matchesFilter =
        item.secretaria.toLowerCase().includes(filterText.toLowerCase()) ||
        item.sigla.toLowerCase().includes(filterText.toLowerCase()) ||
        item.codigo.toString().includes(filterText);

      const matchesClassificacao =
        !classificacaoFilter || item.classificacao === classificacaoFilter;

      return matchesFilter && matchesClassificacao;
    });
  }, [filterText, classificacaoFilter, organizations]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Órgãos</h1>
      <div className="w-full flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar por código, nome ou sigla..."
          className="p-2 border rounded-lg flex-1"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <select
          className="p-2 border rounded-lg w-full md:w-48"
          value={classificacaoFilter}
          onChange={e => setClassificacaoFilter(e.target.value)}
        >
          <option value="">Todas Classificações</option>
          <option value="DIRETA">DIRETA</option>
          <option value="INDIRETA">INDIRETA</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={filteredItems}
          pagination
          persistTableHead
        />
      </div>
    </div>
  );
}
