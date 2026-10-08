// src/utils/excelExport.ts

import {  formatDateTime } from '@/lib/date-utils';

const getXLSX = () => import('@e965/xlsx');

/**
 * Configuração de exportação Excel
 */
export interface ExcelExportConfig<T = Record<string, unknown>> {
  /** Nome do arquivo (sem extensão) */
  filename: string;
  /** Nome da planilha */
  sheetName?: string;
  /** Colunas a exportar */
  columns: ExcelColumn<T>[];
  /** Dados a exportar */
  data: T[];
  /** Incluir timestamp no nome do arquivo */
  includeTimestamp?: boolean;
}

/**
 * Definição de coluna
 */
export interface ExcelColumn<T = Record<string, unknown>> {
  /** Chave do campo no objeto de dados */
  key: string;
  /** Cabeçalho da coluna */
  header: string;
  /** Largura da coluna (em caracteres) */
  width?: number;
  /** Função de formatação customizada */
  format?: (value: unknown, row: T) => string | number;
}

/**
 * Exporta dados para arquivo Excel (.xlsx)
 * 
 * @example
 * ```typescript
 * exportToExcel({
 *   filename: 'orcamentos',
 *   sheetName: 'Orçamentos 2025',
 *   columns: [
 *     { key: 'quote_number', header: 'Número', width: 15 },
 *     { key: 'client_name', header: 'Cliente', width: 30 },
 *     { key: 'total', header: 'Valor Total', format: (v) => `R$ ${v.toFixed(2)}` },
 *     { key: 'created_at', header: 'Data', format: (v) => formatDate(v) }
 *   ],
 *   data: quotes,
 *   includeTimestamp: true
 * });
 * ```
 */
export async function exportToExcel<T extends Record<string, unknown> = Record<string, unknown>>(config: ExcelExportConfig<T>): Promise<void> {
  const {
    filename,
    sheetName = 'Dados',
    columns,
    data,
    includeTimestamp = true
  } = config;

  try {
    const XLSX = await getXLSX();
    // 1. Preparar dados formatados
    const formattedData = data.map((row) => {
      const formattedRow: Record<string, string | number> = {};
      
      columns.forEach((col) => {
        const value = getNestedValue(row, col.key);
        
        if (col.format) {
          // Aplicar formatação customizada
          formattedRow[col.header] = col.format(value, row);
        } else if (value instanceof Date) {
          // Formatar datas automaticamente
          formattedRow[col.header] = formatDateTime(value);
        } else if (typeof value === 'number') {
          // Manter números como números
          formattedRow[col.header] = value;
        } else if (value === null || value === undefined) {
          // Valores vazios
          formattedRow[col.header] = '';
        } else {
          // Converter para string
          formattedRow[col.header] = String(value);
        }
      });
      
      return formattedRow;
    });

    // 2. Criar workbook e worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 3. Configurar larguras das colunas
    const colWidths = columns.map((col) => ({
      wch: col.width || 20
    }));
    worksheet['!cols'] = colWidths;

    // 4. Aplicar estilos no cabeçalho (se possível)
    // Nota: XLSX gratuito tem suporte limitado a estilos
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!worksheet[address]) continue;
      
      // Fonte em negrito para cabeçalho (se biblioteca suportar)
      if (worksheet[address].s) {
        worksheet[address].s.font = { bold: true };
      }
    }

    // 5. Gerar nome do arquivo
    const timestamp = includeTimestamp 
      ? `_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}` 
      : '';
    const fullFilename = `${filename}${timestamp}.xlsx`;

    // 6. Fazer download
    XLSX.writeFile(workbook, fullFilename);
  } catch {
    throw new Error('Falha ao exportar arquivo Excel');
  }
}

/**
 * Exporta múltiplas planilhas em um único arquivo
 */
export async function exportMultipleSheets<T extends Record<string, unknown> = Record<string, unknown>>(
  filename: string,
  sheets: Array<{
    sheetName: string;
    columns: ExcelColumn<T>[];
    data: T[];
  }>,
  includeTimestamp = true
): Promise<void> {
  try {
    const XLSX = await getXLSX();
    const workbook = XLSX.utils.book_new();

    sheets.forEach(({ sheetName, columns, data }) => {
      // Formatar dados
      const formattedData = data.map((row) => {
        const formattedRow: Record<string, string | number> = {};
        columns.forEach((col) => {
          const value = getNestedValue(row, col.key);
          formattedRow[col.header] = col.format 
            ? col.format(value, row)
            : formatValue(value);
        });
        return formattedRow;
      });

      // Criar worksheet
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Configurar larguras
      const colWidths = columns.map((col) => ({ wch: col.width || 20 }));
      worksheet['!cols'] = colWidths;

      // Adicionar ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Gerar arquivo
    const timestamp = includeTimestamp 
      ? `_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}` 
      : '';
    const fullFilename = `${filename}${timestamp}.xlsx`;

    XLSX.writeFile(workbook, fullFilename);
  } catch {
    throw new Error('Falha ao exportar arquivo Excel');
  }
}

/**
 * Utilitários auxiliares
 */

// Pega valor aninhado de objeto (ex: 'client.name')
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, prop) => {
    if (typeof current !== 'object' || current === null) return undefined;
    return (current as Record<string, unknown>)[prop];
  }, obj);
}

// Formata valor automaticamente
function formatValue(value: unknown): string | number {
  if (value instanceof Date) {
    return formatDateTime(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Formata moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata porcentagem
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formata status com emoji
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': '📝 Rascunho',
    'sent': '📤 Enviado',
    'approved': '✅ Aprovado',
    'rejected': '❌ Rejeitado',
    'expired': '⏰ Expirado',
    'pending': '⏳ Pendente',
    'processing': '🔄 Processando',
    'completed': '✅ Concluído',
    'cancelled': '🚫 Cancelado'
  };
  
  return statusMap[status] || status;
}
