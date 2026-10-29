/**
 * Flag leve de modo demo do módulo Tendências.
 * Fica fora do trends-mock para que páginas possam checar o modo
 * sem puxar a massa de dados fictícios para o chunk principal.
 *
 * Dados reais são o padrão. Demonstração somente por opt-in explícito:
 * acessar /tendencias?demo=1.
 */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  const value = new URLSearchParams(window.location.search).get("demo");
  return value === "1" || value === "true";
}
