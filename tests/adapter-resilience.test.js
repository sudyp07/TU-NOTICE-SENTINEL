import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SentinelAdapter } from "../src/api/adapter.js";

test("local adapter reports the bot as an online local scheduler", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sentinel-adapter-"));
  const stateFile = path.join(directory, "state.json");
  const adapter = new SentinelAdapter({ stateFile, intervalMs: 300000 });
  const status = await adapter.getStatus();
  assert.equal(status.online, true);
  assert.equal(status.github, "not-used");
  assert.equal(status.scheduler, "local");
});

test("local adapter can read the persistent state without GitHub", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sentinel-adapter-"));
  const stateFile = path.join(directory, "state.json");
  await writeFile(stateFile, JSON.stringify({ notices: [{ id: "n1" }] }));
  const adapter = new SentinelAdapter({ stateFile });
  const notices = await adapter.listNotices();
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, "n1");
});
