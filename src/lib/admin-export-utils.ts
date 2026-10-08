import * as XLSX from '@e965/xlsx';

export async function exportToExcel(data: Array<Record<string, unknown>>, filename: string) {
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
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('A planilha não contém abas para importar.');
        const firstSheet = workbook.Sheets[firstSheetName];
        if (!firstSheet) throw new Error('Não foi possível ler a primeira aba da planilha.');
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
        
        // Map and validate
        const mappedData = jsonData.map((row) => {
          const item: Record<string, unknown> = {};
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
