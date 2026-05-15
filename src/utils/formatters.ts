import { format as dfnsFormat, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: string | Date | null | undefined, pattern: string = "dd/MM/yyyy"): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "Data Inválida";
  return dfnsFormat(d, pattern, { locale: ptBR });
}

export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
}
