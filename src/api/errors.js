export class AppError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function redactError(error) {
  const secrets = [
    process.env.API_SECRET,
    process.env.GMAIL_APP_PASSWORD,
    process.env.GITHUB_TOKEN,
  ].filter(Boolean);
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) message = message.replaceAll(secret, '[REDACTED]');
  return message.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]');
}
