/**
 * Flag leve de modo demo do módulo Tendências.
 * Fica fora do trends-mock para que páginas possam checar o modo
 * sem puxar a massa de dados fictícios para o chunk principal.
 *
 * Demo ligado por padrão (avaliação de viabilidade do módulo).
 * Para desligar: acessar /tendencias?demo=0
 */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return true;
  return new URLSearchParams(window.location.search).get("demo") !== "0";
}
