import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { maskEmail } from '../email.js';
import { sendEmail } from '../mailer.js';
import { createAuth } from './auth.js';
import { AppError, redactError } from './errors.js';

const booleanValue = (value) => value === true || value === 'true';

const sortNotices = (notices) =>
  [...notices].sort((left, right) => {
    const leftDate =
      left.adDate || left.bsDate || left.discoveredAt || '';

    const rightDate =
      right.adDate || right.bsDate || right.discoveredAt || '';

    return (
      String(rightDate).localeCompare(String(leftDate)) ||
      String(right.id).localeCompare(String(left.id))
    );
  });

const normalizeNotice = (notice) => ({
  id: String(notice.id || notice.noticeId || notice.url || ''),
  title: String(notice.title || 'Untitled notice'),
  url: String(notice.url || notice.link || ''),
  bsDate: notice.bsDate || null,
  adDate: notice.adDate || null,
  originalDate:
    notice.originalDate ||
    notice.bsDate ||
    notice.adDate ||
    null,
  isNew: Boolean(notice.isNew),
  isRead: Boolean(notice.isRead),
  discoveredAt: notice.discoveredAt || null,
});

export function createApp({
  adapter,
  apiSecret = process.env.API_SECRET,
  tokenTtl = Number(process.env.TOKEN_TTL_SECONDS || 900),
  env = process.env,
  sendEmailImpl = sendEmail,
}) {
  const app = express();
  const auth = createAuth(apiSecret, tokenTtl);

  /*
   * Render terminates HTTPS and forwards the real client address
   * through one reverse proxy. This must be configured before
   * express-rate-limit is registered.
   */
  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      service: 'tu-notice-sentinel-api',
      version: '3.3.0',
    });
  });

  app.post(
    '/api/auth/token',
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
    auth.issue,
  );

  app.use('/api', auth.requireToken);

  app.get('/api/status', async (_request, response) => {
    response.json({
      ...(await adapter.getStatus()),
      serverTime: new Date().toISOString(),
    });
  });

  app.get('/api/notices', async (request, response) => {
    const search = String(request.query.search || '')
      .trim()
      .toLowerCase();

    const unreadOnly = booleanValue(request.query.unreadOnly);

    const limit = Math.min(
      200,
      Math.max(1, Number(request.query.limit || 100)),
    );

    const notices = (await adapter.listNotices()).map(
      normalizeNotice,
    );

    const filtered = notices.filter(
      (notice) =>
        (!search ||
          notice.title.toLowerCase().includes(search)) &&
        (!unreadOnly || !notice.isRead),
    );

    response.json({
      notices: sortNotices(filtered).slice(0, limit),
      total: filtered.length,
    });
  });

  app.get('/api/notices/latest', async (_request, response) => {
    const notices = sortNotices(
      (await adapter.listNotices()).map(normalizeNotice),
    );

    response.json({
      notice: notices[0] || null,
    });
  });

  app.get('/api/logs', async (request, response) => {
    const requestedLevel = String(
      request.query.level || '',
    ).toUpperCase();

    const level = ['INFO', 'WARN', 'ERROR'].includes(
      requestedLevel,
    )
      ? requestedLevel
      : null;

    const logs = (await adapter.listLogs())
      .filter(
        (entry) =>
          !level ||
          String(entry.level).toUpperCase() === level,
      )
      .slice(-500)
      .reverse();

    response.json({ logs });
  });

  app.delete('/api/logs', async (_request, response) => {
    await adapter.clearLogs();
    response.status(204).end();
  });

  app.get('/api/notifications', async (_request, response) => {
    const notifications = (
      await adapter.listNotifications()
    )
      .slice(-200)
      .reverse();

    response.json({ notifications });
  });

  app.post('/api/check', async (_request, response) => {
    const result = await adapter.checkNow();

    response.status(202).json({
      accepted: true,
      message: result.message || 'Workflow queued.',
    });
  });

  app.post('/api/bot/enable', async (_request, response) => {
    response.json(await adapter.setEnabled(true));
  });

  app.post('/api/bot/disable', async (_request, response) => {
    response.json(await adapter.setEnabled(false));
  });

  app.post('/api/bot/test', async (_request, response) => {
    response.json({
      result: await adapter.runTests(),
    });
  });

  app.post('/api/test-email', async (_request, response) => {
    if (
      !env.GMAIL_USER ||
      !env.GMAIL_APP_PASSWORD ||
      !env.EMAIL_TO
    ) {
      throw new AppError(
        503,
        'GMAIL_NOT_CONFIGURED',
        'Gmail is not configured on the server.',
      );
    }

    const timestamp = new Date().toISOString();

    const result = await sendEmailImpl({
      user: env.GMAIL_USER,
      appPassword: env.GMAIL_APP_PASSWORD,
      to: env.EMAIL_TO,
      subject: 'TU Notice Sentinel test email',
      text:
        `Your TU Notice Sentinel email connection is working.` +
        `\n\nSent: ${timestamp}`,
      html:
        `<h2>TU Notice Sentinel</h2>` +
        `<p>Your Gmail connection is working.</p>` +
        `<p>Sent: ${timestamp}</p>`,
    });

    const accepted = Array.isArray(result.accepted)
      ? result.accepted.length > 0
      : result.accepted !== false;

    try {
      await adapter.recordNotification({
        id: `test-${Date.now()}`,
        type: 'email',
        noticeCount: 0,
        timestamp,
        recipient: maskEmail(env.EMAIL_TO),
        status: accepted ? 'accepted' : 'rejected',
        summary: 'Test email',
      });
    } catch (error) {
      console.error(
        `[NOTIFICATION_RECORD_FAILED] ${redactError(error)}`,
      );
    }

    response.json({
      accepted,
      message: accepted
        ? 'Test email sent successfully.'
        : 'Gmail did not accept the message.',
    });
  });

  app.post(
    '/api/github/workflow',
    async (_request, response) => {
      response
        .status(202)
        .json(await adapter.github.triggerWorkflow());
    },
  );

  app.get(
    '/api/github/status',
    async (_request, response) => {
      response.json(
        await adapter.github.latestWorkflowStatus(),
      );
    },
  );

  app.use((_request, _response, next) => {
    next(
      new AppError(
        404,
        'NOT_FOUND',
        'Endpoint not found',
      ),
    );
  });

  app.use((error, _request, response, _next) => {
    const status =
      error instanceof AppError ? error.status : 500;

    const code =
      error instanceof AppError
        ? error.code
        : 'INTERNAL_ERROR';

    const message =
      status >= 500 && !(error instanceof AppError)
        ? 'The Sentinel server could not complete the request.'
        : redactError(error);

    if (status >= 500) {
      console.error(`[${code}] ${redactError(error)}`);
    }

    response.status(status).json({
      error: {
        code,
        message,
        details: error.details || null,
      },
    });
  });

  return app;
}