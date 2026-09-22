/**
 * useBulkImportFile — Encapsulates file parsing, column mapping, and data transformation
 * for the BulkImportPanel component.
 */
import { useState, useCallback, useRef } from 'react';
import { PRODUCT_FIELDS, type BulkImportRow, type ColumnMapping } from '@/hooks/useProductRegistration';

const getXLSX = () => import('@e965/xlsx');
import Papa from 'papaparse';

export type ImportMode = 'template' | 'custom';
export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'results';

export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

export function useBulkImportFile() {
  const [importMode, setImportMode] = useState<ImportMode>('template');
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoMapColumns = useCallback((headers: string[]) => {
    const mappings: ColumnMapping[] = headers.map(header => {
      const matchingField = PRODUCT_FIELDS.find(
        field => field.key.toLowerCase() === header.toLowerCase() ||
                 field.label.toLowerCase() === header.toLowerCase()
      );
      return {
        sourceColumn: header,
        targetField: matchingField?.key || '',
        required: matchingField?.required || false,
      };
    });
    setColumnMappings(mappings);
  }, []);

  const parseFile = useCallback(async (file: File) => {
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const headers = results.meta.fields || [];
            setParsedData({ headers, rows: results.data as Record<string, unknown>[], fileName });
            if (importMode === 'template') {
              autoMapColumns(headers);
              setStep('preview');
            } else {
              setStep('mapping');
            }
          },
          error: (error) => { throw new Error(`Erro ao ler CSV: ${error.message}`); },
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        const XLSX = await getXLSX();
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('Planilha vazia ou sem abas');
        const firstSheet = workbook.Sheets[firstSheetName];
        if (!firstSheet) throw new Error('Planilha vazia ou sem abas');
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];

        if (jsonData.length < 2) throw new Error('Arquivo vazio ou sem dados');

        const headers = (jsonData[0] as string[]).map(h => String(h).trim());
        const rows = jsonData.slice(1).map(row => {
          const obj: Record<string, unknown> = {};
          headers.forEach((header, index) => { obj[header] = (row as unknown[])[index]; });
          return obj;
        });

        setParsedData({ headers, rows, fileName });
        if (importMode === 'template') {
          autoMapColumns(headers);
          setStep('preview');
        } else {
          setStep('mapping');
        }
      } else {
        throw new Error('Formato não suportado. Use CSV ou XLSX.');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
    }
  }, [importMode, autoMapColumns]);

  const updateMapping = useCallback((sourceColumn: string, targetField: string) => {
    setColumnMappings(prev =>
      prev.map(m =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField: targetField as ColumnMapping['targetField'] }
          : m
      )
    );
  }, []);

  const isMappingComplete = useCallback(() => {
    const requiredFields = PRODUCT_FIELDS.filter(f => f.required).map(f => f.key);
    const mappedFields = columnMappings.filter(m => m.targetField).map(m => m.targetField);
    return requiredFields.every(f => mappedFields.includes(f));
  }, [columnMappings]);

  const transformData = useCallback((): BulkImportRow[] => {
    if (!parsedData) return [];
    return parsedData.rows.map(row => {
      const transformed: BulkImportRow = { name: '', sku: '', price: 0 };
      columnMappings.forEach(mapping => {
        if (mapping.targetField && row[mapping.sourceColumn] !== undefined) {
          (transformed as Record<string, unknown>)[mapping.targetField] = row[mapping.sourceColumn];
        }
      });
      return transformed;
    });
  }, [parsedData, columnMappings]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const resetImport = useCallback(() => {
    setParsedData(null);
    setColumnMappings([]);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return {
    importMode, setImportMode,
    step, setStep,
    parsedData,
    columnMappings,
    isDragging, setIsDragging,
    fileInputRef,
    updateMapping,
    isMappingComplete,
    transformData,
    handleFileSelect,
    handleDrop,
    resetImport,
  };
}
