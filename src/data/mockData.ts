// src/data/mockData.ts
import {
  Organization,
  Position,
  Employee,
  OrganizationGrowth
} from '../types';

export const organizations: Organization[] = [
  {
    codigo: 1,
    nome: 'Casa Civil do Município de Palmas',
    sigla: 'CACIVIL',
    classificacao: 'DIRETA'
  },
  {
    codigo: 5,
    nome: 'Gabinete do Prefeito',
    sigla: 'GAP',
    classificacao: 'DIRETA'
  },
  {
    codigo: 65,
    nome: 'Instituto de Previdência Social do Município de Palmas',
    sigla: 'PreviPalmas',
    classificacao: 'INDIRETA'
  },
  {
    codigo: 12,
    nome: 'Secretaria Municipal de Educação',
    sigla: 'SEMED',
    classificacao: 'DIRETA'
  },
  {
    codigo: 15,
    nome: 'Secretaria Municipal de Saúde',
    sigla: 'SEMUS',
    classificacao: 'DIRETA'
  },
  {
    codigo: 70,
    nome: 'Agência de Turismo',
    sigla: 'AGTUR',
    classificacao: 'INDIRETA'
  },
];

// Exemplo para relatórios (opcional)
export const organizationGrowth: OrganizationGrowth[] = [
  { mes: 'Jan/2024', total: 15 },
  { mes: 'Fev/2024', total: 16 },
  { mes: 'Mar/2024', total: 18 },
  { mes: 'Abr/2024', total: 18 },
  { mes: 'Mai/2024', total: 20 },
  { mes: 'Jun/2024', total: 22 }
];

/**
 * 23 posições correspondentes à planilha (imagem 2),
 * mas todas associadas ao órgão "CACIVIL".
 */
export const positions: Position[] = [
  { id: '1',  numero: 1,  cargoGenerico: 'Controlador-Geral',                                       simbolo: 'NE' },
  { id: '2',  numero: 1,  cargoGenerico: 'Subcontrolador-Geral',                                    simbolo: 'DAS-1' },
  { id: '3',  numero: 1,  cargoGenerico: 'Chefe de Gabinete',                                       simbolo: 'DAS-4' },
  { id: '4',  numero: 1,  cargoGenerico: 'Chefe da Divisão de Protocolo',                           simbolo: 'FG' },
  { id: '5',  numero: 1,  cargoGenerico: 'Gerente de Administração, Finanças e Planejamento',       simbolo: 'DAS-5' },
  { id: '6',  numero: 1,  cargoGenerico: 'Chefe da Divisão de Planejamento',                        simbolo: 'FG' },
  { id: '7',  numero: 1,  cargoGenerico: 'Chefe da Divisão de Gestão de Pessoas',                   simbolo: 'FG' },
  { id: '8',  numero: 1,  cargoGenerico: 'Superintendente de Controle Interno',                     simbolo: 'DAS-2' },
  { id: '9',  numero: 1,  cargoGenerico: 'Gerente do Portal da Transparência',                      simbolo: 'FG' },
  { id: '10', numero: 1,  cargoGenerico: 'Diretor de Transparência e Integridade',                  simbolo: 'DAS-4' },
  { id: '11', numero: 1,  cargoGenerico: 'Chefe de Divisão de Controle Interno',                    simbolo: 'FG' },
  { id: '12', numero: 1,  cargoGenerico: 'Chefe de Divisão de Controle Interno',                    simbolo: 'FG' },
  { id: '13', numero: 1,  cargoGenerico: 'Chefe de Divisão de Controle Interno',                    simbolo: 'FG' },
  { id: '14', numero: 1,  cargoGenerico: 'Chefe de Divisão de Controle Interno',                    simbolo: 'FG' },
  { id: '15', numero: 1,  cargoGenerico: 'Auditor-Geral',                                           simbolo: 'DAS-2' },
  { id: '16', numero: 1,  cargoGenerico: 'Diretor de Prestação de Contas',                          simbolo: 'DAS-4' },
  { id: '17', numero: 1,  cargoGenerico: 'Corregedor-Geral',                                        simbolo: 'DAS-2' },
  { id: '18', numero: 1,  cargoGenerico: 'Chefe da Divisão de Comissão Permanente Disciplinar',     simbolo: 'FG' },
  { id: '19', numero: 1,  cargoGenerico: 'Chefe da Divisão de Comissão Permanente Disciplinar',     simbolo: 'FG' },
  { id: '20', numero: 1,  cargoGenerico: 'Chefe da Divisão de Comissão Permanente Disciplinar',     simbolo: 'FG' },
  { id: '21', numero: 1,  cargoGenerico: 'Chefe da Divisão de Comissão Permanente Disciplinar',     simbolo: 'FG' },
  { id: '22', numero: 1,  cargoGenerico: 'Ouvidor-Geral',                                           simbolo: 'DAS-2' },
  { id: '23', numero: 1,  cargoGenerico: 'Gerente de Proteção de Dados Pessoais',                   simbolo: 'DAS-5' },
];

