import React, { useState, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { organizations } from '../data/mockData';

export function Organizations() {
  const [filterText, setFilterText] = useState('');
  const [classificacaoFilter, setClassificacaoFilter] = useState('');

  const columns = [
    {
      name: 'Código',
      selector: (row: any) => row.codigo,
      sortable: true,
    },
    {
      name: 'Órgão',
      selector: (row: any) => row.nome,
      sortable: true,
    },
    {
      name: 'Sigla',
      selector: (row: any) => row.sigla,
      sortable: true,
    },
    {
      name: 'Classificação',
      selector: (row: any) => row.classificacao,
      sortable: true,
    },
  ];

  const filteredItems = useMemo(() => {
    return organizations.filter(
      item => {
        const matchesFilter = (
          item.nome.toLowerCase().includes(filterText.toLowerCase()) ||
          item.sigla.toLowerCase().includes(filterText.toLowerCase()) ||
          item.codigo.toString().includes(filterText)
        );

        const matchesClassificacao = !classificacaoFilter || item.classificacao === classificacaoFilter;

        return matchesFilter && matchesClassificacao;
      }
    );
  }, [filterText, classificacaoFilter]);

  const subHeaderComponent = (
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
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Órgãos</h1>
      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={filteredItems}
          pagination
          subHeader
          subHeaderComponent={subHeaderComponent}
          persistTableHead
        />
      </div>
    </div>
  );
}
