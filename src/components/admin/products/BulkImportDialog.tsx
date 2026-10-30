/**
 * BulkImportDialog — Sistema robusto de importação em massa de produtos.
 * Refatorado em sub-componentes para manutenibilidade.
 */
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  type ImportMode, type ImportRow, type BatchImportProgress, type BatchImportResult,
  checkExistingSkus, executeBatchImport,
} from '@/lib/external-db/batch-import';
import { TARGET_FIELDS, type Step, type ColumnMapping, type SpreadsheetCell, type SpreadsheetRow, type ValidationResult } from "./bulk-import/types";
import { StepUpload } from './bulk-import/StepUpload';
import { StepMapping } from './bulk-import/StepMapping';
import { StepPreview } from './bulk-import/StepPreview';
import { StepImporting, StepComplete } from './bulk-import/StepComplete';
import { logger } from '@/lib/logger';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const STEP_DESCRIPTIONS: Record<Step, string> = {
  upload: 'Envie um arquivo CSV ou Excel com os dados dos produtos',
  mapping: 'Mapeie as colunas do arquivo para os campos do sistema',
  preview: 'Revise os dados e escolha o modo de importação',
  importing: 'Importando produtos em lotes...',
  complete: 'Importação concluída',
};

function toStringOrNull(value: SpreadsheetCell): string | null {
  return value === undefined || value === null || value === '' ? null : String(value);
}

function toNumberOrNull(value: SpreadsheetCell): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBooleanOrNull(value: SpreadsheetCell): boolean | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'sim', 'yes', 's', 'y', 'x'].includes(String(value).toLowerCase().trim());
}

const NUMERIC_FIELDS = [
  'cost_price', 'stock_quantity', 'min_quantity', 'height_cm', 'width_cm', 'length_cm',
  'diameter_cm', 'weight_g', 'capacity_ml', 'box_width_mm', 'box_height_mm',
  'box_length_mm', 'box_weight_kg', 'box_quantity', 'box_volume_cm3',
] as const;
const BOOLEAN_FIELDS = ['is_active', 'is_featured', 'is_bestseller', 'is_new', 'is_on_sale', 'is_kit', 'has_commercial_packaging'] as const;
const URL_FIELDS = ['image_url', 'primary_image_url', 'og_image_url', 'box_image'] as const;

function fieldLabel(field: string): string {
  return TARGET_FIELDS.find((candidate) => candidate.key === field)?.label ?? field;
}

function mapSpreadsheetRow(row: SpreadsheetRow, mapping: ColumnMapping): SpreadsheetRow {
  const mapped: SpreadsheetRow = {};
  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (targetField) mapped[targetField] = row[sourceColumn];
  }
  return mapped;
}

function validateRequiredFields(mapped: SpreadsheetRow, requiredFields: string[]): string[] {
  return requiredFields.flatMap((field) => {
    const value = mapped[field];
    return value === undefined || value === null || String(value).trim() === ''
      ? [`"${fieldLabel(field)}" obrigatório`]
      : [];
  });
}

function normalizeSalePrice(mapped: SpreadsheetRow, errors: string[]) {
  if (mapped.sale_price === undefined || mapped.sale_price === '') return;
  const price = Number.parseFloat(String(mapped.sale_price).replace(',', '.'));
  if (Number.isNaN(price) || price < 0) errors.push('Preço inválido');
  else mapped.sale_price = price;
}

function normalizeNumericFields(mapped: SpreadsheetRow, warnings: string[]) {
  for (const field of NUMERIC_FIELDS) {
    if (mapped[field] === undefined || mapped[field] === '') continue;
    const value = Number.parseFloat(String(mapped[field]).replace(',', '.'));
    if (Number.isNaN(value)) {
      warnings.push(`"${fieldLabel(field)}" ignorado (inválido)`);
      mapped[field] = null;
    } else mapped[field] = value;
  }
}

function normalizeBooleanFields(mapped: SpreadsheetRow) {
  for (const field of BOOLEAN_FIELDS) {
    if (mapped[field] !== undefined && mapped[field] !== '') mapped[field] = toBooleanOrNull(mapped[field]);
  }
}

function validateUrlFields(mapped: SpreadsheetRow): string[] {
  return URL_FIELDS.flatMap((field) => {
    const value = mapped[field];
    if (!value || typeof value !== 'string') return [];
    const url = value.trim();
    return url && !url.startsWith('http://') && !url.startsWith('https://')
      ? [`"${fieldLabel(field)}" não parece ser uma URL válida`]
      : [];
  });
}

