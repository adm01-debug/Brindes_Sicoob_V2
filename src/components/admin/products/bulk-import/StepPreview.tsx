import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportMode } from '@/lib/external-db/batch-import';
import type { ValidationResult, ColumnMapping, SpreadsheetRow } from './types';

interface StepPreviewProps {
  validationResults: ValidationResult[];
  rawData: SpreadsheetRow[];
  mapping: ColumnMapping;
  importMode: ImportMode;
  setImportMode: (mode: ImportMode) => void;
  onBack: () => void;
  onImport: () => void;
}

function mappedRawValue(row: SpreadsheetRow | undefined, mapping: ColumnMapping, field: string): unknown {
  const column = Object.entries(mapping).find(([, mappedField]) => mappedField === field)?.[0];
  if (!row || !column) return undefined;
  return row[column];
}

function previewText(primary: unknown, fallback: unknown): string {
  if (primary) return String(primary);
  if (fallback) return String(fallback);
  return '—';
}

function DatabaseStatus({ result }: { result: ValidationResult }) {
  if (result.existsInDb) return <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Existe</Badge>;
  if (result.valid) return <Badge variant="outline" className="text-[10px] text-success border-success/30">Novo</Badge>;
  return null;
}

function PreviewRow({ result, rawData, mapping }: { result: ValidationResult; rawData: SpreadsheetRow[]; mapping: ColumnMapping }) {
  const rawRow = rawData[result.row - 1];
  return (
    <TableRow className={cn(!result.valid && 'bg-destructive/5')}>
      <TableCell className="text-xs text-muted-foreground">{result.row}</TableCell>
      <TableCell>{result.valid ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
      <TableCell className="font-mono text-xs">{previewText(result.data?.sku, mappedRawValue(rawRow, mapping, 'sku'))}</TableCell>
      <TableCell className="text-sm max-w-[180px] truncate">{previewText(result.data?.name, mappedRawValue(rawRow, mapping, 'name'))}</TableCell>
      <TableCell className="text-sm tabular-nums">{result.data?.sale_price ? `R$ ${Number(result.data.sale_price).toFixed(2)}` : '—'}</TableCell>
      <TableCell><DatabaseStatus result={result} /></TableCell>
      <TableCell>
        {result.errors.length > 0 && <p className="text-[10px] text-destructive">{result.errors.join('; ')}</p>}
        {result.warnings.length > 0 && <p className="text-[10px] text-warning">{result.warnings.join('; ')}</p>}
      </TableCell>
    </TableRow>
  );
}

interface PreviewCounts {
  valid: number;
  invalid: number;
  warnings: number;
  existing: number;
  newProducts: number;
}

function countPreviewRows(results: ValidationResult[]): PreviewCounts {
  return {
    valid: results.filter(result => result.valid).length,
    invalid: results.filter(result => !result.valid).length,
    warnings: results.filter(result => result.warnings.length > 0).length,
    existing: results.filter(result => result.existsInDb).length,
    newProducts: results.filter(result => result.valid && !result.existsInDb).length,
  };
}

function PreviewSummary({ counts }: { counts: PreviewCounts }) {
  return <div className="flex flex-wrap gap-2"><Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {counts.valid} válidos</Badge>{counts.invalid > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {counts.invalid} com erro</Badge>}{counts.warnings > 0 && <Badge variant="secondary" className="gap-1 text-warning"><AlertTriangle className="h-3 w-3" /> {counts.warnings} avisos</Badge>}{counts.existing > 0 && <Badge variant="outline" className="gap-1 text-primary border-primary/30"><RefreshCw className="h-3 w-3" /> {counts.existing} já existem no BD</Badge>}<Badge variant="outline" className="gap-1 text-success border-success/30">+ {counts.newProducts} novos</Badge></div>;
}

function ImportModeSelector({ importMode, setImportMode, newCount }: Pick<StepPreviewProps, "importMode" | "setImportMode"> & { newCount: number }) {
  return <div className="rounded-lg border p-3 space-y-2"><p className="text-sm font-medium">Modo de Importação</p><RadioGroup value={importMode} onValueChange={(value) => setImportMode(value as ImportMode)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="upsert" id="mode-upsert" /><Label htmlFor="mode-upsert" className="text-sm cursor-pointer"><span className="font-medium">Upsert</span><span className="text-muted-foreground ml-1">— insere novos, atualiza existentes (por SKU)</span></Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="insert" id="mode-insert" /><Label htmlFor="mode-insert" className="text-sm cursor-pointer"><span className="font-medium">Inserir</span><span className="text-muted-foreground ml-1">— apenas novos ({newCount}), pula existentes</span></Label></div></RadioGroup></div>;
}

function PreviewTable({ validationResults, rawData, mapping }: Pick<StepPreviewProps, "validationResults" | "rawData" | "mapping">) {
  const headings = ["#", "Status", "SKU", "Nome", "Preço", "BD", "Detalhes"];
  return <ScrollArea className="h-[280px]"><Table><TableHeader><TableRow>{headings.map((heading) => <TableHead key={heading}>{heading}</TableHead>)}</TableRow></TableHeader><TableBody>{validationResults.map(result => <PreviewRow key={result.row} result={result} rawData={rawData} mapping={mapping} />)}</TableBody></Table></ScrollArea>;
}

export function StepPreview({ validationResults, rawData, mapping, importMode, setImportMode, onBack, onImport }: StepPreviewProps) {
  const counts = countPreviewRows(validationResults);
  const importableCount = importMode === 'insert' ? counts.newProducts : counts.valid;

  return (
    <div className="space-y-4">
      <PreviewSummary counts={counts} />
      <ImportModeSelector importMode={importMode} setImportMode={setImportMode} newCount={counts.newProducts} />
      <PreviewTable validationResults={validationResults} rawData={rawData} mapping={mapping} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar ao Mapeamento</Button>
        <Button onClick={onImport} disabled={importableCount === 0}>
          Importar {importableCount} produto(s)<ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
