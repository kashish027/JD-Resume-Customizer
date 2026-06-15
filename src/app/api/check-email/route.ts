import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder-project-id.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if allowed
    const { data: allowedData } = await supabaseAdmin
      .from("allowed_emails")
      .select("email")
      .eq("email", normalizedEmail)
      .single();

    if (allowedData) {
      return NextResponse.json({ status: "approved" });
    }

    // 2. Check if pending request
    const { data: requestData } = await supabaseAdmin
      .from("access_requests")
      .select("status")
      .eq("email", normalizedEmail)
      .single();

    if (requestData) {
      return NextResponse.json({ status: requestData.status }); // 'pending', 'rejected', etc.
    }

    return NextResponse.json({ status: "none" });
  } catch (error: any) {
    console.error("Error checking email status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
