export type CampaignExportRow = Record<string, unknown>;

function escapeCsvCell(value: unknown): string {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function campaignRowsToCsv(rows: CampaignExportRow[]): string {
  const [firstRow] = rows;
  if (!firstRow) return '\uFEFF';

  const headers = Object.keys(firstRow);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}
