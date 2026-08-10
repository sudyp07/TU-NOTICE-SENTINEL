import 'dotenv/config';
import { SentinelAdapter } from './api/adapter.js';
import { createApp } from './api/app.js';
import { GitHubService } from './api/github.js';

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';
const github = new GitHubService();
const adapter = new SentinelAdapter(github);
const app = createApp({ adapter });

const server = app.listen(port, host, () => {
  console.log(`TU Notice Sentinel API listening on http://${host}:${port}`);
  console.log(`GitHub integration: ${github.configured ? 'configured' : 'not configured'}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
