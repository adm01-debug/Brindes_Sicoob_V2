export interface SicoobOrderScope {
  cooperative_id?: string | null;
  created_by?: string | null;
  pa_id?: string | null;
}

export interface SicoobOrderActor {
  cooperativa_id?: string | null;
  id?: string | null;
  pa_id?: string | null;
  user_id?: string | null;
}

const hasAnyRole = (roles: readonly string[], allowedRoles: readonly string[]) =>
  roles.some((role) => allowedRoles.includes(role));

const sameDefinedId = (left?: string | null, right?: string | null) =>
  Boolean(left) && left === right;

/**
 * Define quem pode operar itens, logística e notas fiscais de um pedido.
 * A interface reduz ações indevidas; o banco continua sendo a autoridade
 * para toda alteração persistida.
 */
export function canManageSicoobOrderFulfillment(
  order: SicoobOrderScope | null | undefined,
  actor: SicoobOrderActor | null | undefined,
  roles: readonly string[],
): boolean {
  if (!order) return false;

  const canOperateByRole = [
    hasAnyRole(roles, ['dev', 'supervisor']),
    hasAnyRole(roles, ['gestor_compras', 'comprador_singular']) &&
      sameDefinedId(actor?.cooperativa_id, order.cooperative_id),
    hasAnyRole(roles, ['gerente_pa', 'comprador_pac']) && sameDefinedId(actor?.pa_id, order.pa_id),
    sameDefinedId(order.created_by, actor?.user_id),
    sameDefinedId(order.created_by, actor?.id),
  ];

  return canOperateByRole.some(Boolean);
}
