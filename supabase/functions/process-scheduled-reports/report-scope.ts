/** Builds the tenant filter used by service-role report queries. */
export function getScheduledReportOwnerFilter(reportUserId: unknown): {
  column: "seller_id";
  value: string;
} {
  if (typeof reportUserId !== "string" || reportUserId.trim() === "") {
    throw new Error("scheduled_report_owner_missing");
  }

  return { column: "seller_id", value: reportUserId };
}
