export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: string | Date, pattern: string = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // Note: For complex localized formatting, we might want to pass locale from date-fns
  return d.toLocaleDateString("pt-BR");
}
