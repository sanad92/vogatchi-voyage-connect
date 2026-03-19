// Assuming this is the part of the file you want to update
const corsHeaders = {
  // other headers
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Updating the OPTIONS handler
export const handler = async (event) => {
  // other logic
  if (event.httpMethod === 'OPTIONS') {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  // rest of your function
};