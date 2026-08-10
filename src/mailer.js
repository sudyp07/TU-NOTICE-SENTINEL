import nodemailer from "nodemailer";

export async function sendEmail({
  user,
  appPassword,
  to,
  subject,
  html,
  text,
}) {
  if (!user || !appPassword || !to) {
    throw new Error(
      "Missing email configuration: GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO",
    );
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: appPassword.replace(/\s+/g, ""),
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  try {
    await transporter.verify();

    console.log("[MAILER] Gmail SMTP connection verified.");

    return await transporter.sendMail({
      from: `"TU Notice Sentinel" <${user}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error("[MAILER] Gmail SMTP failure:", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
      message: error.message,
    });

    throw error;
  }
}
