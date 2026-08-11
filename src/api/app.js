import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { createAuth } from "./auth.js";
import { AppError, redactError } from "./errors.js";

const API_VERSION = "3.3.3";

const booleanValue = (value) => value === true || value === "true";

const asyncRoute = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

const sortNotices = (notices) =>
  [...notices].sort((left, right) => {
    const leftDate =
      left.adDate ||
      left.bsDate ||
      left.date ||
      left.discoveredAt ||
      "";

    const rightDate =
      right.adDate ||
      right.bsDate ||
      right.date ||
      right.discoveredAt ||
      "";

    return (
      String(rightDate).localeCompare(String(leftDate)) ||
      String(right.id).localeCompare(String(left.id))
    );
  });

const normalizeNotice = (notice = {}) => {
  const adDate = notice.adDate || null;
  const bsDate = notice.bsDate || null;
  const originalDate =
    notice.originalDate ||
    adDate ||
    bsDate ||
    null;

  const date =
    notice.date ||
    adDate ||
    bsDate ||
    null;

  return {
    id: String(
      notice.id ||
      notice.noticeId ||
      notice.url ||
      "",
    ),

    title: String(
      notice.title ||
      "Untitled notice",
    ),

    url: String(
      notice.url ||
      notice.link ||
      "",
    ),

    adDate,
    bsDate,
    originalDate,
    date,

    isNew: Boolean(notice.isNew),
    isRead: Boolean(notice.isRead),

    discoveredAt:
      notice.discoveredAt ||
      null,
  };
};

const invokeAdapter = (adapter, method, ...args) => {
  const operation = adapter?.[method];

  if (typeof operation !== "function") {
    throw new AppError(
      501,
      "ADAPTER_METHOD_NOT_AVAILABLE",
      `The configured adapter does not provide ${method}().`,
    );
  }

  return operation.apply(adapter, args);
};

/*
 * Read-only adapter operations should not prevent the
 * Android application from connecting.
 *
 * If the adapter fails, the API returns safe degraded
 * data and records the real error in the Render logs.
 */
const safeAdapterRead = async (
  label,
  operation,
  fallback,
) => {
  try {
    return {
      value: await operation(),
      degraded: false,
      adapterError: null,
    };
  } catch (error) {
    const safeMessage = redactError(error);

    console.error(
      `[adapter:${label}] ${safeMessage}`,
    );

    return {
      value: fallback,
      degraded: true,
      adapterError:
        `${label} failed: ${safeMessage}`,
    };
  }
};

