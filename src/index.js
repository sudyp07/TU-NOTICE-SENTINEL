import 'dotenv/config';
import { runBot } from './bot.js';

runBot().catch((error) => {
  console.error(`[${new Date().toISOString()}] [ERROR] Bot failed: ${error.message}`);
  process.exitCode = 1;
});
