import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder-project-id.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const expectedToken = process.env.ADMIN_APPROVAL_SECRET || "default_secret";

  const renderHTML = (title: string, message: string, detail: string, isSuccess: boolean) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            background: #0b0f19;
            color: #f3f4f6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            max-width: 480px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          h1 {
            color: ${isSuccess ? "#8b5cf6" : "#ef4444"};
            font-size: 2rem;
            margin-top: 0;
          }
          p {
            color: #9ca3af;
            line-height: 1.6;
            font-size: 1.1rem;
          }
          .badge {
            display: inline-block;
            background: ${isSuccess ? "rgba(139, 92, 246, 0.15)" : "rgba(239, 68, 68, 0.15)"};
            border: 1px solid ${isSuccess ? "rgba(139, 92, 246, 0.3)" : "rgba(239, 68, 68, 0.3)"};
            color: ${isSuccess ? "#a78bfa" : "#f87171"};
            padding: 0.5rem 1rem;
            border-radius: 99px;
            font-weight: 600;
            margin: 1rem 0;
          }
          .btn {
            display: inline-block;
            margin-top: 1.5rem;
            background: #8b5cf6;
            color: white;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: bold;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #7c3aed;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${isSuccess ? "✨" : "⚠️"}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <div class="badge">${detail}</div>
          <br/>
          <a href="${appUrl}" class="btn">Go to App</a>
        </div>
      </body>
      </html>
    `;
  };

  // 1. Verify token
  if (!token || token !== expectedToken) {
    return new NextResponse(
      renderHTML(
        "Unauthorized Request",
        "The approval token provided is invalid or missing. You are not authorized to approve access requests.",
        "Invalid Security Token",
        false
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!email || !email.includes("@")) {
    return new NextResponse(
      renderHTML(
        "Invalid Email",
        "The email address provided is invalid.",
        email || "Missing Email",
        false
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 2. Add to allowed_emails
    const { error: allowedError } = await supabaseAdmin
      .from("allowed_emails")
      .upsert([{ email: normalizedEmail }]);

    if (allowedError) {
      console.error("Error adding to allowed_emails:", allowedError);
      return new NextResponse(
        renderHTML(
          "Database Error",
          "Failed to approve the email in database. Check your Supabase settings.",
          allowedError.message,
          false
        ),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // 3. Update request status to approved
    await supabaseAdmin
      .from("access_requests")
      .update({ status: "approved" })
      .eq("email", normalizedEmail);

    // 4. Send email notification to user
    const adminEmail = process.env.ADMIN_EMAIL;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (smtpUser && smtpPass) {
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "465");

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
        from: `"Resume Adapt team" <${smtpUser}>`,
        to: normalizedEmail,
        subject: "Your Access Request for Resume Adapt has been Approved!",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #8b5cf6;">Congratulations! 🎉</h2>
            <p>Your request for access to <strong>Resume Adapt Customizer</strong> has been approved by the administrator.</p>
            <p>You can now go to the application page, create your account, and start customizing your resumes!</p>
            
            <p style="margin-top: 30px;">
              <a href="${appUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Resume Adapt</a>
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999;">
              This email was sent to ${normalizedEmail} because you requested access to Resume Adapt.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP config missing. User approved, but notification email not sent.");
    }

    return new NextResponse(
      renderHTML(
        "Access Approved",
        "The email has been successfully approved. The user is now permitted to register and sign in.",
        normalizedEmail,
        true
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("Error in approval flow:", error);
    return new NextResponse(
      renderHTML(
        "Internal Error",
        "An unexpected server error occurred during the approval process.",
        error.message || "Unknown Error",
        false
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
