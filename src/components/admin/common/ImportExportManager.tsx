
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
import { FileUp, FileDown, AlertCircle, CheckCircle2, Loader2, Table as TableIcon, Download } from "lucide-react";
import * as XLSX from 'xlsx';
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

interface ImportExportManagerProps {
  entityName: string;
  onImport: (data: any[]) => Promise<void>;
  onExport: () => void;
  templateData?: any[];
  expectedColumns: { key: string, label: string, required?: boolean, type?: 'string' | 'number' | 'email' | 'boolean' }[];
}

export function ImportExportManager({
  entityName,
  onImport,
  onExport,
  templateData,
  expectedColumns
}: ImportExportManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ row: number, message: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateData = (data: any[]) => {
    const newErrors: { row: number, message: string }[] = [];
    const validatedData = data.map((row, index) => {
      const rowNum = index + 1;
      const newRow: any = { ...row };

      expectedColumns.forEach(col => {
        const val = row[col.key] || row[col.label];
        
        if (col.required && (val === undefined || val === null || val === '')) {
          newErrors.push({ row: rowNum, message: `Campo "${col.label}" é obrigatório.` });
        }

        if (val !== undefined && val !== null && val !== '') {
          if (col.type === 'email' && !String(val).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            newErrors.push({ row: rowNum, message: `Email inválido: ${val}` });
          }
          if (col.type === 'number' && isNaN(Number(val))) {
            newErrors.push({ row: rowNum, message: `Valor numérico inválido: ${val}` });
          }
        }
      });

      return newRow;
    });

    setErrors(newErrors);
    setPreviewData(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        validateData(data);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao processar arquivo Excel");
      } finally {
        setIsProcessing(false);
      }
    };

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          validateData(results.data);
          setIsProcessing(false);
        },
        error: (err) => {
          toast.error("Erro ao processar CSV: " + err.message);
          setIsProcessing(false);
        }
      });
    } else {
      reader.readAsBinaryString(file);
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

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(templateData || [
      expectedColumns.reduce((acc, col) => ({ ...acc, [col.label]: '' }), {})
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entityName);
    XLSX.writeFile(workbook, `${entityName}_template.xlsx`);
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

          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
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
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" /> Baixar Template (XLSX)
                </Button>
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
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmImport} 
              disabled={previewData.length === 0 || errors.length > 0 || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
        <FileDown className="h-4 w-4" /> Exportar
      </Button>
    </div>
  );
}
