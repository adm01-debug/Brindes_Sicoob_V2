import { describe, expect, it } from "vitest";
import { getScheduledReportOwnerFilter } from "../../supabase/functions/process-scheduled-reports/report-scope";

describe("getScheduledReportOwnerFilter", () => {
  it("restringe consultas de service role ao vendedor dono do relatório", () => {
    expect(getScheduledReportOwnerFilter("seller-a")).toEqual({
      column: "seller_id",
      value: "seller-a",
    });
  });

  it.each([null, undefined, "", "   ", 42])(
    "recusa relatório sem usuário proprietário válido (%s)",
    (userId) => {
      expect(() => getScheduledReportOwnerFilter(userId)).toThrow(
        "scheduled_report_owner_missing",
      );
    },
  );
});
