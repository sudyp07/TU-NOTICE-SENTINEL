// src/test-email.js
import 'dotenv/config';
import { sendEmail } from './mailer.js';
import { createTransport } from 'nodemailer';

const user = process.env.GMAIL_USER;
const appPassword = process.env.GMAIL_APP_PASSWORD;
const to = process.env.EMAIL_TO;

if (!user || !appPassword || !to) {
  console.error(
    '❌ Missing required environment variables:'
  );
  console.error('  GMAIL_USER:', user ? '✅ Set' : '❌ Missing');
  console.error('  GMAIL_APP_PASSWORD:', appPassword ? '✅ Set' : '❌ Missing');
  console.error('  EMAIL_TO:', to ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

console.log('📧 Testing Gmail connection...');
console.log(`  From: ${user}`);
console.log(`  To: ${to}`);

try {
  // Option 1: Use the sendEmail function from mailer.js
  // This assumes sendEmail accepts these parameters
  await sendEmail({
    user,
    appPassword,
    to,
    subject: 'TU Notice Sentinel Test Email',
    text: `TU Notice Sentinel email test

Sent: ${new Date().toISOString()}
From: ${user}
To: ${to}

If you received this email, your Gmail configuration is working correctly.

---
TU Notice Sentinel v3.3.0
`,
    html: `
      <h2>📧 TU Notice Sentinel Test Email</h2>
      <p><strong>Status:</strong> ✅ Working</p>
      <p><strong>Sent:</strong> ${new Date().toISOString()}</p>
      <p><strong>From:</strong> ${user}</p>
      <p><strong>To:</strong> ${to}</p>
      <hr>
      <p>If you received this email, your Gmail configuration is working correctly.</p>
      <p><small>TU Notice Sentinel v3.3.0</small></p>
    `
  });

  console.log('✅ Test email sent successfully!');
  console.log(`📬 Check your inbox at ${to}`);
  process.exit(0);
  
} catch (error) {
  console.error('❌ Gmail SMTP failure:');
  console.error('  Error:', error.message);
  console.error('  Code:', error.code);
  console.error('  Response:', error.response);
  console.error('  ResponseCode:', error.responseCode);
  
  // Detailed debugging
  if (error.code === 'EAUTH') {
    console.error('\n🔑 Authentication failed!');
    console.error('  Make sure:');
    console.error('  1. GMAIL_USER is correct');
    console.error('  2. GMAIL_APP_PASSWORD is correct (use App Password, not regular password)');
    console.error('  3. 2-Step Verification is enabled in your Google account');
    console.error('  4. The App Password was generated for this specific application');
  }
  
  if (error.code === 'ESOCKET') {
    console.error('\n🌐 Network error!');
    console.error('  Make sure:');
    console.error('  1. You have internet access');
    console.error('  2. Port 587 or 465 is not blocked');
    console.error('  3. Your firewall allows outgoing connections');
  }
  
  process.exit(1);
}