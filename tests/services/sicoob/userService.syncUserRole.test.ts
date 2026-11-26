import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Op =
  | { kind: "delete"; table: string; userId: string; notColumn?: string; notOperator?: string; notValue?: string }
  | { kind: "insert"; table: string; row: Record<string, unknown> }
  | { kind: "update"; table: string; values: Record<string, unknown>; column: string; userId: string }
  | { kind: "select"; table: string; columns: string; column: string; userId: string };

const harness = vi.hoisted(() => ({
  ops: [] as Op[],
  deleteError: null as unknown,
  insertError: null as unknown,
  updateError: null as unknown,
  selectError: null as unknown,
  // profiles.id -> auth.users.id; ausente = ficha órfã (sem conta)
  authUserByProfile: {} as Record<string, string | null>,
  currentActor: { id: "actor-1" } as { id: string } | null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: harness.currentActor } }),
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => ({
          single: () => {
            harness.ops.push({ kind: "select", table, columns, column, userId: value });
            if (harness.selectError) return Promise.resolve({ data: null, error: harness.selectError });
            const mapped = Object.prototype.hasOwnProperty.call(harness.authUserByProfile, value);
            const authUser = mapped ? harness.authUserByProfile[value] : value;
            return Promise.resolve({ data: authUser === null ? null : { user_id: authUser }, error: null });
          },
        }),
      }),
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

import {
  APP_ROLE_BY_UI_ROLE,
  SICOOB_UI_ROLE_CHOICES,
  syncUserRole,
  updateSicoobUserAssignment,
} from "@/services/sicoob/userService";

const deletes = () => harness.ops.filter((op) => op.kind === "delete") as Extract<Op, { kind: "delete" }>[];
const inserts = () => harness.ops.filter((op) => op.kind === "insert") as Extract<Op, { kind: "insert" }>[];
const updates = () => harness.ops.filter((op) => op.kind === "update") as Extract<Op, { kind: "update" }>[];

const resetHarness = () => {
  harness.ops = [];
  harness.deleteError = null;
  harness.insertError = null;
  harness.updateError = null;
  harness.selectError = null;
  harness.authUserByProfile = {};
  harness.currentActor = { id: "actor-1" };
};

describe("syncUserRole — o papel da tela chega em user_roles", () => {
  beforeEach(resetHarness);

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

    // A tela renderiza o menu a partir de SICOOB_UI_ROLE_CHOICES; se a lista
    // deixar de ser usada, o teste falha em vez de ficar cego.
    expect(source).toContain("SICOOB_UI_ROLE_CHOICES.map(");

    expect(SICOOB_UI_ROLE_CHOICES.length).toBeGreaterThan(0);
    for (const choice of SICOOB_UI_ROLE_CHOICES) {
      expect(
        APP_ROLE_BY_UI_ROLE[choice.role],
        `papel oferecido sem equivalente: ${choice.role}`,
      ).toBeTruthy();
    }
  });
});

describe("updateSicoobUserAssignment — ficha e permissão na mesma ação", () => {
  beforeEach(resetHarness);

  it("usa o id da conta (profiles.user_id), não o id da ficha, em user_roles", async () => {
    harness.authUserByProfile = { "profile-1": "auth-1" };

    await expect(
      updateSicoobUserAssignment({ userId: "profile-1", role: "gestor_pa" }),
    ).resolves.toEqual({ appRole: "gerente_pa" });

    expect(updates()).toEqual([
      {
        kind: "update",
        table: "profiles",
        values: { role: "gestor_pa" },
        column: "id",
        userId: "profile-1",
      },
    ]);
    expect(inserts()).toEqual([
      { kind: "insert", table: "user_roles", row: { user_id: "auth-1", role: "gerente_pa" } },
    ]);
  });

  it("ficha sem conta vinculada falha sem atualizar a ficha nem conceder papel", async () => {
    harness.authUserByProfile = { "profile-orfa": null };

    await expect(
      updateSicoobUserAssignment({ userId: "profile-orfa", role: "supervisor" }),
    ).rejects.toThrow(/sem conta vinculada/);

    expect(updates()).toHaveLength(0);
    expect(inserts()).toHaveLength(0);
    expect(deletes()).toHaveLength(0);
  });

  it("recusa trocar o próprio papel, que deixaria a conta sem acesso", async () => {
    harness.authUserByProfile = { "profile-self": "auth-self" };
    harness.currentActor = { id: "auth-self" };

    await expect(
      updateSicoobUserAssignment({ userId: "profile-self", role: "vendedor" }),
    ).rejects.toThrow(/próprio papel/);

    expect(updates()).toHaveLength(0);
    expect(inserts()).toHaveLength(0);
    expect(deletes()).toHaveLength(0);
  });

  it("propaga falha ao ler a conta vinculada", async () => {
    harness.selectError = { message: "permission denied for table profiles" };
    await expect(
      updateSicoobUserAssignment({ userId: "profile-2", role: "vendedor" }),
    ).rejects.toMatchObject({ message: "permission denied for table profiles" });
    expect(inserts()).toHaveLength(0);
  });

  it("grava profiles e concede o papel real em user_roles", async () => {
    await expect(
      updateSicoobUserAssignment({ userId: "u1", role: "gestor_pa", cooperativaId: "coop-1" }),
    ).resolves.toEqual({ appRole: "gerente_pa" });

    expect(updates()[0]).toEqual({
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
    expect(harness.ops.filter((op) => op.kind === "select")).toHaveLength(0);
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
