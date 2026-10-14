import { describe, it, expect } from "vitest";
import { filterByRoutePermission } from "@/lib/navigation/filter-restricted-items";

interface Item {
  id: string;
  path?: string;
}

const items: Item[] = [
  { id: "home", path: "/" },
  { id: "quotes", path: "/orcamentos" },
  { id: "users", path: "/admin/usuarios" },
  { id: "telemetry", path: "/admin/telemetria" },
  { id: "connections", path: "/admin/conexoes/status" },
  { id: "rbac", path: "/admin/rbac-rotas" },
  { id: "manager-quotes", path: "/gestor/orcamentos" },
  { id: "themes", path: "/admin/temas" },
  { id: "theme-toggle" }, // sem path → sempre visível
];

describe("filterByRoutePermission", () => {
  it("agente vê só rotas autenticadas e ações sem path", () => {
    const out = filterByRoutePermission(items, (i) => i.path, {
      isDev: false,
      isAdmin: false,
      assignedRoles: ['agente'],
    });
    expect(out.map((i) => i.id)).toEqual(["home", "quotes", "themes", "theme-toggle"]);
  });

  it("admin vê admin + autenticadas, mas NÃO vê dev-only", () => {
    const out = filterByRoutePermission(items, (i) => i.path, {
      isDev: false,
      isAdmin: true,
      assignedRoles: ['supervisor'],
    });
    const ids = out.map((i) => i.id);
    expect(ids).toContain("users");
    expect(ids).not.toContain("telemetry");
    expect(ids).not.toContain("connections");
    expect(ids).not.toContain("rbac");
  });

  it("dev vê tudo", () => {
    const out = filterByRoutePermission(items, (i) => i.path, {
      isDev: true,
      isAdmin: true,
      assignedRoles: ['dev'],
    });
    expect(out).toHaveLength(items.length);
  });

  it("itens sem path nunca são filtrados", () => {
    const out = filterByRoutePermission(items, (i) => i.path, {
      isDev: false,
      isAdmin: false,
      assignedRoles: ['agente'],
    });
    expect(out.find((i) => i.id === "theme-toggle")).toBeTruthy();
  });

  it("aplica a matriz Sicoob quando os papéis atribuídos estão disponíveis", () => {
    const seller = filterByRoutePermission(items, (item) => item.path, {
      isDev: false,
      isAdmin: false,
      assignedRoles: ['vendedor'],
    });
    const manager = filterByRoutePermission(items, (item) => item.path, {
      isDev: false,
      isAdmin: false,
      assignedRoles: ['gestor_compras'],
    });

    expect(seller.map((item) => item.id)).not.toContain('manager-quotes');
    expect(manager.map((item) => item.id)).toContain('manager-quotes');
  });
});
