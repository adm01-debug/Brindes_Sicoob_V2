import * as XLSX from '@e965/xlsx';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function importFromExcel(file: File, table: string, mapping: Record<string, string>) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Map and validate
        const mappedData = jsonData.map((row: any) => {
          const item: any = {};
          for (const [fileKey, dbKey] of Object.entries(mapping)) {
            item[dbKey] = row[fileKey];
          }
          return item;
        });

        resolve(mappedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
