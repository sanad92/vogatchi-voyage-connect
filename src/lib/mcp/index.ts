import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchCustomers from "./tools/search-customers";
import listBookings from "./tools/list-bookings";
import getBooking from "./tools/get-booking";
import listLeads from "./tools/list-leads";
import listQuotes from "./tools/list-quotes";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "vogatchi-voyage-connect",
  title: "vogatchi-voyage-connect",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Vogatchi travel concierge platform. Use search_customers to find a client, list_leads for the sales pipeline, list_quotes for quotations, and list_bookings / get_booking for reservations. All data is scoped to the signed-in user's organization.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchCustomers, listLeads, listQuotes, listBookings, getBooking],
});
