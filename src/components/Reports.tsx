// src/components/Reports.tsx
import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Report } from '../types/index.js';
import { fetchOrganizations, fetchEmployees, fetchPositions } from '../data/api.js';
import { Organization, Position, Employee } from '../types/index.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Importe a logo do seu projeto
import logo from '../assets/logo.png';

/**
 * Temos 3 relatórios padrão:
 *   1) Relação de Cargos Vagos por Órgão (vacantByOrg)
 *   2) Quantitativo de Cargos (Símbolos) (symbolQuantitative)
 *   3) Quantitativo Geral de Símbolos (symbolGeneral)
 */
const reports: Report[] = [
  {
    id: '1',
    title: 'Relação de Cargos Vagos por Órgão',
    description: 'Relatório de cargos vagos agrupados por órgão e símbolo',
    type: 'vacantByOrg'
  },
  {
    id: '2',
    title: 'Quantitativo de Cargos (Símbolos)',
    description: 'Relatório de cargos providos/vagos divididos por órgão e símbolo',
    type: 'symbolQuantitative'
  },
  {
    id: '3',
    title: 'Quantitativo Geral de Símbolos',
    description: 'Relatório geral por classificação (DIRETA/INDIRETA), simbolizado',
    type: 'symbolGeneral'
  }
];

/** Filtro local para employees */
function applyFilters(
  employees: Employee[],
  orgFilter: string,
  cargoFilter: string,
  symbolFilter: string,
  statusFilter: string
) {
  return employees.filter((emp) => {
    // org
    if (orgFilter && emp.secretaria !== orgFilter) {
      return false;
    }
    // cargo
    if (cargoFilter && emp.cargo.cargo_efetivo !== cargoFilter) {
      return false;
    }
    // symbol
    if (symbolFilter && emp.cargo.simbolo !== symbolFilter) {
      return false;
    }
    // status
    if (statusFilter && emp.status !== statusFilter) {
      return false;
    }
    return true;
  });
}

/**
 * 1) Agrupa os dados **vagos** por órgão → símbolo → cargoEfetivo.
 */
function groupVacantByOrgSymbolCargo(employees: Employee[], organizations: Organization[]) {
  const vacantEmps = employees.filter((emp) => emp.status === 'Vago');
  const result: Record<string, any> = {};

  for (const emp of vacantEmps) {
    const orgSigla = emp.secretaria || 'SEM_ORGAO';
    if (!result[orgSigla]) {
      result[orgSigla] = {
        orgFullName: '',
        symbols: {} as Record<string, any>
      };
    }
    const orgFound = organizations.find((o) => o.sigla === orgSigla);
    if (orgFound) {
      result[orgSigla].orgFullName = orgFound.secretaria;
    }

    const symKey = emp.cargo.simbolo.trim();
    if (!result[orgSigla].symbols[symKey]) {
      result[orgSigla].symbols[symKey] = { cargoItems: {} as Record<string, any> };
    }
    const cargoName = emp.cargo.cargo_efetivo.trim();
    if (!result[orgSigla].symbols[symKey].cargoItems[cargoName]) {
      result[orgSigla].symbols[symKey].cargoItems[cargoName] = {
        cargoEfetivo: cargoName,
        countVago: 0,
        remun: 0
      };
    }
    const cargoItem = result[orgSigla].symbols[symKey].cargoItems[cargoName];
    cargoItem.countVago += 1;
    if (emp.valorCC > cargoItem.remun) {
      cargoItem.remun = emp.valorCC;
    }
  }

  return result;
}

/**
 * 2) Agrupa os dados (providos + vagos) por órgão e símbolo
 *    para o relatório “Quantitativo de Cargos (Símbolos)”.
 */
