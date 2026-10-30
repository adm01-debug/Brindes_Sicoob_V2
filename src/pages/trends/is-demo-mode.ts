/**
 * Flag leve de modo demo do módulo Tendências.
 * Fica fora do trends-mock para que páginas possam checar o modo
 * sem puxar a massa de dados fictícios para o chunk principal.
 *
 * Dados reais são o padrão. Para avaliação visual com dados fictícios,
 * acesse /tendencias?demo=1.
 */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}