export function createApp({
  adapter,
  apiSecret = process.env.API_SECRET,
  tokenTtl = Number(
    process.env.TOKEN_TTL_SECONDS ||
    900,
  ),
} = {}) {
  if (!adapter) {
    throw new Error(
      "createApp() requires an adapter",
    );
  }

  const app = express();

  const auth = createAuth(
    apiSecret,
    tokenTtl,
  );

  /*
   * Render uses one trusted reverse proxy.
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
   * Safe request logging.
   *
   * Headers, API secrets and Bearer tokens
   * are not logged.
   */
  app.use(
    (request, response, next) => {
      const startedAt = Date.now();

      response.once("finish", () => {
        console.log(
          `${request.method} ` +
          `${request.originalUrl} -> ` +
          `${response.statusCode} ` +
          `(${Date.now() - startedAt}ms)`,
        );
      });

      next();
    },
  );

  /*
   * Global rate limiter.
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
   * Public health endpoint.
   */
  app.get(
    "/health",
    (_request, response) => {
      response.json({
        ok: true,
        service:
          "tu-notice-sentinel-api",
        version: API_VERSION,
        time: new Date().toISOString(),
      });
    },
  );

  /*
   * Exchange the API secret for a
   * temporary Bearer token.
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
   * a valid Bearer token.
   */
  app.use(
    "/api",
    auth.requireToken,
  );

  /*
   * Protected route diagnostic.
   */
  app.get(
    "/api/routes",
    (_request, response) => {
      response.json({
        ok: true,
        version: API_VERSION,

        routes: [
          "GET /api/status",
          "GET /api/notices",
          "GET /api/notices/latest",
          "GET /api/logs",
          "GET /api/notifications",
          "POST /api/check",
          "POST /api/bot/enabled",
          "POST /api/tests/run",
          "POST /api/notifications/test",
          "DELETE /api/logs",
        ],
      });
    },
  );

  /*
   * STATUS
   */
  app.get(
    "/api/status",

    asyncRoute(
      async (_request, response) => {
        const read =
          await safeAdapterRead(
            "getStatus",

            () =>
              invokeAdapter(
                adapter,
                "getStatus",
              ),

            {},
          );

        const status =
          read.value &&
          typeof read.value === "object"
            ? read.value
            : {};

        response.json({
          configured:
            status.configured ??
            adapter.configured === true,

          online:
            Boolean(status.online),

          bot:
            String(
              status.bot ??
              (read.degraded
                ? "error"
                : "unknown"),
            ),

          website:
            String(
              status.website ??
              "unknown",
            ),

          scraper:
            String(
              status.scraper ??
              "unknown",
            ),

          state:
            String(
              status.state ??
              (read.degraded
                ? "degraded"
                : "unknown"),
            ),

          gmail:
            String(
              status.gmail ??
              "unknown",
            ),

          github:
            String(
              status.github ??
              "unknown",
            ),

          lastChecked:
            status.lastChecked ??
            null,

          lastSuccessfulRun:
            status.lastSuccessfulRun ??
            null,

          lastFailedRun:
            status.lastFailedRun ??
            null,

          lastError:
            status.lastError ??
            read.adapterError,

          noticesScanned:
            Number(
              status.noticesScanned ||
              0,
            ),

          storedNotices:
            Number(
              status.storedNotices ||
              0,
            ),

          newNotices:
            Number(
              status.newNotices ||
              0,
            ),

          emailsSent:
            Number(
              status.emailsSent ||
              0,
            ),

          version:
            String(
              status.version ||
              API_VERSION,
            ),

          serverTime:
            new Date().toISOString(),

          degraded:
            read.degraded,

          adapterError:
            read.adapterError,
        });
      },
    ),
  );

  /*
   * NOTICES
   */
  app.get(
    "/api/notices",

    asyncRoute(
      async (request, response) => {
        const search =
          String(
            request.query.search ||
            "",
          )
            .trim()
            .toLowerCase();

        const unreadOnly =
          booleanValue(
            request.query.unreadOnly,
          );

        const requestedLimit =
          Number(
            request.query.limit ||
            100,
          );

        const limit = Math.min(
          200,

          Math.max(
            1,

            Number.isFinite(
              requestedLimit,
            )
              ? requestedLimit
              : 100,
          ),
        );

        const read =
          await safeAdapterRead(
            "listNotices",

            () =>
              invokeAdapter(
                adapter,
                "listNotices",
              ),

            [],
          );

        const notices =
          Array.isArray(read.value)
            ? read.value.map(
                normalizeNotice,
              )
            : [];

        const filtered =
          notices.filter(
            (notice) =>
              (
                !search ||
                notice.title
                  .toLowerCase()
                  .includes(search)
              ) &&
              (
                !unreadOnly ||
                !notice.isRead
              ),
          );

        response.json({
          notices:
            sortNotices(filtered)
              .slice(0, limit),

          total:
            filtered.length,

          degraded:
            read.degraded,

          adapterError:
            read.adapterError,
        });
      },
    ),
  );

  /*
   * LATEST NOTICE
   */
  app.get(
    "/api/notices/latest",

    asyncRoute(
      async (_request, response) => {
        const read =
          await safeAdapterRead(
            "listNotices",

            () =>
              invokeAdapter(
                adapter,
                "listNotices",
              ),

            [],
          );

        const notices =
          Array.isArray(read.value)
            ? read.value.map(
                normalizeNotice,
              )
            : [];

        response.json({
          notice:
            sortNotices(notices)[0] ||
            null,

          degraded:
            read.degraded,

          adapterError:
            read.adapterError,
        });
      },
    ),
  );

  /*
   * LOGS
   */
  app.get(
    "/api/logs",

    asyncRoute(
      async (_request, response) => {
        const read =
          await safeAdapterRead(
            "listLogs",

            () =>
              invokeAdapter(
                adapter,
                "listLogs",
              ),

            [],
          );

        const logs =
          Array.isArray(read.value)
            ? read.value
            : [];

        response.json({
          logs,
          total: logs.length,

          degraded:
            read.degraded,

          adapterError:
            read.adapterError,
        });
      },
    ),
  );

  /*
   * NOTIFICATIONS
   */
  app.get(
    "/api/notifications",

    asyncRoute(
      async (_request, response) => {
        const read =
          await safeAdapterRead(
            "listNotifications",

            () =>
              invokeAdapter(
                adapter,
                "listNotifications",
              ),

            [],
          );

        const notifications =
          Array.isArray(read.value)
            ? read.value
            : [];

        response.json({
          notifications,

          total:
            notifications.length,

          degraded:
            read.degraded,

          adapterError:
            read.adapterError,
        });
      },
    ),
  );

  /*
   * CHECK NOW
   */
  app.post(
    "/api/check",

    asyncRoute(
      async (request, response) => {
        const mode =
          String(
            request.body?.mode ||
            "check",
          );

        const result =
          await invokeAdapter(
            adapter,
            "checkNow",
            mode,
          );

        response
          .status(202)
          .json({
            ok: true,
            ...(result || {}),
          });
      },
    ),
  );

  /*
   * ENABLE OR DISABLE BOT
   */
  app.post(
    "/api/bot/enabled",

    asyncRoute(
      async (request, response) => {
        const enabled =
          booleanValue(
            request.body?.enabled,
          );

        const result =
          await invokeAdapter(
            adapter,
            "setEnabled",
            enabled,
          );

        response.json({
          ok: true,
          enabled,
          ...(result || {}),
        });
      },
    ),
  );

  /*
   * RUN TESTS
   */
  app.post(
    "/api/tests/run",

    asyncRoute(
      async (_request, response) => {
        const result =
          await invokeAdapter(
            adapter,
            "runTests",
          );

        response.json(
          result || {
            ok: true,
          },
        );
      },
    ),
  );

  /*
   * CREATE A TEST NOTIFICATION
   */
  app.post(
    "/api/notifications/test",

    asyncRoute(
      async (request, response) => {
        const notification = {
          id:
            request.body?.id ||
            `test-${Date.now()}`,

          type:
            request.body?.type ||
            "test",

          noticeCount:
            Number(
              request.body
                ?.noticeCount ||
              0,
            ),

          timestamp:
            new Date().toISOString(),

          recipient:
            request.body?.recipient ||
            "hidden",

          status:
            request.body?.status ||
            "accepted",

          summary:
            request.body?.summary ||
            request.body?.message ||
            "Test notification",

          message:
            request.body?.message ||
            "Test notification",

          createdAt:
            new Date().toISOString(),
        };

        await invokeAdapter(
          adapter,
          "recordNotification",
          notification,
        );

        response
          .status(201)
          .json({
            ok: true,
            notification,
          });
      },
    ),
  );

  /*
   * CLEAR LOGS
   */
  app.delete(
    "/api/logs",

    asyncRoute(
      async (_request, response) => {
        await invokeAdapter(
          adapter,
          "clearLogs",
        );

        response.json({
          ok: true,
          message: "Logs cleared.",
        });
      },
    ),
  );

  /*
   * Explicit unmatched-route handler.
   */
  app.use(
    (request, _response, next) => {
      next(
        new AppError(
          404,
          "NOT_FOUND",
          `Endpoint not found: ${request.method} ${request.originalUrl}`,
        ),
      );
    },
  );

  /*
   * Final error handler.
   */
  app.use(
    (
      error,
      request,
      response,
      _next,
    ) => {
      const isAppError =
        error instanceof AppError;

      const candidateStatus =
        Number(
          error?.statusCode ||
          error?.status ||
          error?.response?.status ||
          500,
        );

      /*
       * A 404 thrown by an upstream adapter
       * is not an Express route 404.
       */
      const upstreamNotFound =
        !isAppError &&
        candidateStatus === 404;

      const status =
        upstreamNotFound
          ? 502
          : Number.isInteger(
                candidateStatus,
              )
            ? candidateStatus
            : 500;

      const message =
        redactError(error);

      if (!isAppError) {
        console.error(
          `${request.method} ` +
          `${request.originalUrl}: ` +
          message,
        );
      }

      return response
        .status(status)
        .json({
          error:
            upstreamNotFound
              ? "ADAPTER_UPSTREAM_NOT_FOUND"
              : error?.code ||
                (
                  status >= 500
                    ? "INTERNAL_SERVER_ERROR"
                    : "API_ERROR"
                ),

          message:
            isAppError
              ? error.message
              : upstreamNotFound
                ? "The configured adapter requested an upstream resource that does not exist."
                : "An unexpected server error occurred.",

          path:
            request.originalUrl,

          method:
            request.method,
        });
    },
  );

  return app;
}
