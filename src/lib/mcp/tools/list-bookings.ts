import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { organizationInput, scopedOrganization, failure, rows } from "../supabase";

export default defineTool({
  name: "list_bookings",
  title: "List bookings",
  description:
    "List bookings for the signed-in user's organization, optionally filtered by status or travel start date range.",
  inputSchema: {
    organization_id: organizationInput,
    status: z.string().trim().describe("Booking status filter, e.g. pending, confirmed, cancelled.").optional(),
    start_from: z.string().trim().describe("Only bookings starting on or after this ISO date (YYYY-MM-DD).").optional(),
    start_to: z.string().trim().describe("Only bookings starting on or before this ISO date (YYYY-MM-DD).").optional(),
    limit: z.number().int().describe("Maximum number of bookings to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ organization_id, status, start_from, start_to, limit }, ctx) => {
    const scope = await scopedOrganization(ctx, organization_id);
    if (scope.error) return scope.error;
    const { supabase, organizationId } = scope;
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    let query = supabase
      .from("bookings")
      .select(
        "id, booking_number, booking_type, status, workflow_stage, customer_name, start_date, end_date, selling_price, currency, created_at",
      )
      .eq("organization_id", organizationId)
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    if (start_from) query = query.gte("start_date", start_from);
    if (start_to) query = query.lte("start_date", start_to);
    const { data, error } = await query;
    if (error) return failure(error.message);
    return rows(data);
  },
});
