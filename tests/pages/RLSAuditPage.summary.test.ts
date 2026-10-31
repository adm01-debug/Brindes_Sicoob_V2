import { describe, expect, it } from "vitest";
import { summarizeLatestRlsAuditLogs } from "@/pages/admin/RLSAuditPage";

describe("resumo do auditor RLS", () => {
  it("conta somente o resultado mais recente de cada tabela", () => {
    const logs = [
      { id: "3", table_name: "quotes", status: "success" },
      { id: "2", table_name: "profiles", status: "failure" },
      { id: "1", table_name: "quotes", status: "failure" },
    ] as Parameters<typeof summarizeLatestRlsAuditLogs>[0];

    expect(summarizeLatestRlsAuditLogs(logs)).toEqual({
      conformingTables: 1,
      tablesWithIssues: 1,
    });
  });
});
