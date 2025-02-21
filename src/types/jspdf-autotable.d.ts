// src/types/jspdf-autotable.d.ts
import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: JSPdfAutoTableOptions) => jsPDF;
  }
}

interface JSPdfAutoTableOptions {
  startY?: number;
  head?: any[];
  body?: any[];
  columns?: { header: string; dataKey: string }[];
  styles?: any;
  headStyles?: any;
  foot?: any[];
  footStyles?: any;
  margin?: { left?: number; right?: number; top?: number; bottom?: number };
  // ... e outras propriedades que você utilizar
}
