// deno-lint-ignore-file no-import-prefix
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decideScheduledReportEligibility,
  runScheduledReportBatch,
  type ScheduledReportBatchItem,
} from "./report-eligibility.ts";

Deno.test("decide entrega quando papel, conta e e-mail estao coerentes", () => {
  assertEquals(
    decideScheduledReportEligibility({
      hasRole: true,
      profileActive: true,
      profileEmail: " Gestor@Empresa.com ",
      emailTo: "gestor@empresa.com",
    }),
    { action: "send" },
  );
});

Deno.test("decide desativar quando o usuario perdeu o papel", () => {
  assertEquals(
    decideScheduledReportEligibility({
      hasRole: false,
      profileActive: true,
      profileEmail: "a@b.c",
      emailTo: "a@b.c",
    }),
    { action: "deactivate", reason: "acesso_revogado" },
  );
});

Deno.test("decide desativar conta inativada, que continua com os papeis", () => {
  assertEquals(
    decideScheduledReportEligibility({
      hasRole: true,
      profileActive: false,
      profileEmail: "a@b.c",
      emailTo: "a@b.c",
    }),
    { action: "deactivate", reason: "conta_inativa" },
  );
  // `is_active` nulo e legado: trata como ativo, nao como bloqueado.
  assertEquals(
    decideScheduledReportEligibility({
      hasRole: true,
      profileActive: null,
      profileEmail: "a@b.c",
      emailTo: "a@b.c",
    }),
    { action: "send" },
  );
});

Deno.test("decide desativar quando o e-mail do agendamento ficou para tras", () => {
  assertEquals(
    decideScheduledReportEligibility({
      hasRole: true,
      profileActive: true,
      profileEmail: "novo@b.c",
      emailTo: "antigo@b.c",
    }),
    { action: "deactivate", reason: "email_desatualizado" },
  );
  assertEquals(
    decideScheduledReportEligibility({
      hasRole: true,
      profileActive: true,
      profileEmail: null,
      emailTo: "antigo@b.c",
    }),
    { action: "deactivate", reason: "email_desatualizado" },
  );
});

interface FilaItem extends ScheduledReportBatchItem {
  is_active: boolean;
}

Deno.test("lote cheio de agendamentos impossiveis nao trava o proximo valido", async () => {
  const fila: FilaItem[] = [];
  for (let i = 0; i < 20; i++) {
    fila.push({
      id: `antigo-${i}`,
      user_id: `u-antigo-${i}`,
      email_to: "antigo@empresa.com",
      is_active: true,
    });
  }
  fila.push({
    id: "valido",
    user_id: "u-valido",
    email_to: "novo@empresa.com",
    is_active: true,
  });

  const emailDoPerfil = new Map(fila.map((r) => [r.user_id, "novo@empresa.com"]));

  const rodar = async () => {
    const lote = fila.filter((r) => r.is_active).slice(0, 20);
    const entregues: string[] = [];
    const resultados = await runScheduledReportBatch(lote, {
      decide: async (report) =>
        decideScheduledReportEligibility({
          hasRole: true,
          profileActive: true,
          profileEmail: emailDoPerfil.get(report.user_id) ?? null,
          emailTo: report.email_to,
        }),
      deactivate: async (report) => {
        const alvo = fila.find((r) => r.id === report.id)!;
        alvo.is_active = false;
      },
      deliver: async (report) => {
        entregues.push(report.id);
        return { id: report.id, status: "sent" };
      },
    });
    return { resultados, entregues };
  };

  const primeiro = await rodar();
  // Com o "skip" antigo o lote devolvia 20 pulados e continuava travado.
  assertEquals(primeiro.entregues, []);
  assertEquals(primeiro.resultados.length, 20);
  assertEquals(
    primeiro.resultados.filter((r) => r.status === "deactivated").length,
    20,
  );
  assertEquals(
    primeiro.resultados.every((r) => r.error === "email_desatualizado"),
    true,
  );
  assertEquals(fila.filter((r) => r.is_active).map((r) => r.id), ["valido"]);

  const segundo = await rodar();
  assertEquals(segundo.entregues, ["valido"]);
});

Deno.test("falha de um agendamento nao interrompe o lote", async () => {
  const resultados = await runScheduledReportBatch(
    [
      { id: "a", user_id: "u1", email_to: "a@b.c" },
      { id: "b", user_id: "u2", email_to: "a@b.c" },
    ],
    {
      decide: async () => ({ action: "send" }),
      deactivate: async () => {},
      deliver: async (report) => {
        if (report.id === "a") throw new Error("resend fora do ar");
        return { id: report.id, status: "sent" };
      },
    },
  );

  assertEquals(resultados, [
    { id: "a", status: "error", error: "erro_interno" },
    { id: "b", status: "sent" },
  ]);
});
