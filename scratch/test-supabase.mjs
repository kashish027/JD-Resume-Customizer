import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Service Key (first 10 chars):", supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + "..." : "undefined");
console.log("Is service role key?", supabaseServiceKey === process.env.SUPABASE_SERVICE_ROLE_KEY ? "Yes (Service Role)" : "No (Anon Key)");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const email = "kgarg2@slb.com";
  console.log(`\n--- Testing allowed_emails upsert for ${email} ---`);
  const { data: upsertData, error: upsertError } = await supabase
    .from("allowed_emails")
    .upsert([{ email }]);

  if (upsertError) {
    console.error("Upsert Error:", upsertError);
  } else {
    console.log("Upsert Success!", upsertData);
  }

  console.log(`\n--- Testing access_requests update for ${email} ---`);
  const { data: updateData, error: updateError } = await supabase
    .from("access_requests")
    .update({ status: "approved" })
    .eq("email", email)
    .select();

  if (updateError) {
    console.error("Update Error:", updateError);
  } else {
    console.log("Update Success!", updateData);
  }
}

run().catch(console.error);
