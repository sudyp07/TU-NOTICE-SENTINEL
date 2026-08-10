import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { createAuth } from "./auth.js";
import { AppError, redactError } from "./errors.js";

const booleanValue = (value) => value === true || value === "true";

const sortNotices = (notices) =>
  [...notices].sort((left, right) => {
    const leftDate =
      left.adDate || left.bsDate || left.date || left.discoveredAt || "";

    const rightDate =
      right.adDate || right.bsDate || right.date || right.discoveredAt || "";

    return (
      String(rightDate).localeCompare(String(leftDate)) ||
      String(right.id).localeCompare(String(left.id))
    );
  });

/**
 * Normalize a notice into the Android/API data contract.
 *
 * Important:
 * - adDate is the canonical AD/Gregorian date.
 * - bsDate is kept separately when available.
 * - originalDate preserves the original date information.
 * - date is provided as a compatibility field for the Android app.
 */
const normalizeNotice = (notice) => {
  const adDate = notice.adDate || null;
  const bsDate = notice.bsDate || null;

  const originalDate = notice.originalDate || adDate || bsDate || null;

  /*
   * Android compatibility field.
   *
   * The Android app can simply display:
   *
   * notice.date
   *
   * Prefer AD date because the application intentionally
   * stores Gregorian/AD dates as its primary notice date.
   */
  const date = notice.date || adDate || bsDate || null;

  return {
    id: String(notice.id || notice.noticeId || notice.url || ""),
    title: String(notice.title || "Untitled notice"),
    url: String(notice.url || notice.link || ""),

    // Canonical date fields.
    adDate,
    bsDate,
    originalDate,

    // Android compatibility field.
    date,

    isNew: Boolean(notice.isNew),
    isRead: Boolean(notice.isRead),
    discoveredAt: notice.discoveredAt || null,
  };
};

export function createApp({
  adapter,
  apiSecret = process.env.API_SECRET,
  tokenTtl = Number(process.env.TOKEN_TTL_SECONDS || 900),
  env = process.env,
}) {
  const app = express();

  const auth = createAuth(apiSecret, tokenTtl);

  /*
   * Render terminates HTTPS and forwards
   * the original client address through
   * one reverse proxy.
   */
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());

  app.use(
    express.json({
      limit: "32kb",
    }),
  );

  /*
   * Global API rate limit.
   */
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  /*
   * HEALTH
   */
  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      service: "tu-notice-sentinel-api",
      version: "3.3.0",
      time: new Date().toISOString(),
    });
  });

  /*
   * AUTH
   *
   * Android sends:
   *
   * X-API-Key: your-secret
   *
   * and receives a temporary Bearer token.
   */
  app.post(
    "/api/auth/token",
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    auth.issue,
  );

  /*
   * Everything below /api requires
   * a valid session token.
   */
  app.use("/api", auth.requireToken);

  /*
   * STATUS
   */
  app.get("/api/status", async (_request, response) => {
    const status = await adapter.getStatus();

    response.json({
      ...status,
      serverTime: new Date().toISOString(),
    });
  });

  /*
   * NOTICES
   */
  app.get("/api/notices", async (request, response) => {
    const search = String(request.query.search || "")
      .trim()
      .toLowerCase();

    const unreadOnly = booleanValue(request.query.unreadOnly);

    const limit = Math.min(
      200,
      Math.max(1, Number(request.query.limit || 100)),
    );

    const notices = (await adapter.listNotices()).map(normalizeNotice);

    const filtered = notices.filter(
      (notice) =>
        (!search || notice.title.toLowerCase().includes(search)) &&
        (!unreadOnly || !notice.isRead),
    );

    const sorted = sortNotices(filtered);

    response.json({
      notices: sorted.slice(0, limit),
      total: filtered.length,
    });
  });

  /*
   * LATEST NOTICE
   */
  app.get("/api/notices/latest", async (_request, response) => {
    const notices = (await adapter.listNotices()).map(normalizeNotice);

    const sorted = sortNotices(notices);

    response.json({
      notice: sorted[0] || null,
    });
  });

  /*
   * LOGS
   */
  app.get("/api/logs", async (_request, response) => {
    const logs = await adapter.listLogs();

    response.json({
      logs,
      total: logs.length,
    });
  });

  /*
   * NOTIFICATIONS
   */
  app.get("/api/notifications", async (_request, response) => {
    const notifications = await adapter.listNotifications();

    response.json({
      notifications,
      total: notifications.length,
    });
  });

  /*
   * CHECK NOW
   */
  app.post("/api/check", async (request, response, next) => {
    try {
      const mode = String(request.body?.mode || "check");

      const result = await adapter.checkNow(mode);

      response.status(202).json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  /*
   * BOT ENABLE / DISABLE
   */
  app.post("/api/bot/enabled", async (request, response, next) => {
    try {
      const enabled = booleanValue(request.body?.enabled);

      const result = await adapter.setEnabled(enabled);

      response.json({
        ok: true,
        enabled,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  /*
   * RUN TESTS
   */
  app.post("/api/tests/run", async (_request, response, next) => {
    try {
      const result = await adapter.runTests();

      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  /*
   * RECORD TEST NOTIFICATION
   */
  app.post("/api/notifications/test", async (request, response, next) => {
    try {
      const notification = {
        id: request.body?.id || `test-${Date.now()}`,

        status: request.body?.status || "accepted",

        message: request.body?.message || "Test notification",

        createdAt: new Date().toISOString(),
      };

      await adapter.recordNotification(notification);

      response.status(201).json({
        ok: true,
        notification,
      });
    } catch (error) {
      next(error);
    }
  });

  /*
   * CLEAR LOGS
   */
  app.delete("/api/logs", async (_request, response, next) => {
    try {
      await adapter.clearLogs();

      response.json({
        ok: true,
        message: "Logs cleared.",
      });
    } catch (error) {
      next(error);
    }
  });

  /*
   * ERROR HANDLER
   */
  app.use((error, _request, response, _next) => {
    if (error instanceof AppError) {
      const status = Number.isInteger(error.statusCode)
        ? error.statusCode
        : Number.isInteger(error.status)
          ? error.status
          : 500;

      return response.status(status).json({
        error: error.code || "API_ERROR",
        message: error.message || "An API error occurred.",
      });
    }

    console.error(redactError(error));

    return response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
    });
  });

  return app;
}
