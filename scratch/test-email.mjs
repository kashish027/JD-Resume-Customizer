import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASSWORD;
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465");

console.log("SMTP User:", smtpUser);
console.log("SMTP Pass:", smtpPass ? "***" : "undefined");
console.log("SMTP Host:", smtpHost);
console.log("SMTP Port:", smtpPort);

if (!smtpUser || !smtpPass) {
  console.error("SMTP credentials missing!");
  process.exit(1);
}

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
  to: "kgarg2@slb.com",
  subject: "Testing Resume Adapt SMTP Configuration",
  html: `<p>This is a test email.</p>`,
};

console.log("Sending mail...");
transporter.sendMail(mailOptions)
  .then(info => {
    console.log("Mail sent successfully!", info);
  })
  .catch(err => {
    console.error("Error sending mail:", err);
  });
