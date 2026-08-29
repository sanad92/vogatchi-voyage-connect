import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, failure, rows } from "../supabase";

export default defineTool({
  name: "list_quotes",
  title: "List quotes",
  description: "List customer quotations for the signed-in user's organization, newest first.",
  inputSchema: {
    status: z.string().trim().describe("Quote status filter, e.g. draft, sent, accepted, rejected.").optional(),
    customer_name: z.string().trim().describe("Filter by customer name fragment.").optional(),
    limit: z.number().int().describe("Maximum number of quotes to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, customer_name, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("quotes")
      .select(
        "id, quote_number, status, customer_name, destination, travel_date, return_date, number_of_travelers, total_amount, valid_until, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    if (customer_name) query = query.ilike("customer_name", `%${customer_name.replace(/[%,]/g, "")}%`);
    const { data, error } = await query;
    if (error) return failure(error.message);
    return rows(data);
  },
});
