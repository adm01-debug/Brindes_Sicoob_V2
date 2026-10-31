import { type AppRole } from "@/contexts/AuthContext";

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export const FLOW_GREETINGS = [
  "{greeting}, {name}! Bem-vindo ao Portal de Compras Sicoob. \ud83d\ude80",
  "{greeting}, {name}! J\u00e1 separei alguns materiais importantes pra voc\u00ea! \ud83d\ude0e",
  "Ol\u00e1, {name}! Como posso ajudar sua cooperativa hoje? \ud83d\udcaa",
  "{greeting}, {name}! Temos novidades no cat\u00e1logo Sicoob esperando por voc\u00ea! \u2728",
  "Fala, {name}! Pronto para otimizar as compras da cooperativa? \ud83c\udfaf",
];

export function getRandomGreeting(name: string): string {
  const greeting = getGreeting();
  const template = FLOW_GREETINGS[Math.floor(Math.random() * FLOW_GREETINGS.length)];
  return (template ?? "{greeting}, {name}!").replace("{greeting}", greeting).replace("{name}", name);
}

/**
 * Higher roles have lower index in the array for comparison.
 * hierarchy: dev > supervisor > agente
 */
const ROLE_HIERARCHY: AppRole[] = [
  "dev",
  "gestor_compras",
  "comprador_singular",
  "supervisor",
  "gerente_pa",
  "comprador_pac",
  "agente",
  "vendedor",
];

export function getHighestRole(roles: AppRole[]): AppRole | null {
  if (!roles.length) return null;
  return roles.reduce((highest, current) => {
    const highestIdx = ROLE_HIERARCHY.indexOf(highest);
    const currentIdx = ROLE_HIERARCHY.indexOf(current);
    if (highestIdx === -1) return current;
    if (currentIdx === -1) return highest;
    return currentIdx < highestIdx ? current : highest;
  });
}

export function isSupervisorOrAbove(roles: AppRole[]): boolean {
  return roles.some((r) => ["dev", "gestor_compras", "comprador_singular", "supervisor", "admin", "manager"].includes(r));
}

/**
 * Retorna a rota padrão para redirecionamento após login baseado no papel.
 */
export function getDefaultRouteByRole(role: AppRole | null): string {
  if (!role) return "/";

  switch (role) {
    case "dev":
      return "/admin/telemetria";
    case "supervisor":
      return "/admin/usuarios";
    case "gestor_compras":
    case "comprador_singular":
      return "/gestor/orcamentos";
    case "gerente_pa":
    case "comprador_pac":
      return "/dashboard-pa";
    case "vendedor":
      return "/sicoob/vendas";
    default:
      return "/";
  }
}
