// src/bot.js

import path from "node:path";
import { buildEmail, maskEmail } from "./email.js";
import { sendEmail } from "./mailer.js";
import { fetchNotices } from "./scraper.js";
import {
  appendLog,
  buildState,
  detectNewNotices,
  loadState,
  normalizeState,
  saveState,
} from "./state.js";

const hasGmailConfig = (env) =>
  Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD && env.EMAIL_TO);

/**
 * Main bot workflow
 *
 * @param {Object} options
 * @param {Object} options.env - Environment variables
 * @param {Function} options.fetchNoticesImpl - Fetch notices implementation
 * @param {Function} options.sendEmailImpl - Send email implementation
 * @param {Function} options.now - Date generator
 * @returns {Promise<Object>} Bot run result
 */
export async function runBot({
  env = process.env,
  fetchNoticesImpl = fetchNotices,
  sendEmailImpl = sendEmail,
  now = () => new Date(),
} = {}) {
  const source = env.SOURCE_URL || "https://exam.tu.edu.np/notices";
  const dryRun = env.DRY_RUN === "true";
  const stateFile = env.STATE_FILE || path.resolve("data/state.json");
  const startedAt = now().toISOString();

  let previous;

  try {
    previous = await loadState(stateFile);
  } catch (error) {
    console.error(
      `[${now().toISOString()}] [ERROR] Failed to load state: ${error.message}`
    );

    previous = {
      seenIds: [],
      notices: [],
      status: {},
    };
  }

  const pendingLogs = [];

  const log = (level, message) => {
    const timestamp = now().toISOString();
    const line = `[${timestamp}] [${level}] ${message}`;

    if (level === "ERROR") {
      console.error(line);
    } else {
      console.log(line);
    }

    pendingLogs.push({
      level,
      message,
      timestamp,
    });
  };

  const logger = {
    info: (message) => log("INFO", message),
    warn: (message) => log("WARN", message),
    error: (message) => log("ERROR", message),
    success: (message) => log("INFO", message),
  };

  try {
    log("INFO", "Starting TU Notice Sentinel");
    log("INFO", `Source: ${source}`);
    log("INFO", `Dry run: ${dryRun}`);

    // Fetch notices with pagination.
    const current = await fetchNoticesImpl(
      source,
      Number(env.MAX_PAGES || 20),
      logger
    );

    log("INFO", `Current unique notices collected: ${current.length}`);
    log("INFO", `Previously stored notices: ${previous.seenIds?.length || 0}`);

    // Determine whether this is the first run.
    const firstRun = previous.seenIds?.length === 0 || previous.seenIds?.length === undefined;

    let fresh = detectNewNotices(current, previous);

    if (firstRun) {
      fresh = current.slice(0, Number(env.FIRST_RUN_LIMIT || 10));
      log("INFO", `First run: ${fresh.length} latest notice(s) selected.`);
    } else {
      log("INFO", `New notices detected: ${fresh.length}`);
    }

    // Dry run: Fetch and display notices, but do not send email and do not modify state.
    if (dryRun) {
      console.log("");
      console.log("========== TU NOTICE SENTINEL DRY RUN ==========");
      console.log("");

      if (fresh.length === 0) {
        console.log("No new notices found.");
      } else {
        for (const [index, notice] of fresh.entries()) {
          const date = notice.adDate || notice.bsDate || "Date unavailable";
          console.log(`${index + 1}. ${date} | ${notice.title}`);
          console.log(`   ${notice.url}`);
          console.log("");
        }
      }

      console.log("===============================================");
      console.log("");

      log("INFO", "DRY RUN: no email or state changes.");

      return {
        ok: true,
        dryRun: true,
        firstRun,
        noticesScanned: current.length,
        newNotices: fresh.length,
      };
    }

    // Send email if there are new notices.
    let emailSent = false;

    if (fresh.length > 0) {
      try {
        await sendEmailImpl({
          user: env.GMAIL_USER,
          appPassword: env.GMAIL_APP_PASSWORD,
          to: env.EMAIL_TO,
          ...buildEmail(fresh, firstRun),
        });

        emailSent = true;
        log("INFO", `Email sent with ${fresh.length} notice(s).`);
      } catch (emailError) {
        log("ERROR", `Failed to send email: ${emailError.message}`);
        // Continue with state update even if email fails.
      }
    } else {
      log("INFO", "No new notices. No email sent.");
    }

    // Build and save new state.
    const finishedAt = now().toISOString();
    const next = buildState(previous, current, Number(env.STATE_CAP || 1000), finishedAt);

    // Add pending logs to state.
    for (const entry of pendingLogs) {
      appendLog(next, entry.level, entry.message, entry.timestamp);
    }

    // Add notification record if email was sent.
    if (emailSent) {
      next.notifications = next.notifications || [];

      next.notifications.push({
        id: `email-${Date.now()}`,
        type: "email",
        noticeCount: fresh.length,
        timestamp: finishedAt,
        recipient: maskEmail(env.EMAIL_TO),
        status: "accepted",
        summary: firstRun
          ? "Initial notice digest"
          : `${fresh.length} new TU notice${fresh.length === 1 ? "" : "s"}`,
      });

      // Keep only the last 200 notifications.
      next.notifications = next.notifications.slice(-200);
    }

    // Update status.
    next.status = {
      ...next.status,

      configured: true,
      online: true,

      bot: "idle",
      website: "online",
      scraper: "success",
      state: "saved",

      gmail: hasGmailConfig(env)
        ? emailSent
          ? "sent"
          : "configured"
        : "not-configured",

      github: env.GITHUB_ACTIONS === "true" ? "connected" : next.status?.github || "managed",

      lastChecked: finishedAt,
      lastSuccessfulRun: finishedAt,
      lastError: null,

      noticesScanned: current.length,
      storedNotices: next.notices?.length || 0,
      newNotices: fresh.length,

      emailsSent: (next.status?.emailsSent || 0) + (emailSent ? 1 : 0),

      version: "3.3.0",
    };

    // Save state.
    await saveState(stateFile, next);

    log("INFO", "State saved. Bot finished successfully.");

    return {
      ok: true,
      dryRun: false,
      firstRun,
      noticesScanned: current.length,
      newNotices: fresh.length,
      emailSent,
    };
  } catch (error) {
    log("ERROR", `Bot failed: ${error.message}`);

    // Save failure state if not a dry run.
    if (!dryRun) {
      try {
        const failedAt = now().toISOString();

        previous = normalizeState(previous || {});

        // Add pending logs.
        for (const entry of pendingLogs) {
          appendLog(previous, entry.level, entry.message, entry.timestamp);
        }

        previous.updatedAt = failedAt;

        previous.status = {
          ...previous.status,

          configured: true,
          online: false,

          bot: "failed",

          website: /HTTP|fetch|website|network/i.test(error.message)
            ? "error"
            : previous.status?.website || "unknown",

          scraper: "failed",
          state: "error",

          gmail: hasGmailConfig(env)
            ? previous.status?.gmail || "unknown"
            : "not-configured",

          github: env.GITHUB_ACTIONS === "true" ? "connected" : previous.status?.github || "managed",

          lastChecked: startedAt,
          lastFailedRun: failedAt,
          lastError: error.message,

          noticesScanned: previous.status?.noticesScanned || 0,
          storedNotices: previous.notices?.length || 0,
          newNotices: 0,

          version: "3.3.0",
        };

        await saveState(stateFile, previous);
        log("INFO", "Failure state saved.");
      } catch (stateError) {
        console.error(
          `[${now().toISOString()}] [ERROR] Could not save failed-run state: ${stateError.message}`
        );
      }
    }

    // Re-throw the error for the caller.
    throw error;
  }
}

/**
 * Entry point for running the bot as a standalone script.
 */
export async function main() {
  try {
    const result = await runBot();

    console.log(
      `[${new Date().toISOString()}] [INFO] Bot completed successfully:`,
      result
    );

    process.exitCode = 0;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] [ERROR] Bot failed: ${error.message}`
    );

    process.exitCode = 1;
  }
}

main();
