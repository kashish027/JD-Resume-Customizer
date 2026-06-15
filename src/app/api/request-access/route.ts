import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Initialize Supabase Admin Client using Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder-project-id.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if already in allowed_emails
    const { data: allowedData, error: allowedError } = await supabaseAdmin
      .from("allowed_emails")
      .select("email")
      .eq("email", normalizedEmail)
      .single();

    if (allowedData) {
      return NextResponse.json({
        status: "approved",
        message: "This email is already approved and registered.",
      });
    }

    // 2. Check if there is already an access request
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from("access_requests")
      .select("status")
      .eq("email", normalizedEmail)
      .single();

    if (requestData) {
      if (requestData.status === "approved") {
        return NextResponse.json({
          status: "approved",
          message: "This email is already approved and registered.",
        });
      }
      return NextResponse.json({
        status: "pending",
        message: "Your access request is already pending approval. We will notify you once approved.",
      });
    }

    // 3. Insert new access request
    const { error: insertError } = await supabaseAdmin
      .from("access_requests")
      .insert([{ email: normalizedEmail, status: "pending" }]);

    if (insertError) {
      console.error("Error inserting access request:", insertError);
      return NextResponse.json(
        { error: "Failed to log the access request. Please try again." },
        { status: 500 }
      );
    }

    // 4. Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (adminEmail && smtpUser && smtpPass) {
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "465");
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") || "http";
      const host = request.headers.get("host");
      const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (forwardedHost ? `${forwardedProto}://${forwardedHost}` : 
        (vercelUrl ? `https://${vercelUrl}` : 
        (host ? `${forwardedProto}://${host}` : "http://localhost:3000")));
      const approvalSecret = process.env.ADMIN_APPROVAL_SECRET || "default_secret";

      const approvalUrl = `${appUrl}/api/approve-access?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(approvalSecret)}`;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"Resume Adapt Access System" <${smtpUser}>`,
        to: adminEmail,
        subject: `[Access Request] New Request from ${normalizedEmail}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #8b5cf6;">New Access Request</h2>
            <p>A user has requested access to the Resume Adapt Customizer application.</p>
            
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">User Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${normalizedEmail}</td>
              </tr>
            </table>

            <p style="margin-top: 30px;">
              <a href="${approvalUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Approve Access</a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              If you don't recognize this request or wish to ignore it, simply delete this email.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP config missing. Access request logged but notification email was not sent.");
    }

    return NextResponse.json({
      status: "pending",
      message: "Access request successfully submitted.",
    });
  } catch (error: any) {
    console.error("Unhandled error in request-access route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
