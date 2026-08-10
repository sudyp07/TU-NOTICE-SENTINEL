import nodemailer from 'nodemailer';

export async function sendEmail({ user, appPassword, to, subject, html, text }) {
  if (!user || !appPassword || !to) {
    throw new Error('Missing email configuration: GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO');
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: appPassword.replace(/\s+/g, '') },
  });
  return transporter.sendMail({
    from: `"TU Notice Sentinel" <${user}>`,
    to,
    subject,
    text,
    html,
  });
}