function normalizeIdentity(mapped: SpreadsheetRow, errors: string[], warnings: string[]): string {
  const sku = mapped.sku ? String(mapped.sku).trim() : '';
  if (sku.length > 50) errors.push('SKU excede 50 caracteres');
  if (mapped.name && String(mapped.name).length > 300) {
    warnings.push('Nome truncado em 300 caracteres');
    mapped.name = String(mapped.name).substring(0, 300);
  }
  return sku;
}

function buildImportRow(mapped: SpreadsheetRow, sku: string): ImportRow {
  const isActive = toBooleanOrNull(mapped.is_active) ?? true;
  return {
    sku, name: String(mapped.name).trim(), sale_price: toNumberOrNull(mapped.sale_price) ?? 0,
    description: toStringOrNull(mapped.description), short_description: toStringOrNull(mapped.short_description),
    meta_description: toStringOrNull(mapped.meta_description), brand: toStringOrNull(mapped.brand),
    supplier_reference: toStringOrNull(mapped.supplier_reference), supplier_id: toStringOrNull(mapped.supplier_id),
    cost_price: toNumberOrNull(mapped.cost_price), stock_quantity: toNumberOrNull(mapped.stock_quantity) ?? 0,
    min_quantity: toNumberOrNull(mapped.min_quantity) ?? 1, category_id: toStringOrNull(mapped.category_id),
    main_category_id: toStringOrNull(mapped.main_category_id), height_cm: toNumberOrNull(mapped.height_cm),
    width_cm: toNumberOrNull(mapped.width_cm), length_cm: toNumberOrNull(mapped.length_cm),
    diameter_cm: toNumberOrNull(mapped.diameter_cm), weight_g: toNumberOrNull(mapped.weight_g),
    capacity_ml: toNumberOrNull(mapped.capacity_ml), packing_type: toStringOrNull(mapped.packing_type),
    packing_classification: toStringOrNull(mapped.packing_classification),
    has_commercial_packaging: toBooleanOrNull(mapped.has_commercial_packaging),
    repacking_type: toStringOrNull(mapped.repacking_type), packaging_context: toStringOrNull(mapped.packaging_context),
    box_width_mm: toNumberOrNull(mapped.box_width_mm), box_height_mm: toNumberOrNull(mapped.box_height_mm),
    box_length_mm: toNumberOrNull(mapped.box_length_mm), box_weight_kg: toNumberOrNull(mapped.box_weight_kg),
    box_quantity: toNumberOrNull(mapped.box_quantity), box_volume_cm3: toNumberOrNull(mapped.box_volume_cm3),
    box_image: toStringOrNull(mapped.box_image), image_url: toStringOrNull(mapped.image_url),
    primary_image_url: toStringOrNull(mapped.primary_image_url) ?? toStringOrNull(mapped.image_url),
    og_image_url: toStringOrNull(mapped.og_image_url), is_active: isActive, active: isActive,
    is_featured: toBooleanOrNull(mapped.is_featured), is_bestseller: toBooleanOrNull(mapped.is_bestseller),
    is_new: toBooleanOrNull(mapped.is_new), is_on_sale: toBooleanOrNull(mapped.is_on_sale),
    is_kit: toBooleanOrNull(mapped.is_kit), gender: toStringOrNull(mapped.gender),
    dimensions: toStringOrNull(mapped.dimensions),
  };
}

interface SpreadsheetValidationContext {
  mapping: ColumnMapping;
  requiredFields: string[];
  seenSkus: Set<string>;
}

function validateSpreadsheetRow(row: SpreadsheetRow, index: number, context: SpreadsheetValidationContext): ValidationResult {
  const { mapping, requiredFields, seenSkus } = context;
  const mapped = mapSpreadsheetRow(row, mapping);
  const errors = validateRequiredFields(mapped, requiredFields);
  const warnings = validateUrlFields(mapped);
  normalizeSalePrice(mapped, errors);
  normalizeNumericFields(mapped, warnings);
  normalizeBooleanFields(mapped);
  const sku = normalizeIdentity(mapped, errors, warnings);
  if (seenSkus.has(sku) && sku) warnings.push('SKU duplicado dentro do arquivo');
  if (sku) seenSkus.add(sku);
  return { row: index + 1, valid: errors.length === 0, errors, warnings, data: errors.length === 0 ? buildImportRow(mapped, sku) : undefined, existsInDb: false };
}

async function markExistingSkus(results: ValidationResult[]) {
  const uniqueSkus = [...new Set(results.flatMap((result) => result.data?.sku ? [result.data.sku] : []))];
  if (uniqueSkus.length === 0) return;
  const existing = await checkExistingSkus(uniqueSkus);
  for (const result of results) {
    if (result.data?.sku && existing.has(result.data.sku)) result.existsInDb = true;
  }
}

function hasImportData(result: ValidationResult): result is ValidationResult & { data: ImportRow } {
  return result.valid && Boolean(result.data);
}

