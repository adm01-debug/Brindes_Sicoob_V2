
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUp, FileDown, AlertCircle, Loader2, Table as TableIcon, Download } from "lucide-react";
import * as XLSX from '@e965/xlsx';
import Papa from 'papaparse';
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ImportExportManagerProps<T extends Record<string, unknown>> {
  entityName: string;
  onImport: (data: T[]) => Promise<void>;
  onExport: () => void;
  templateData?: T[];
  expectedColumns: { key: string, label: string, required?: boolean, type?: 'string' | 'number' | 'email' | 'boolean' }[];
}

type ColumnDefinition = ImportExportManagerProps<Record<string, unknown>>["expectedColumns"][number];
type ImportError = { row: number; message: string };

function validateCell(rowNumber: number, column: ColumnDefinition, value: unknown, errors: ImportError[]) {
  const empty = value === undefined || value === null || value === '';
  if (column.required && empty) errors.push({ row: rowNumber, message: `Campo "${column.label}" é obrigatório.` });
  if (empty) return;
  if (column.type === 'email' && !String(value).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push({ row: rowNumber, message: `Email inválido: ${String(value)}` });
  }
  if (column.type === 'number' && Number.isNaN(Number(value))) {
    errors.push({ row: rowNumber, message: `Valor numérico inválido: ${String(value)}` });
  }
}

function validationErrors<T extends Record<string, unknown>>(data: T[], columns: ColumnDefinition[]): ImportError[] {
  const errors: ImportError[] = [];
  data.forEach((row, index) => columns.forEach((column) => validateCell(index + 1, column, row[column.key] || row[column.label], errors)));
  return errors;
}

function parseExcel<T extends Record<string, unknown>>(file: File, onData: (data: T[]) => void, onDone: () => void) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(event.target?.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('Planilha vazia ou sem abas');
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error('Planilha vazia ou sem abas');
      onData(XLSX.utils.sheet_to_json<T>(sheet));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar arquivo Excel");
    } finally {
      onDone();
    }
  };
  reader.readAsBinaryString(file);
}

function parseCsv<T extends Record<string, unknown>>(file: File, onData: (data: T[]) => void, onDone: () => void) {
  Papa.parse<T>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => { onData(results.data); onDone(); },
    error: (error) => { toast.error(`Erro ao processar CSV: ${error.message}`); onDone(); },
  });
}

function downloadFile(format: 'xlsx' | 'csv', entityName: string, data: Record<string, unknown>[]) {
  if (format === 'csv') {
    const blob = new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `${entityName}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), entityName);
  XLSX.writeFile(workbook, `${entityName}_template.xlsx`);
}

function ImportFooter({ errorCount, processing, rowCount, onCancel, onConfirm }: {
  errorCount: number; processing: boolean; rowCount: number; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <DialogFooter>
      <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      <Button onClick={onConfirm} disabled={rowCount === 0 || errorCount > 0 || processing}>
        {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar Importação
      </Button>
    </DialogFooter>
  );
}

export function ImportExportManager<T extends Record<string, unknown>>({
  entityName,
  onImport,
  onExport,
  templateData,
  expectedColumns
}: ImportExportManagerProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<T[]>([]);
  const [errors, setErrors] = useState<{ row: number, message: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateData = (data: T[]) => {
    setErrors(validationErrors(data, expectedColumns));
    setPreviewData(data.map((row) => ({ ...row })));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    if (file.name.endsWith('.csv')) {
      parseCsv(file, validateData, () => setIsProcessing(false));
    } else {
      parseExcel(file, validateData, () => setIsProcessing(false));
    }
  };

  const handleConfirmImport = async () => {
    if (errors.length > 0) {
      toast.error("Corrija os erros antes de importar.");
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(previewData);
      toast.success(`${entityName} importados com sucesso!`);
      setIsOpen(false);
      setPreviewData([]);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao importar dados.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const data = templateData || [
      expectedColumns.reduce((acc, col) => ({ ...acc, [col.label]: '' }), {})
    ];
    downloadFile(format, entityName, data);
  };

  return (
    <div className="flex gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileUp className="h-4 w-4" /> Importar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar {entityName}</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo CSV ou Excel (xlsx). Certifique-se de que as colunas correspondem ao esperado.
            </DialogDescription>
          </DialogHeader>

          {(<div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
                  Selecionar Arquivo
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                />
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => downloadTemplate('xlsx')} className="gap-2">
                    <Download className="h-4 w-4" /> Template (XLSX)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')} className="gap-2">
                    <Download className="h-4 w-4" /> Template (CSV)
                  </Button>
                </div>
              </div>
              {previewData.length > 0 && (
                <Badge variant={errors.length > 0 ? "destructive" : "default"}>
                  {previewData.length} linhas encontradas • {errors.length} erros
                </Badge>
              )}
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erros de Validação</AlertTitle>
                <AlertDescription className="max-h-24 overflow-y-auto">
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.slice(0, 5).map((err, i) => (
                      <li key={i}>Linha {err.row}: {err.message}</li>
                    ))}
                    {errors.length > 5 && <li>E mais {errors.length - 5} erros...</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {previewData.length > 0 ? (
              <div className="flex-1 border rounded-md overflow-hidden bg-muted/30">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {expectedColumns.map((col, i) => (
                          <TableHead key={i}>{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          {expectedColumns.map((col, j) => (
                            <TableCell key={j} className="max-w-[200px] truncate">
                              {String(row[col.key] || row[col.label] || "-")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewData.length > 10 && (
                    <p className="text-center py-2 text-xs text-muted-foreground">
                      Mostrando apenas as primeiras 10 linhas para pré-visualização.
                    </p>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <TableIcon className="h-10 w-10 opacity-20" />
                <p>Nenhum arquivo carregado</p>
              </div>
            )}
          </div>)}

          <ImportFooter errorCount={errors.length} processing={isProcessing} rowCount={previewData.length}
            onCancel={() => setIsOpen(false)} onConfirm={() => { void handleConfirmImport(); }} />
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
        <FileDown className="h-4 w-4" /> Exportar
      </Button>
    </div>
  );
}
