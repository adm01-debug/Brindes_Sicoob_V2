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

  if (roles.includes('dev') || roles.includes('supervisor')) return true;

  if (
    (roles.includes('gestor_compras') || roles.includes('comprador_singular'))
    && Boolean(actor?.cooperativa_id)
    && actor.cooperativa_id === order.cooperative_id
  ) return true;

  if (
    (roles.includes('gerente_pa') || roles.includes('comprador_pac'))
    && Boolean(actor?.pa_id)
    && actor.pa_id === order.pa_id
  ) return true;

  return Boolean(
    order.created_by
    && (order.created_by === actor?.user_id || order.created_by === actor?.id),
  );
}
