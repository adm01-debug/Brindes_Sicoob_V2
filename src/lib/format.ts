/**
 * Centralized formatting utilities
 */

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const BRL_COMPACT_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return BRL_FORMATTER.format(value);
}

export function formatCurrencyCompact(value: number): string {
  return BRL_COMPACT_FORMATTER.format(value);
}

export function formatUnitPrice(value: number): string {
  return `${BRL_FORMATTER.format(value)}/un`;
}

export function formatCNPJ(cnpj: string): string {
  const clean = (cnpj || "").replace(/\D/g, "");
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatPhone(phone: string): string {
  const clean = (phone || "").replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
}

