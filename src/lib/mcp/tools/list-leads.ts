import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, failure, rows } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List sales leads",
  description:
    "List sales pipeline leads (SOP leads) for the signed-in user's organization, newest arrivals first.",
  inputSchema: {
    stage: z
      .string()
      .trim()
      .describe("Pipeline stage filter, e.g. new, assigned, qualified, pricing_requested, quoted, lost.")
      .optional(),
    destination: z.string().trim().describe("Filter by destination fragment.").optional(),
    limit: z.number().int().describe("Maximum number of leads to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ stage, destination, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("sop_leads")
      .select(
        "id, lead_number, stage, contact_name, contact_phone, contact_email, destination, city, check_in, check_out, adults, children_count, budget_amount, budget_currency, lead_source, current_owner_id, arrived_at",
      )
      .order("arrived_at", { ascending: false })
      .limit(take);
    if (stage) query = query.eq("stage", stage);
    if (destination) query = query.ilike("destination", `%${destination.replace(/[%,]/g, "")}%`);
    const { data, error } = await query;
    if (error) return failure(error.message);
    return rows(data);
  },
});
