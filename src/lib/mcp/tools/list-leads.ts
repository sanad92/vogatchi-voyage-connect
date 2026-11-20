import type { Database } from "../../../integrations/supabase/types";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { organizationInput, scopedOrganization, failure, rows } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List sales leads",
  description:
    "List sales pipeline leads (SOP leads) for the signed-in user's organization, newest arrivals first.",
  inputSchema: {
    organization_id: organizationInput,
    stage: z
      .string()
      .trim()
      .describe("Pipeline stage filter, e.g. new, assigned, qualified, pricing_requested, quoted, lost.")
      .optional(),
    destination: z.string().trim().describe("Filter by destination fragment.").optional(),
    limit: z.number().int().describe("Maximum number of leads to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ organization_id, stage, destination, limit }, ctx) => {
    const scope = await scopedOrganization(ctx, organization_id);
    if (scope.error) return scope.error;
    const { supabase, organizationId } = scope;
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    let query = supabase
      .from("sop_leads")
      .select(
        "id, lead_number, stage, contact_name, destination, city, check_in, check_out, adults, children_count, lead_source, arrived_at",
      )
      .eq("organization_id", organizationId)
      .order("arrived_at", { ascending: false })
      .limit(take);
    if (stage) query = query.eq("stage", stage as Database["public"]["Enums"]["sop_lead_stage"]);
    if (destination) query = query.ilike("destination", `%${destination.replace(/[%,]/g, "")}%`);
    const { data, error } = await query;
    if (error) return failure(error.message);
    return rows(data);
  },
});
