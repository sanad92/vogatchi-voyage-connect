import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { organizationInput, scopedOrganization, failure, rows } from "../supabase";

export default defineTool({
  name: "search_customers",
  title: "Search customers",
  description: "Find customer records in one organization by name, email, or phone fragment.",
  inputSchema: {
    organization_id: organizationInput,
    query: z.string().trim().min(2).max(120).describe("Name, email, or phone fragment to search for."),
    limit: z.number().int().describe("Maximum number of customers to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ organization_id, query, limit }, ctx) => {
    const scope = await scopedOrganization(ctx, organization_id);
    if (scope.error) return scope.error;
    const { supabase, organizationId } = scope;
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    const term = query.replace(/[^\p{L}\p{M}\p{N}\s@.+-]/gu, "").trim();
    if (term.length < 2) return failure("Enter at least two search characters.");
    const like = `%${term}%`;
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, last_booking_date")
      .eq("organization_id", organizationId)
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .order("last_booking_date", { ascending: false, nullsFirst: false })
      .limit(take);
    if (error) return failure(error.message);
    return rows(data);
  },
});
