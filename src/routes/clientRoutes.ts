export const CLIENT_DETAIL_ROUTE = "/clientes/:id" as const;

export function clientDetailPath(clientId: string): string {
  return CLIENT_DETAIL_ROUTE.replace(":id", encodeURIComponent(clientId));
}