export function BulkImportDialog({ open, onOpenChange, onComplete }: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rawData, setRawData] = useState<SpreadsheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [progress, setProgress] = useState<BatchImportProgress | null>(null);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);
  const [isCheckingSkus, setIsCheckingSkus] = useState(false);

  const reset = useCallback(() => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setFileName('');
    setMapping({});
    setValidationResults([]);
    setProgress(null);
    setImportResult(null);
    setIsCheckingSkus(false);
  }, []);

  // ── Upload complete handler ──
  const handleFileProcessed = useCallback((h: string[], rows: SpreadsheetRow[], name: string, m: ColumnMapping) => {
    setHeaders(h);
    setRawData(rows);
    setFileName(name);
    setMapping(m);
    setStep('mapping');
  }, []);

  // ── Validate data + check existing SKUs ──
  const validateData = useCallback(async () => {
    setIsCheckingSkus(true);
    const requiredFields = TARGET_FIELDS.filter((field) => field.required).map((field) => field.key);
    const seenSkus = new Set<string>();
    const context = { mapping, requiredFields, seenSkus };
    const results = rawData.map((row, index) => validateSpreadsheetRow(row, index, context));
    try {
      await markExistingSkus(results);
    } catch (error) {
      logger.warn('SKU dedup check failed:', error);
      toast.warning('Não foi possível verificar SKUs existentes');
    }
    setIsCheckingSkus(false);
    setValidationResults(results);
    setStep('preview');
  }, [rawData, mapping]);

  // ── Execute Import ──
  const executeImport = useCallback(async () => {
    let rowsToImport: ImportRow[];
    if (importMode === 'insert') {
      rowsToImport = validationResults.filter(hasImportData).filter((result) => !result.existsInDb).map((result) => result.data);
    } else {
      rowsToImport = validationResults.filter(hasImportData).map((result) => result.data);
    }
    if (rowsToImport.length === 0) { toast.error('Nenhuma linha para importar'); return; }

    setStep('importing');
    const result = await executeBatchImport(rowsToImport, importMode, (p) => setProgress({ ...p }));
    setImportResult(result);
    setStep('complete');
    if (result.succeeded > 0) { toast.success(`${result.succeeded} produto(s) importado(s)!`); onComplete(); }
    if (result.failed > 0) { toast.error(`${result.failed} produto(s) falharam`); }
  }, [validationResults, importMode, onComplete]);

  const requiredMapped = TARGET_FIELDS.filter(f => f.required).every(f => Object.values(mapping).includes(f.key));
  const invalidCount = validationResults.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        {(<DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importação em Massa
          </DialogTitle>
          <DialogDescription>{step === 'mapping' ? `Mapeie as colunas de "${fileName}" para os campos do sistema` : STEP_DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>)}

        {/* Step indicators */}
        <div className="flex items-center gap-1 text-xs">
          {(['upload', 'mapping', 'preview', 'importing'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              <Badge
                variant={step === s || (step === 'complete' && s === 'importing') ? 'default' : 'outline'}
                className={cn(
                  'text-[10px]',
                  ['mapping', 'preview', 'importing', 'complete'].indexOf(step) > ['upload', 'mapping', 'preview', 'importing'].indexOf(s) && 'bg-success/20 text-success border-success/30'
                )}
              >
                {s === 'upload' && '1. Upload'}
                {s === 'mapping' && '2. Mapear'}
                {s === 'preview' && '3. Validar'}
                {s === 'importing' && '4. Importar'}
              </Badge>
            </div>
          ))}
        </div>

        {(step === 'upload' && <StepUpload onFileProcessed={handleFileProcessed} />)}

        {(step === 'mapping' && (
          <StepMapping
            headers={headers}
            rawData={rawData}
            mapping={mapping}
            setMapping={setMapping}
            requiredMapped={requiredMapped}
            isCheckingSkus={isCheckingSkus}
            onBack={() => setStep('upload')}
            onValidate={validateData}
          />
        ))}

        {(step === 'preview' && (
          <StepPreview
            validationResults={validationResults}
            rawData={rawData}
            mapping={mapping}
            importMode={importMode}
            setImportMode={setImportMode}
            onBack={() => setStep('mapping')}
            onImport={executeImport}
          />
        ))}

        {(step === 'importing' && progress && <StepImporting progress={progress} />)}

        {(step === 'complete' && importResult && (
          <StepComplete
            importResult={importResult}
            importMode={importMode}
            invalidCount={invalidCount}
            validationResults={validationResults}
            rawData={rawData}
            onReset={reset}
            onClose={() => { reset(); onOpenChange(false); }}
          />
        ))}
      </DialogContent>
    </Dialog>
  );
}
