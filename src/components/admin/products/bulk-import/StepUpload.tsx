import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_ROWS, TARGET_FIELDS, TEMPLATE_EXAMPLES, ALIAS_MAP, type ColumnMapping, type SpreadsheetRow } from './types';

interface StepUploadProps {
  onFileProcessed: (headers: string[], rows: SpreadsheetRow[], fileName: string, mapping: ColumnMapping) => void;
}

const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; }
    } else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; } else { current += char; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const firstLine = text.split('\n')[0] ?? '';
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0] ?? '', delimiter);
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
  return { headers, rows };
}

async function parseXLSX(file: File) {
  const XLSX = await import('@e965/xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return null;
  const sheet = wb.Sheets[firstSheetName];
  if (!sheet) return null;
  const json = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: '' });
  if (json.length === 0) return null;
  return { headers: Object.keys(json[0] ?? {}), rows: json };
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function parseUploadedFile(file: File): Promise<{ headers: string[]; rows: SpreadsheetRow[] } | null> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'csv') return parseCSV(await file.text());
  if (['xlsx', 'xls'].includes(extension)) return parseXLSX(file);
  toast.error('Formato não suportado. Use CSV, XLSX ou XLS.');
  return null;
}

function inferColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const column of headers) {
    const target = ALIAS_MAP[normalizeStr(column)];
    if (target && !Object.values(mapping).includes(target)) mapping[column] = target;
  }
  return mapping;
}

function downloadTemplateCSV() {
  const labels = TARGET_FIELDS.map(field => `${field.label}${field.required ? ' *' : ''}`);
  const example = TARGET_FIELDS.map(field => TEMPLATE_EXAMPLES[field.key] ?? '');
  downloadBlob('\uFEFF' + [labels.join(';'), example.join(';')].join('\n'), 'template_importacao_produtos.csv', 'text/csv;charset=utf-8;');
  toast.success('Template CSV baixado!');
}

async function downloadTemplateXLSX() {
  try {
    const XLSX = await import('@e965/xlsx');
    const rows = [TARGET_FIELDS.map(field => `${field.label}${field.required ? ' *' : ''}`), TARGET_FIELDS.map(field => TEMPLATE_EXAMPLES[field.key] ?? '')];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = TARGET_FIELDS.map((_, index) => ({ wch: index < 3 ? 20 : 15 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, 'template_importacao_produtos.xlsx');
    toast.success('Template Excel baixado!');
  } catch { toast.error('Erro ao gerar template Excel'); }
}

export function StepUpload({ onFileProcessed }: StepUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const parsed = await parseUploadedFile(file);
      if (!parsed) { toast.error('Planilha vazia ou sem abas'); return; }
      const { headers: parsedHeaders, rows: parsedRows } = parsed;

      if (parsedRows.length > MAX_ROWS) {
        toast.error(`Arquivo excede o limite de ${MAX_ROWS.toLocaleString()} linhas`);
        return;
      }
      if (parsedRows.length === 0) { toast.error('Nenhuma linha de dados encontrada'); return; }

      onFileProcessed(parsedHeaders, parsedRows, file.name, inferColumnMapping(parsedHeaders));
      toast.success(`${file.name} carregado — ${parsedRows.length.toLocaleString()} linhas`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Erro ao ler o arquivo. Verifique o formato.');
    }
  }, [onFileProcessed]);

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}
      >
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">Arraste um arquivo aqui ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mt-1">CSV, XLSX ou XLS • Máximo {MAX_ROWS.toLocaleString()} linhas</p>
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplateCSV}>
          <Download className="h-4 w-4 mr-2" />Template CSV
        </Button>
        <Button variant="outline" size="sm" onClick={downloadTemplateXLSX}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />Template Excel
        </Button>
      </div>
    </div>
  );
}
