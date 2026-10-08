/** Verifica `null` e `undefined` sem coerção implícita. */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