function groupDataByOrgAndSymbol(employees: Employee[], organizations: Organization[]) {
  const result: Record<string, any> = {};

  for (const emp of employees) {
    const sym = emp.cargo.simbolo.trim().toLowerCase();
    if (sym === 'sem_simbolo') {
      continue;
    }
    const orgSigla = emp.secretaria || 'SEM_ORGAO';
    if (!result[orgSigla]) {
      result[orgSigla] = {
        orgFullName: '',
        symbols: {} as Record<string, any>
      };
    }
    const orgFound = organizations.find((o) => o.sigla === orgSigla);
    if (orgFound) {
      result[orgSigla].orgFullName = orgFound.secretaria;
    }

    const symKey = emp.cargo.simbolo.trim();
    if (!result[orgSigla].symbols[symKey]) {
      result[orgSigla].symbols[symKey] = {
        simbolo: symKey,
        remuneracao: 0,
        total: 0,
        provido: 0,
        vago: 0,
        custoProvidos: 0
      };
    }
    const symData = result[orgSigla].symbols[symKey];
    symData.total += 1;
    if (emp.status === 'Provido') {
      symData.provido += 1;
      symData.custoProvidos += emp.valorCC;
      if (emp.valorCC > symData.remuneracao) {
        symData.remuneracao = emp.valorCC;
      }
    } else {
      symData.vago += 1;
    }
  }

  return result;
}

/**
 * 3) Agrupa por classificação 'DIRETA' / 'INDIRETA' (organization.classificacao),
 *    e depois por símbolo.
 */
function groupByClassificationAndSymbol(employees: Employee[], organizations: Organization[]) {
  const result = {
    DIRETA: {
      symbols: {} as Record<string, any>,
      total: 0,
      provido: 0,
      vago: 0,
      custo: 0
    },
    INDIRETA: {
      symbols: {} as Record<string, any>,
      total: 0,
      provido: 0,
      vago: 0,
      custo: 0
    }
  };

  for (const emp of employees) {
    const sym = emp.cargo.simbolo.trim().toLowerCase();
    if (sym === 'sem_simbolo') continue;

    const org = organizations.find((o) => o.sigla === emp.secretaria);
    const classificacao = org?.classificacao || 'DIRETA';

    const bucket = classificacao === 'INDIRETA' ? result.INDIRETA : result.DIRETA;

    bucket.total += 1;
    if (emp.status === 'Provido') {
      bucket.provido += 1;
      bucket.custo += Number(emp.valorCC);
    } else {
      bucket.vago += 1;
    }

    const symKey = emp.cargo.simbolo.trim();
    if (!bucket.symbols[symKey]) {
      bucket.symbols[symKey] = {
        simbolo: symKey,
        remuneracao: 0,
        provido: 0,
        vago: 0,
        custoProvidos: 0,
        orgSet: new Set<string>()
      };
    }
    const symData = bucket.symbols[symKey];

    if (emp.status === 'Provido') {
      symData.provido += 1;
      symData.custoProvidos += emp.valorCC;
      if (emp.valorCC > symData.remuneracao) {
        symData.remuneracao = emp.valorCC;
      }
    } else {
      symData.vago += 1;
    }
    symData.orgSet.add(emp.secretaria);
  }

  return result;
}

