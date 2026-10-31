/**
 * BulkImportPanel — Refactored to use useBulkImportFile hook.
 * UI-only: delegates file parsing/mapping logic to the hook.
 */
import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileUp, Table as TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductRegistration } from '@/hooks/useProductRegistration';
import { useBulkImportFile } from '@/hooks/useBulkImportFile';
import { MappingStep, PreviewStep, ImportingStep, ResultsStep } from './BulkImportSteps';
import { cn } from '@/lib/utils';

type BulkImportState = ReturnType<typeof useBulkImportFile>;
type ImportResults = {
  succeeded: number;
  failed: number;
  errors: Array<{ row: number; errors: string[] }>;
};

function UploadModePanel({ form, generateTemplate }: { form: BulkImportState; generateTemplate: () => void }) {
  if (form.step !== 'upload') return null;
  return (
    <Tabs value={form.importMode} onValueChange={(value) => form.setImportMode(value as 'template' | 'custom')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="template"><FileSpreadsheet className="h-4 w-4 mr-2" />Usar Template</TabsTrigger>
        <TabsTrigger value="custom"><TableIcon className="h-4 w-4 mr-2" />Mapeamento Manual</TabsTrigger>
      </TabsList>
      <TabsContent value="template" className="mt-4">
        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertTitle>Template Recomendado</AlertTitle>
          <AlertDescription>
            Baixe nosso template CSV/XLSX com todos os campos pré-configurados.
            Preencha os dados e faça o upload para importação rápida.
          </AlertDescription>
        </Alert>
        <Button onClick={generateTemplate} variant="outline" className="mt-4">
          <Download className="h-4 w-4 mr-2" />Baixar Template CSV
        </Button>
      </TabsContent>
      <TabsContent value="custom" className="mt-4">
        <Alert>
          <TableIcon className="h-4 w-4" />
          <AlertTitle>Mapeamento Personalizado</AlertTitle>
          <AlertDescription>
            Faça upload de qualquer planilha e mapeie as colunas manualmente para os campos do produto.
          </AlertDescription>
        </Alert>
      </TabsContent>
    </Tabs>
  );
}

function UploadArea({ form }: { form: BulkImportState }) {
  if (form.step !== 'upload') return null;
  return (
    <Card
      className={cn("border-2 border-dashed transition-colors cursor-pointer", form.isDragging && "border-primary bg-primary/5")}
      onDragOver={(event) => { event.preventDefault(); form.setIsDragging(true); }}
      onDragLeave={() => form.setIsDragging(false)}
      onDrop={form.handleDrop}
      onClick={() => form.fileInputRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Arraste seu arquivo aqui</p>
        <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mt-4">Formatos suportados: CSV, XLSX, XLS</p>
        <input ref={form.fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={form.handleFileSelect} />
      </CardContent>
    </Card>
  );
}

function MappingPanel({ form, onReset }: { form: BulkImportState; onReset: () => void }) {
  if (form.step !== 'mapping' || !form.parsedData) return null;
  return (
    <MappingStep
      parsedData={form.parsedData}
      columnMappings={form.columnMappings}
      updateMapping={form.updateMapping}
      isMappingComplete={form.isMappingComplete}
      onCancel={onReset}
      onContinue={() => form.setStep('preview')}
    />
  );
}

function PreviewPanel({ form, onStart }: { form: BulkImportState; onStart: () => void }) {
  if (form.step !== 'preview' || !form.parsedData) return null;
  return (
    <PreviewStep
      parsedData={form.parsedData}
      onBack={() => form.setStep(form.importMode === 'custom' ? 'mapping' : 'upload')}
      onStart={onStart}
    />
  );
}

function ImportStatusPanels({
  form,
  progress,
  results,
  onReset,
}: {
  form: BulkImportState;
  progress: ReturnType<typeof useProductRegistration>['importProgress'];
  results: ImportResults | null;
  onReset: () => void;
}) {
  if (form.step === 'importing' && progress) return <ImportingStep progress={progress} />;
  if (form.step === 'results' && results) return <ResultsStep results={results} onReset={onReset} />;
  return null;
}

export function BulkImportPanel() {
  const {
    generateTemplate,
    importProducts,
    importProgress,
    loadReferenceData,
  } = useProductRegistration();

  const form = useBulkImportFile();
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  useEffect(() => { loadReferenceData(); }, [loadReferenceData]);

  const startImport = async () => {
    form.setStep('importing');
    const data = form.transformData();
    const results = await importProducts(data);
    setImportResults(results);
    form.setStep('results');
  };

  const handleReset = () => {
    form.resetImport();
    setImportResults(null);
  };

  return (
    <div className="space-y-6">
      <UploadModePanel form={form} generateTemplate={generateTemplate} />
      <UploadArea form={form} />
      <MappingPanel form={form} onReset={handleReset} />
      <PreviewPanel form={form} onStart={startImport} />
      <ImportStatusPanels form={form} progress={importProgress} results={importResults} onReset={handleReset} />
    </div>
  );
}
