// src/index.js
import express from "express";
import path from "node:path";
import { createAPI } from "./api.js";
import { runBot } from "./bot.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Setup API routes
createAPI(app);

// Serve static files if needed
app.use(express.static(path.resolve("public")));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "TU Notice Sentinel API",
    version: "3.3.0",
    status: "running",
    endpoints: [
      "/api/health",
      "/api/notices",
      "/api/notices/:id",
      "/api/status",
      "/api/bot/enable",
      "/api/bot/disable",
      "/api/bot/run",
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TU Notice Sentinel API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Notices: http://localhost:${PORT}/api/notices`);
});

// Also allow running the bot directly
if (process.env.RUN_BOT === "true") {
  runBot().catch(console.error);
}
