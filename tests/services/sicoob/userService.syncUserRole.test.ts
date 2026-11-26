import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Op =
  | { kind: "delete"; table: string; userId: string; notColumn?: string; notOperator?: string; notValue?: string }
  | { kind: "insert"; table: string; row: Record<string, unknown> }
  | { kind: "update"; table: string; values: Record<string, unknown>; column: string; userId: string };

const harness = vi.hoisted(() => ({
  ops: [] as Op[],
  deleteError: null as unknown,
  insertError: null as unknown,
  updateError: null as unknown,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: string) => {
          harness.ops.push({ kind: "update", table, values, column, userId: value });
          return Promise.resolve({ error: harness.updateError });
        },
      }),
      delete: () => ({
        eq: (column: string, value: string) => ({
          not: (notColumn: string, notOperator: string, notValue: string) => {
            harness.ops.push({ kind: "delete", table, userId: value, notColumn, notOperator, notValue });
            return Promise.resolve({ error: harness.deleteError });
          },
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        harness.ops.push({ kind: "insert", table, row });
        return Promise.resolve({ error: harness.insertError });
      },
    }),
  },
}));

import { APP_ROLE_BY_UI_ROLE, syncUserRole, updateSicoobUserAssignment } from "@/services/sicoob/userService";

const deletes = () => harness.ops.filter((op) => op.kind === "delete") as Extract<Op, { kind: "delete" }>[];
const inserts = () => harness.ops.filter((op) => op.kind === "insert") as Extract<Op, { kind: "insert" }>[];

describe("syncUserRole — o papel da tela chega em user_roles", () => {
  beforeEach(() => {
    harness.ops = [];
    harness.deleteError = null;
    harness.insertError = null;
    harness.updateError = null;
  });

  it("traduz 'gestor_pa' (vocabulário legado) para gerente_pa e grava em user_roles", async () => {
    await expect(syncUserRole("u1", "gestor_pa")).resolves.toBe("gerente_pa");

    expect(deletes()).toEqual([
      { kind: "delete", table: "user_roles", userId: "u1", notColumn: "role", notOperator: "in", notValue: "(dev)" },
    ]);
    expect(inserts()).toEqual([
      { kind: "insert", table: "user_roles", row: { user_id: "u1", role: "gerente_pa" } },
    ]);
  });

  it("traduz 'gestor_singular' para gestor_compras", async () => {
    await expect(syncUserRole("u2", "gestor_singular")).resolves.toBe("gestor_compras");
    expect(inserts()).toEqual([
      { kind: "insert", table: "user_roles", row: { user_id: "u2", role: "gestor_compras" } },
    ]);
  });

  it("não regrava o papel técnico dev, que é preservado na limpeza", async () => {
    await expect(syncUserRole("u3", "dev")).resolves.toBe("dev");
    expect(deletes()).toHaveLength(1);
    expect(inserts()).toHaveLength(0);
  });

  it("recusa papel sem equivalente em app_role sem tocar no banco", async () => {
    await expect(syncUserRole("u4", "role_inexistente")).rejects.toThrow(/app_role/);
    expect(harness.ops).toHaveLength(0);
  });

  it("propaga falha da limpeza dos papéis antigos", async () => {
    harness.deleteError = { message: "permission denied for table user_roles" };
    await expect(syncUserRole("u5", "supervisor")).rejects.toMatchObject({
      message: "permission denied for table user_roles",
    });
    expect(inserts()).toHaveLength(0);
  });

  it("propaga falha da concessão do novo papel", async () => {
    harness.insertError = { message: "new row violates row-level security policy" };
    await expect(syncUserRole("u6", "vendedor")).rejects.toMatchObject({
      message: "new row violates row-level security policy",
    });
  });

  it("todo papel oferecido na aba de vínculos tem equivalente em app_role", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx"),
      "utf8",
    );
    const offered = [...source.matchAll(/mutate\(\{\s*userId:\s*user\.id,\s*role:\s*'([^']+)'/g)].map((m) => m[1]);

    expect(offered.length).toBeGreaterThan(0);
    for (const role of offered) {
      expect(APP_ROLE_BY_UI_ROLE[role], `papel oferecido sem equivalente: ${role}`).toBeTruthy();
    }
  });
});

describe("updateSicoobUserAssignment — ficha e permissão na mesma ação", () => {
  beforeEach(() => {
    harness.ops = [];
    harness.deleteError = null;
    harness.insertError = null;
    harness.updateError = null;
  });

  it("grava profiles e concede o papel real em user_roles", async () => {
    await expect(
      updateSicoobUserAssignment({ userId: "u1", role: "gestor_pa", cooperativaId: "coop-1" }),
    ).resolves.toEqual({ appRole: "gerente_pa" });

    expect(harness.ops[0]).toEqual({
      kind: "update",
      table: "profiles",
      values: { cooperativa_id: "coop-1", role: "gestor_pa" },
      column: "id",
      userId: "u1",
    });
    expect(inserts()).toEqual([
      { kind: "insert", table: "user_roles", row: { user_id: "u1", role: "gerente_pa" } },
    ]);
  });

  it("sem papel, não mexe em user_roles", async () => {
    await expect(updateSicoobUserAssignment({ userId: "u2", paId: "pa-1" })).resolves.toEqual({});
    expect(deletes()).toHaveLength(0);
    expect(inserts()).toHaveLength(0);
  });

  it("se a ficha falhar, nenhuma permissão é concedida", async () => {
    harness.updateError = { message: "permission denied for table profiles" };
    await expect(updateSicoobUserAssignment({ userId: "u3", role: "supervisor" })).rejects.toMatchObject({
      message: "permission denied for table profiles",
    });
    expect(deletes()).toHaveLength(0);
    expect(inserts()).toHaveLength(0);
  });

  it("a aba de vínculos usa este serviço em vez de gravar papel por conta própria", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx"),
      "utf8",
    );
    expect(source).toContain("updateSicoobUserAssignment(");
    expect(source).not.toMatch(/from\("profiles"\)\s*\n?\s*\.update\(/);
  });
});
