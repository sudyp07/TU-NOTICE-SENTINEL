import "dotenv/config";
import { sendEmail } from "./mailer.js";

const timestamp = new Date().toISOString();

await sendEmail({
  user: process.env.GMAIL_USER,
  appPassword: process.env.GMAIL_APP_PASSWORD,
  to: process.env.EMAIL_TO,
  subject: "TU Notice Sentinel - Test Email",
  text: [
    "TU Notice Sentinel Gmail connection is working.",
    "",
    `Sent: ${timestamp}`,
    "",
    "This email was sent by GitHub Actions using Google Gmail SMTP.",
  ].join("\n"),
  html: `
    <h2>TU Notice Sentinel</h2>
    <p>Gmail connection is working successfully.</p>
    <p>Sent: ${timestamp}</p>
    <p>This email was sent by GitHub Actions using Google Gmail SMTP.</p>
  `,
});

console.log("Test email sent successfully.");