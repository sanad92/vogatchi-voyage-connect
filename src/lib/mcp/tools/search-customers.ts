import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, failure, rows } from "../supabase";

export default defineTool({
  name: "search_customers",
  title: "Search customers",
  description: "Search the travel agency's customers by name, email, or phone.",
  inputSchema: {
    query: z.string().trim().describe("Name, email, or phone fragment to search for."),
    limit: z.number().int().describe("Maximum number of customers to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    const supabase = supabaseForUser(ctx);
    const like = `%${query.replace(/[%,]/g, "")}%`;
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, email, phone, nationality, total_bookings, total_spent, last_booking_date")
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .order("last_booking_date", { ascending: false, nullsFirst: false })
      .limit(take);
    if (error) return failure(error.message);
    return rows(data);
  },
});
