/**
 * Import step components extracted from BulkImportPanel
 */
import { Loader2, CheckCircle2, AlertCircle, Upload, X, ArrowRight, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_FIELDS, type ColumnMapping } from "@/hooks/useProductRegistration";
import { cn } from "@/lib/utils";

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

interface MappingStepProps {
  parsedData: ParsedData;
  columnMappings: ColumnMapping[];
  updateMapping: (source: string, target: string) => void;
  isMappingComplete: () => boolean;
  onCancel: () => void;
  onContinue: () => void;
}

export function MappingStep({ parsedData, columnMappings, updateMapping, isMappingComplete, onCancel, onContinue }: MappingStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TableIcon className="h-5 w-5" />Mapeamento de Colunas</CardTitle>
        <CardDescription>Arquivo: {parsedData.fileName} ({parsedData.rows.length} linhas)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coluna do Arquivo</TableHead>
                <TableHead>Exemplo</TableHead>
                <TableHead>Campo no Sistema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columnMappings.map(mapping => {
                const sampleValue = parsedData.rows[0]?.[mapping.sourceColumn];
                const field = PRODUCT_FIELDS.find(f => f.key === mapping.targetField);
                return (
                  <TableRow key={mapping.sourceColumn}>
                    <TableCell className="font-medium">{mapping.sourceColumn}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{String(sampleValue || '-')}</TableCell>
                    <TableCell>
                      <Select value={mapping.targetField || "_ignore"} onValueChange={(v) => updateMapping(mapping.sourceColumn, v === "_ignore" ? "" : v)}>
                        <SelectTrigger className={cn("w-[200px]", field?.required && !mapping.targetField && "border-destructive")}><SelectValue placeholder="Selecionar campo..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_ignore">Ignorar</SelectItem>
                          {PRODUCT_FIELDS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}{f.required && ' *'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}><X className="h-4 w-4 mr-2" />Cancelar</Button>
          <Button onClick={onContinue} disabled={!isMappingComplete()}>Continuar<ArrowRight className="h-4 w-4 ml-2" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface PreviewStepProps {
  parsedData: ParsedData;
  onBack: () => void;
  onStart: () => void;
}

export function PreviewStep({ parsedData, onBack, onStart }: PreviewStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pré-visualização</CardTitle>
        <CardDescription>{parsedData.rows.length} produtos serão importados</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Nome</TableHead><TableHead>SKU</TableHead><TableHead>Preço</TableHead><TableHead>Categoria</TableHead></TableRow></TableHeader>
            <TableBody>
              {parsedData.rows.slice(0, 10).map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{String(row.name || '-')}</TableCell>
                  <TableCell>{String(row.sku || '-')}</TableCell>
                  <TableCell>{String(row.price || '-')}</TableCell>
                  <TableCell>{String(row.category_name || row.category_id || '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {parsedData.rows.length > 10 && <p className="text-center text-sm text-muted-foreground mt-2">e mais {parsedData.rows.length - 10} produtos...</p>}
        </ScrollArea>
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onBack}>Voltar</Button>
          <Button onClick={onStart}><Upload className="h-4 w-4 mr-2" />Iniciar Importação</Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgressStepProps {
  progress: { total: number; processed: number; succeeded: number; failed: number };
}

export function ImportingStep({ progress }: ProgressStepProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Importando Produtos...</CardTitle></CardHeader>
      <CardContent>
        <Progress value={(progress.processed / progress.total) * 100} className="mb-4" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{progress.processed} de {progress.total}</span>
          <span><span className="text-success">{progress.succeeded} sucesso</span> / <span className="text-destructive">{progress.failed} falhas</span></span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResultsStepProps {
  results: { succeeded: number; failed: number; errors: Array<{ row: number; errors: string[] }> };
  onReset: () => void;
}

export function ResultsStep({ results, onReset }: ResultsStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {results.failed === 0 ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-warning" />}
          Importação Concluída
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Badge variant="outline" className="text-success border-success">{results.succeeded} sucesso</Badge>
          {results.failed > 0 && <Badge variant="outline" className="text-destructive border-destructive">{results.failed} falhas</Badge>}
        </div>
        {results.errors.length > 0 && (
          <ScrollArea className="h-[200px] rounded border p-2">
            {results.errors.map((error, index) => (
              <div key={index} className="py-2 border-b last:border-0">
                <p className="font-medium text-sm">Linha {error.row}</p>
                <ul className="list-disc list-inside text-sm text-destructive">{error.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            ))}
          </ScrollArea>
        )}
        <Button onClick={onReset} className="mt-4">Nova Importação</Button>
      </CardContent>
    </Card>
  );
}
