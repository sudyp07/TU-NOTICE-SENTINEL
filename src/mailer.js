// src/mailer.js
import nodemailer from 'nodemailer';

/**
 * Send an email using Gmail SMTP
 * 
 * @param {Object} options
 * @param {string} options.user - Gmail address
 * @param {string} options.appPassword - Gmail App Password
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {Array} options.attachments - Email attachments (optional)
 * @returns {Promise<Object>} Nodemailer send result
 */
export async function sendEmail({
  user,
  appPassword,
  to,
  subject,
  text,
  html,
  attachments = [],
} = {}) {
  if (!user || !appPassword || !to) {
    throw new Error('Missing required email parameters: user, appPassword, or to');
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: user,
      pass: appPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
    pool: true,
    maxConnections: 1,
    rateDelta: 1000,
    rateLimit: 1,
  });

  // Verify connection
  await transporter.verify();

  // Send email
  const info = await transporter.sendMail({
    from: `"TU Notice Sentinel" <${user}>`,
    to: to,
    subject: subject || 'TU Notice Sentinel',
    text: text || '',
    html: html || text || '',
    attachments,
  });

  return info;
}

/**
 * Send email with HTML content (alias for sendEmail)
 */
export function sendHTMLEmail(options) {
  return sendEmail(options);
}