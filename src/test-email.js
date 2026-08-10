import 'dotenv/config';
import { sendEmail } from './mailer.js';

const user = process.env.GMAIL_USER;
const appPassword = process.env.GMAIL_APP_PASSWORD;
const to = process.env.EMAIL_TO;

if (!user || !appPassword || !to) {
  console.error(
    'Missing GMAIL_USER, GMAIL_APP_PASSWORD, or EMAIL_TO.'
  );
  process.exit(1);
}

try {
  await sendEmail({
    user,
    appPassword,
    to,
    subject: 'TU Notice Sentinel test email',
    text:
      'Your TU Notice Sentinel email connection is working.\n\n' +
      `Sent: ${new Date().toISOString()}`,
    html: `
      <h2>TU Notice Sentinel</h2>
      <p>Your Gmail connection is working.</p>
      <p>Sent: ${new Date().toISOString()}</p>
    `,
  });

  console.log('Test email sent successfully.');
} catch (error) {
  console.error('[MAILER] Gmail SMTP failure:', {
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    message: error.message,
  });

  process.exit(1);
}