/**
 * 23 employees, cada um associado a um cargo acima (positions),
 * alguns providos e outros vagos. Todos ligados à secretaria "CACIVIL".
 */
export const employees: Employee[] = [
  {
    id: 'e1',
    nomeServidor: 'Júlio Edstrom Secundino Santos',
    cargo: positions[0], // Controlador-Geral (NE)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '01/01/2025',
    valorCC: 13000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e2',
    nomeServidor: 'Marcela Tavares Lima',
    cargo: positions[1], // Subcontrolador-Geral (DAS-1)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '01/01/2025',
    valorCC: 9000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e3',
    nomeServidor: 'Alex Sandro Lima Batista',
    cargo: positions[2], // Chefe de Gabinete (DAS-4)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '10/01/2025',
    valorCC: 6000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e4',
    nomeServidor: '', // Vago
    cargo: positions[3], // Chefe da Divisão de Protocolo (FG)
    status: 'Vago',
    redistribuicao: 'Não',
    dtPublicacao: '',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e5',
    nomeServidor: 'Cláudio Moura',
    cargo: positions[4], // Gerente de Administração... (DAS-5)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '10/01/2025',
    valorCC: 5000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e6',
    nomeServidor: '', // Vago
    cargo: positions[5], // Chefe da Divisão de Planejamento (FG)
    status: 'Vago',
    redistribuicao: 'Não',
    dtPublicacao: '',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e7',
    nomeServidor: 'Alyne Vieira Brito',
    cargo: positions[6], // Chefe da Divisão de Gestão de Pessoas (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e8',
    nomeServidor: 'Alexandre Mascarenhas Lima',
    cargo: positions[7], // Superintendente de Controle Interno (DAS-2)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 9000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e9',
    nomeServidor: 'Edivan Bezerra Martins',
    cargo: positions[8], // Gerente do Portal da Transparência (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e10',
    nomeServidor: 'Maiara Cristina Souza de Oliveira',
    cargo: positions[9], // Diretor de Transparência e Integridade (DAS-4)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '10/01/2025',
    valorCC: 6000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e11',
    nomeServidor: 'Hugo Maciel da Silva',
    cargo: positions[10], // Chefe de Divisão de Controle Interno (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e12',
    nomeServidor: 'Elismar Oliveira dos Reis',
    cargo: positions[11], // Chefe de Divisão de Controle Interno (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e13',
    nomeServidor: 'Reginaldo Alves Xavier',
    cargo: positions[12], // Chefe de Divisão de Controle Interno (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e14',
    nomeServidor: '', // Vago
    cargo: positions[13], // Chefe de Divisão de Controle Interno (FG)
    status: 'Vago',
    redistribuicao: 'Não',
    dtPublicacao: '',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e15',
    nomeServidor: 'Jesus Luiz de Assunção Júnior',
    cargo: positions[14], // Auditor-Geral (DAS-2)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '10/01/2025',
    valorCC: 9000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e16',
    nomeServidor: 'Maria Ires Cursino de Oliveira',
    cargo: positions[15], // Diretor de Prestação de Contas (DAS-4)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '10/01/2025',
    valorCC: 6000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e17',
    nomeServidor: 'Marcella Gonçalves do Vale',
    cargo: positions[16], // Corregedor-Geral (DAS-2)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '10/01/2025',
    valorCC: 9000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e18',
    nomeServidor: 'Jackson Carlos Mendes da Silva',
    cargo: positions[17], // Chefe da Divisão de Comissão Permanente Disciplinar (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e19',
    nomeServidor: 'Lucas Sabino da Silva',
    cargo: positions[18], // Chefe da Divisão de Comissão Permanente Disciplinar (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e20',
    nomeServidor: '', // Vago
    cargo: positions[19], // Chefe da Divisão de Comissão Permanente Disciplinar (FG)
    status: 'Vago',
    redistribuicao: 'Não',
    dtPublicacao: '',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e21',
    nomeServidor: 'Rodrigo Gomes Milhomem',
    cargo: positions[20], // Chefe da Divisão de Comissão Permanente Disciplinar (FG)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 1300,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e22',
    nomeServidor: 'Darlington Ribeiro Lima',
    cargo: positions[21], // Ouvidor-Geral (DAS-2)
    status: 'Provido',
    redistribuicao: 'Vago',
    dtPublicacao: '10/01/2025',
    valorCC: 9000,
    secretaria: 'CACIVIL',
  },
  {
    id: 'e23',
    nomeServidor: 'Máira Bogo Bruno',
    cargo: positions[22], // Gerente de Proteção de Dados Pessoais (DAS-5)
    status: 'Provido',
    redistribuicao: 'Não',
    dtPublicacao: '10/01/2025',
    valorCC: 5000,
    secretaria: 'CACIVIL',
  },
];
