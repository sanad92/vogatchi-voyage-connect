import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { activeMemberships, failure, rows, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_organizations",
  title: "List organizations",
  description: "Find active organizations available to the signed-in user and their organization IDs.",
  inputSchema: {
    offset: z.number().int().min(0).optional().describe("Number of organizations to skip (pages contain up to 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ offset = 0 }, ctx) => {
    const userId = ctx.getUserId();
    if (!ctx.isAuthenticated() || !userId) return unauthenticated();
    const { data, error } = await activeMemberships(supabaseForUser(ctx), userId)
      .order("organization_id").range(offset, offset + 49);
    if (error) return failure("Could not list your organizations.");
    return rows(data.map(({ organization_id, organizations }) => ({ organization_id, name: organizations.name })));
  },
});
