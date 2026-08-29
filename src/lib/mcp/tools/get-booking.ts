import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, failure, rows } from "../supabase";

export default defineTool({
  name: "get_booking",
  title: "Get booking",
  description: "Fetch one booking by its booking number (e.g. BK-123456) or its id.",
  inputSchema: {
    booking_number: z.string().trim().describe("Booking number such as BK-1783866510972.").optional(),
    id: z.string().trim().describe("Booking UUID.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ booking_number, id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    if (!booking_number && !id) return failure("Provide either booking_number or id.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("bookings")
      .select(
        "id, booking_number, booking_type, status, workflow_stage, customer_id, customer_name, supplier_name, start_date, end_date, selling_price, cost_price, profit, currency, payment_policy, deposit_percent, notes, created_at, updated_at",
      )
      .limit(1);
    query = id ? query.eq("id", id) : query.eq("booking_number", booking_number as string);
    const { data, error } = await query.maybeSingle();
    if (error) return failure(error.message);
    if (!data) return failure("Booking not found or not visible to this account.");
    return rows(data);
  },
});