export function Reports() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filtros (semelhantes ao Employees)
  const [orgFilter, setOrgFilter] = useState('');
  const [cargoFilter, setCargoFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Qual dos 3 relatórios gerar com os filtros
  const [selectedReport, setSelectedReport] = useState<'vacantByOrg' | 'symbolQuantitative' | 'symbolGeneral'>('vacantByOrg');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const orgs = await fetchOrganizations();
      const poss = await fetchPositions();
      const emps = await fetchEmployees();
      setOrganizations(orgs);
      setPositions(poss);
      setEmployees(emps);
    } catch (error) {
      console.error('Erro ao carregar dados para relatórios:', error);
    }
  }

  /** Aplica os filtros e retorna employees filtrados */
  function getFilteredEmployees() {
    return applyFilters(employees, orgFilter, cargoFilter, symbolFilter, statusFilter);
  }

  // 1) Relatório: Relação de Cargos Vagos por Órgão (cada Órgão em nova página)
  async function handleGenerateVacantReport(filteredEmps: Employee[]) {
    try {
      const grouped = groupVacantByOrgSymbolCargo(filteredEmps, organizations);
      const doc = new jsPDF('p', 'pt', 'a4');

      doc.addImage(logo, 'PNG', 40, 20, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RELAÇÃO DE CARGOS VAGOS POR ÓRGÃO', doc.internal.pageSize.getWidth() / 2, 100, {
        align: 'center'
      });

      let currentY = 140;
      const orgSiglas = Object.keys(grouped).sort();

      for (let i = 0; i < orgSiglas.length; i++) {
        // Se não for o primeiro, forçamos nova página
        if (i > 0) {
          doc.addPage();
          doc.addImage(logo, 'PNG', 40, 20, 60, 60);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('RELAÇÃO DE CARGOS VAGOS POR ÓRGÃO', doc.internal.pageSize.getWidth() / 2, 100, {
            align: 'center'
          });
          currentY = 140;
        }

        const sig = orgSiglas[i];
        const dataOrg = grouped[sig];

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const orgLine = `ÓRGÃO: ${dataOrg.orgFullName} (${sig})`;
        const lines = doc.splitTextToSize(orgLine, 500);
        doc.text(lines, 40, currentY);
        currentY += lines.length * 14;

        const symbolKeys = Object.keys(dataOrg.symbols).sort();
        for (const symKey of symbolKeys) {
          currentY += 10;
          doc.setFont('helvetica', 'bold');
          doc.text(`Símbolo: ${symKey}`, 40, currentY);
          currentY += 20;

          const cargoItems = dataOrg.symbols[symKey].cargoItems;
          const cargoNames = Object.keys(cargoItems).sort();

          const tableBody = cargoNames.map((cn) => {
            const item = cargoItems[cn];
            return [
              item.cargoEfetivo,
              String(item.countVago),
              `R$ ${item.remun.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ];
          });

          (doc as any).autoTable({
            startY: currentY,
            head: [['Cargo Efetivo', 'Qtd. Vago', 'Remuneração']],
            body: tableBody,
            styles: {
              fontSize: 10,
              cellPadding: 4,
              valign: 'middle'
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: 'bold'
            },
            margin: { left: 40, right: 40 }
          });

          const finalY = (doc as any).lastAutoTable.finalY;
          currentY = finalY + 30;
        }
      }

      doc.save('Relatorio-CargosVagos.pdf');
    } catch (error) {
      console.error('Erro ao gerar relatório de cargos vagos:', error);
      alert('Ocorreu um erro ao gerar o relatório de cargos vagos.');
    }
  }

  // 2) Relatório: Quantitativo de Cargos (Símbolos) (cada Órgão em nova página)
  async function handleGenerateSymbolReport(filteredEmps: Employee[]) {
    try {
      const grouped = groupDataByOrgAndSymbol(filteredEmps, organizations);
      const doc = new jsPDF('p', 'pt', 'a4');

      doc.addImage(logo, 'PNG', 40, 20, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(
        'QUANTITATIVO DE CARGOS POR ÓRGÃO/ESTRUTURA PROVIDOS/VAGOS',
        doc.internal.pageSize.getWidth() / 2,
        100,
        { align: 'center' }
      );

      let currentY = 140;
      const orgSiglas = Object.keys(grouped).sort();

      for (let i = 0; i < orgSiglas.length; i++) {
        if (i > 0) {
          doc.addPage();
          doc.addImage(logo, 'PNG', 40, 20, 60, 60);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(
            'QUANTITATIVO DE CARGOS POR ÓRGÃO/ESTRUTURA PROVIDOS/VAGOS',
            doc.internal.pageSize.getWidth() / 2,
            100,
            { align: 'center' }
          );
          currentY = 140;
        }

        const sig = orgSiglas[i];
        const dataOrg = grouped[sig];

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const orgLine = `ÓRGÃO: ${dataOrg.orgFullName} (${sig})`;
        const lines = doc.splitTextToSize(orgLine, 500);
        doc.text(lines, 40, currentY);
        currentY += lines.length * 14;

        let totalOrg = 0;
        let totalProvidoOrg = 0;
        let totalVagoOrg = 0;
        let custoProvidoOrg = 0;

        const symbolKeys = Object.keys(dataOrg.symbols).sort();
        for (const skey of symbolKeys) {
          const item = dataOrg.symbols[skey];
          totalOrg += item.total;
          totalProvidoOrg += item.provido;
          totalVagoOrg += item.vago;
          custoProvidoOrg += item.custoProvidos;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(
          `TOTAL: ${totalOrg}   PROVIDO: ${totalProvidoOrg}   VAGO: ${totalVagoOrg}   CUSTO PROVIDOS: R$ ${custoProvidoOrg.toLocaleString('pt-BR', {
            minimumFractionDigits: 2
          })}`,
          40,
          currentY
        );
        doc.setFont('helvetica', 'normal');
        currentY += 20;

        const tableBody = symbolKeys.map((skey) => {
          const item = dataOrg.symbols[skey];
          return [
            item.simbolo,
            `R$ ${item.remuneracao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            item.total,
            item.provido,
            item.vago,
            `R$ ${item.custoProvidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
        });

        (doc as any).autoTable({
          startY: currentY,
          head: [['SÍMBOLO', 'REMUNERAÇÃO', 'TOTAL', 'PROVIDO', 'VAGO', 'CUSTO PROVIDOS']],
          body: tableBody,
          styles: {
            fontSize: 10,
            cellPadding: 4,
            valign: 'middle'
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          margin: { left: 40, right: 40 }
        });

        const finalY = (doc as any).lastAutoTable.finalY;
        currentY = finalY + 30;
      }

      doc.save('Relatorio-Quantitativo-Cargos.pdf');
    } catch (error) {
      console.error('Erro ao gerar relatório de símbolos:', error);
      alert('Ocorreu um erro ao gerar o relatório.');
    }
  }

  // 3) Relatório: “Quantitativo Geral de Símbolos” (DIRETA vs. INDIRETA)
  async function handleGenerateSymbolGeneralReport(filteredEmps: Employee[]) {
    try {
      const data = groupByClassificationAndSymbol(filteredEmps, organizations);
      const doc = new jsPDF('p', 'pt', 'a4');

      doc.addImage(logo, 'PNG', 40, 20, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('QUANTITATIVO GERAL DE SÍMBOLOS', doc.internal.pageSize.getWidth() / 2, 100, {
        align: 'center'
      });

      let currentY = 140;

      // Função auxiliar para imprimir a “seção” DIRETA ou INDIRETA em NOVA página
      const printSection = (classif: 'DIRETA' | 'INDIRETA', isFirst: boolean) => {
        if (!isFirst) {
          doc.addPage();
          doc.addImage(logo, 'PNG', 40, 20, 60, 60);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('QUANTITATIVO GERAL DE SÍMBOLOS', doc.internal.pageSize.getWidth() / 2, 100, {
            align: 'center'
          });
          currentY = 140;
        }

        // Título da seção
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(classif, 40, currentY);
        currentY += 20;

        const bucket = data[classif];
        const symbolKeys = Object.keys(bucket.symbols).sort();

        const tableBody = symbolKeys.map((symKey) => {
          const item = bucket.symbols[symKey];
          return [
            item.simbolo,
            `R$ ${item.remuneracao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            String(item.orgSet.size), // Qt. Secretarias
            String(item.provido),
            String(item.vago),
            `R$ ${item.custoProvidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
        });

        (doc as any).autoTable({
          startY: currentY,
          head: [
            [
              'Símbolo',
              'Remuneração',
              'Qt. Secretarias',
              'Providos',
              'Vago',
              'Custo p/ Provido'
            ]
          ],
          body: tableBody,
          styles: {
            fontSize: 10,
            cellPadding: 4,
            valign: 'middle'
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          margin: { left: 40, right: 40 }
        });

        const finalY = (doc as any).lastAutoTable.finalY;
        currentY = finalY + 20;

        // Agora imprimimos o total
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(
          `Total de ${classif}: ${bucket.total}   Providos: ${bucket.provido}   Vago: ${bucket.vago}`,
          40,
          currentY
        );
        currentY += 30;
      };

      // Imprime DIRETA em 1 página
      printSection('DIRETA', true);
      // Imprime INDIRETA em nova página
      printSection('INDIRETA', false);

      // Por fim, “Total Geral”
      const totalGeral = data.DIRETA.total + data.INDIRETA.total;
      const totalProvido = data.DIRETA.provido + data.INDIRETA.provido;
      const totalVago = data.DIRETA.vago + data.INDIRETA.vago;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(
        `Total Geral: ${totalGeral}   Providos: ${totalProvido}   Vago: ${totalVago}`,
        40,
        currentY
      );

      doc.save('Relatorio-Quantitativo-Geral-Simbolos.pdf');
    } catch (error) {
      console.error('Erro ao gerar relatório geral de símbolos:', error);
      alert('Ocorreu um erro ao gerar o relatório geral de símbolos.');
    }
  }

  // Decide qual relatório gerar (SEM FILTRO) - clique nos cards
  function handleGenerate(reportType: string) {
    // Usa employees “puros” (sem filtro)
    if (reportType === 'vacantByOrg') {
      handleGenerateVacantReport(employees);
    } else if (reportType === 'symbolQuantitative') {
      handleGenerateSymbolReport(employees);
    } else if (reportType === 'symbolGeneral') {
      handleGenerateSymbolGeneralReport(employees);
    } else {
      alert(`Relatório do tipo "${reportType}" ainda em desenvolvimento.`);
    }
  }

  // Decide qual relatório gerar (COM FILTRO)
  async function handleGenerateWithFilters() {
    // Aplica os filtros
    const filtered = getFilteredEmployees();
    // Chama a função correspondente
    if (selectedReport === 'vacantByOrg') {
      await handleGenerateVacantReport(filtered);
    } else if (selectedReport === 'symbolQuantitative') {
      await handleGenerateSymbolReport(filtered);
    } else {
      await handleGenerateSymbolGeneralReport(filtered);
    }
  }

  // Vamos montar combos básicos para Org, Cargo, Symbol, Status
  // (exemplo simples, sem multi-select)
  // Lista deduplicada
  const orgOptions = Array.from(new Set(organizations.map((o) => o.sigla))).sort();
  const cargoOptions = Array.from(new Set(employees.map((e) => e.cargo.cargo_efetivo))).sort();
  const symbolOptions = Array.from(new Set(employees.map((e) => e.cargo.simbolo))).sort();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Relatórios</h1>

      {/* (1) Seção de Filtros */}
      <div className="bg-white p-4 rounded-md shadow mb-8">
        <h2 className="text-lg font-semibold mb-3">Filtros (Relatórios Personalizados)</h2>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Org */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Órgão</label>
            <select
              className="border rounded p-2"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {orgOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo</label>
            <select
              className="border rounded p-2"
              value={cargoFilter}
              onChange={(e) => setCargoFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {cargoOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Símbolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Símbolo</label>
            <select
              className="border rounded p-2"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {symbolOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              className="border rounded p-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Provido">Provido</option>
              <option value="Vago">Vago</option>
            </select>
          </div>

          {/* Escolha qual relatório */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo Relatório</label>
            <select
              className="border rounded p-2"
              value={selectedReport}
              onChange={(e) =>
                setSelectedReport(e.target.value as 'vacantByOrg' | 'symbolQuantitative' | 'symbolGeneral')
              }
            >
              <option value="vacantByOrg">Cargos Vagos</option>
              <option value="symbolQuantitative">Quantitativo de Cargos</option>
              <option value="symbolGeneral">Quantitativo Geral de Símbolos</option>
            </select>
          </div>

          {/* Botão Gerar Relatório */}
          <div>
            <button
              onClick={handleGenerateWithFilters}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      {/* (2) Relatórios Padrão (sem filtro) */}
      <h2 className="text-lg font-semibold mb-3">Relatórios Padrão</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">{report.title}</h2>
            </div>
            <p className="text-gray-600 mb-4">{report.description}</p>
            <button
              className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => handleGenerate(report.type)}
            >
              Gerar Relatório
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
