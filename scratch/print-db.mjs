import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("--- allowed_emails ---");
  const { data: allowed, error: allowedErr } = await supabase
    .from("allowed_emails")
    .select("*");
  if (allowedErr) console.error(allowedErr);
  else console.log(allowed);

  console.log("\n--- access_requests ---");
  const { data: requests, error: requestsErr } = await supabase
    .from("access_requests")
    .select("*");
  if (requestsErr) console.error(requestsErr);
  else console.log(requests);
}

run().catch(console.error);
