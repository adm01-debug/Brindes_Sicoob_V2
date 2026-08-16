export function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function validateCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // `digits[i]` é `string | undefined` sob noUncheckedIndexedAccess; o
  // comprimento já foi validado acima, então o fallback nunca é atingido.
  const digitAt = (index: number): number => Number.parseInt(digits[index] ?? '0', 10);

  const calc = (weights: number[]) =>
    weights.reduce((sum, w, i) => sum + digitAt(i) * w, 0);

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let remainder = calc(w1) % 11;
  const d1 = remainder < 2 ? 0 : 11 - remainder;
  if (digitAt(12) !== d1) return false;

  remainder = calc(w2) % 11;
  const d2 = remainder < 2 ? 0 : 11 - remainder;
  return digitAt(13) === d2;
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

export const ESTADOS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
] as const;
