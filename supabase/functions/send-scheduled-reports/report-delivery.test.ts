// deno-lint-ignore-file no-import-prefix
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deliverScheduledReport } from "./report-delivery.ts";

Deno.test("relatório sem provedor não é gerado nem marcado como enviado", async () => {
  let generated = 0;
  let persisted = 0;

  const result = await deliverScheduledReport({ id: "report-1" }, null, {
    generateData: () => {
      generated += 1;
      return Promise.resolve("conteúdo");
    },
    persistSent: () => {
      persisted += 1;
      return Promise.resolve();
    },
  });

  assertEquals(result, {
    id: "report-1",
    status: "blocked",
    error: "provedor_email_nao_configurado",
  });
  assertEquals(generated, 0);
  assertEquals(persisted, 0);
});

Deno.test("relatório só é persistido depois da confirmação do provedor", async () => {
  const events: string[] = [];

  const result = await deliverScheduledReport(
    { id: "report-2" },
    () => {
      events.push("sent");
      return Promise.resolve();
    },
    {
      generateData: () => {
        events.push("generated");
        return Promise.resolve("conteúdo");
      },
      persistSent: () => {
        events.push("persisted");
        return Promise.resolve();
      },
    },
  );

  assertEquals(result, { id: "report-2", status: "sent" });
  assertEquals(events, ["generated", "sent", "persisted"]);
});
