import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";

import { createAuth } from "./auth.js";
import { AppError, redactError } from "./errors.js";

const booleanValue = (value) => value === true || value === "true";

const sortNotices = (notices) =>
  [...notices].sort((left, right) => {
    const leftDate = left.adDate || left.bsDate || left.discoveredAt || "";

    const rightDate = right.adDate || right.bsDate || right.discoveredAt || "";

    return (
      String(rightDate).localeCompare(String(leftDate)) ||
      String(right.id).localeCompare(String(left.id))
    );
  });

const normalizeNotice = (notice) => ({
  id: String(notice.id || notice.noticeId || notice.url || ""),

  title: String(notice.title || "Untitled notice"),

  url: String(notice.url || notice.link || ""),

  bsDate: notice.bsDate || null,

  adDate: notice.adDate || null,

  originalDate: notice.originalDate || notice.bsDate || notice.adDate || null,

  isNew: Boolean(notice.isNew),

  isRead: Boolean(notice.isRead),

  discoveredAt: notice.discoveredAt || null,
});

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
   * ---------------------------------------------------------
   * HEALTH
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * AUTH
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * STATUS
   * ---------------------------------------------------------
   */

  app.get("/api/status", async (_request, response) => {
    const status = await adapter.getStatus();

    response.json({
      ...status,
      serverTime: new Date().toISOString(),
    });
  });

  /*
   * ---------------------------------------------------------
   * NOTICES
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * LATEST NOTICE
   * ---------------------------------------------------------
   */

  app.get("/api/notices/latest", async (_request, response) => {
    const notices = sortNotices(
      (await adapter.listNotices()).map(normalizeNotice),
    );

    response.json({
      notice: notices[0] || null,
    });
  });

  /*
   * ---------------------------------------------------------
   * LOGS
   * ---------------------------------------------------------
   */

  app.get("/api/logs", async (request, response) => {
    const requestedLevel = String(request.query.level || "").toUpperCase();

    const level = ["INFO", "WARN", "ERROR"].includes(requestedLevel)
      ? requestedLevel
      : null;

    const logs = (await adapter.listLogs())
      .filter((entry) => !level || String(entry.level).toUpperCase() === level)
      .slice(-500)
      .reverse();

    response.json({
      logs,
    });
  });

  /*
   * ---------------------------------------------------------
   * CLEAR LOGS
   * ---------------------------------------------------------
   */

  app.delete("/api/logs", async (_request, response) => {
    await adapter.clearLogs();

    response.status(204).end();
  });

  /*
   * ---------------------------------------------------------
   * NOTIFICATION HISTORY
   * ---------------------------------------------------------
   */

  app.get("/api/notifications", async (_request, response) => {
    const notifications = (await adapter.listNotifications())
      .slice(-200)
      .reverse();

    response.json({
      notifications,
    });
  });

  /*
   * ---------------------------------------------------------
   * RUN BOT NOW
   * ---------------------------------------------------------
   *
   * This does NOT scrape TU from Render.
   *
   * It queues:
   *
   * Render
   *   ↓
   * GitHub Actions
   *   ↓
   * TU scraper
   *   ↓
   * Gmail
   */

  app.post("/api/check", async (_request, response) => {
    const result = await adapter.checkNow("check");

    response.status(202).json({
      accepted: true,
      queued: true,

      mode: "check",

      message: result.message || "TU Notice Sentinel workflow was queued.",
    });
  });

  /*
   * ---------------------------------------------------------
   * ENABLE BOT
   * ---------------------------------------------------------
   */

  app.post("/api/bot/enable", async (_request, response) => {
    const result = await adapter.setEnabled(true);

    response.json(result);
  });

  /*
   * ---------------------------------------------------------
   * DISABLE BOT
   * ---------------------------------------------------------
   */

  app.post("/api/bot/disable", async (_request, response) => {
    const result = await adapter.setEnabled(false);

    response.json(result);
  });

  /*
   * ---------------------------------------------------------
   * BOT TESTS
   * ---------------------------------------------------------
   */

  app.post("/api/bot/test", async (_request, response) => {
    const result = await adapter.runTests();

    response.json({
      result,
    });
  });

  /*
   * ---------------------------------------------------------
   * TEST EMAIL
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Render DOES NOT connect to Gmail.
   *
   * Instead:
   *
   * Android
   *   ↓
   * Render
   *   ↓
   * GitHub Actions
   *   ↓
   * src/test-email.js
   *   ↓
   * Nodemailer
   *   ↓
   * Gmail SMTP
   *
   * This avoids Render's SMTP connection timeout.
   */

  app.post("/api/test-email", async (_request, response) => {
    const result = await adapter.checkNow("test-email");

    response.status(202).json({
      accepted: true,
      queued: true,

      mode: "test-email",

      message: result.message || "Gmail test workflow was queued successfully.",
    });
  });

  /*
   * ---------------------------------------------------------
   * GITHUB WORKFLOW
   * ---------------------------------------------------------
   *
   * Allows the app to explicitly
   * trigger the configured workflow.
   *
   * Optional body:
   *
   * {
   *   "mode": "check"
   * }
   *
   * or:
   *
   * {
   *   "mode": "test-email"
   * }
   */

  app.post("/api/github/workflow", async (request, response) => {
    const mode = request.body?.mode || "check";

    if (!["check", "test-email"].includes(mode)) {
      throw new AppError(
        400,
        "INVALID_WORKFLOW_MODE",
        "Workflow mode must be either check or test-email.",
      );
    }

    const result = await adapter.checkNow(mode);

    response.status(202).json(result);
  });

  /*
   * ---------------------------------------------------------
   * GITHUB WORKFLOW STATUS
   * ---------------------------------------------------------
   */

  app.get("/api/github/status", async (_request, response) => {
    const result = await adapter.github.latestWorkflowStatus();

    response.json(result);
  });

  /*
   * ---------------------------------------------------------
   * 404
   * ---------------------------------------------------------
   */

  app.use((_request, _response, next) => {
    next(new AppError(404, "NOT_FOUND", "Endpoint not found"));
  });

  /*
   * ---------------------------------------------------------
   * ERROR HANDLER
   * ---------------------------------------------------------
   */

  app.use((error, _request, response, _next) => {
    const status = error instanceof AppError ? error.status : 500;

    const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";

    const message =
      status >= 500 && !(error instanceof AppError)
        ? "The Sentinel server could not complete the request."
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
