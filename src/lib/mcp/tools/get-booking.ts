import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { organizationInput, scopedOrganization, failure, rows } from "../supabase";

export default defineTool({
  name: "get_booking",
  title: "Get booking",
  description: "Fetch one booking by its booking number (e.g. BK-123456) or its id.",
  inputSchema: {
    organization_id: organizationInput,
    booking_number: z.string().trim().describe("Booking number such as BK-1783866510972.").optional(),
    id: z.string().trim().describe("Booking UUID.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ organization_id, booking_number, id }, ctx) => {
    const scope = await scopedOrganization(ctx, organization_id);
    if (scope.error) return scope.error;
    const { supabase, organizationId } = scope;
    if (!booking_number && !id) return failure("Provide either booking_number or id.");
    let query = supabase
      .from("bookings")
      .select(
        "id, booking_number, booking_type, status, workflow_stage, customer_name, start_date, end_date, selling_price, currency, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .limit(1);
    query = id ? query.eq("id", id) : query.eq("booking_number", booking_number as string);
    const { data, error } = await query.maybeSingle();
    if (error) return failure(error.message);
    if (!data) return failure("Booking not found or not visible to this account.");
    return rows(data);
  },
});
