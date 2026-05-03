import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ExportData {
  items: any[];
  filename: string;
  columns: { header: string; key: string }[];
}

export const exportToExcel = ({ items, filename, columns }: ExportData) => {
  const data = items.map((item) => {
    const row: any = {};
    columns.forEach((col) => {
      row[col.header] = item[col.key];
    });
    return row;
  });

  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Dados");
  writeFile(workbook, `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`);
};

export const exportToPDF = ({ items, filename, columns }: ExportData) => {
  const doc = new jsPDF() as any;
  const tableColumn = columns.map((c) => c.header);
  const tableRows = items.map((item) => columns.map((col) => item[col.key]));

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 20,
    theme: "striped",
    headStyles: { fillColor: [63, 81, 181] },
    margin: { top: 20 },
    addPageContent: (data: any) => {
      doc.text(filename.replace(/_/g, " ").toUpperCase(), 14, 15);
    },
  });

  doc.save(`${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
};

export const ORDER_EXPORT_COLUMNS = [
  { header: "Nº Pedido", key: "order_number" },
  { header: "Cliente", key: "client_name" },
  { header: "Status", key: "status_label" },
  { header: "Total", key: "total_formatted" },
  { header: "Data", key: "created_at_formatted" },
];

export const QUOTE_EXPORT_COLUMNS = [
  { header: "Nº Orçamento", key: "quote_number" },
  { header: "Cliente", key: "client_name" },
  { header: "Status", key: "status_label" },
  { header: "Total", key: "total_formatted" },
  { header: "Validade", key: "valid_until_formatted" },
];
