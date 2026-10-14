/**
 * Flag leve de modo demo do módulo Tendências.
 * Fica fora do trends-mock para que páginas possam checar o modo
 * sem puxar a massa de dados fictícios para o chunk principal.
 *
 * Dados fictícios só podem ser exibidos quando o modo de demonstração é
 * solicitado explicitamente. A rota normal sempre consulta dados reais.
 * Para ligar: acessar /tendencias?demo=1
 */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}
