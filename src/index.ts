import http from 'http';
import { bot } from './bot';
import { startScheduler } from './services/scheduler';

async function startApp() {
  console.log('[Bot] Starting Telegram bot service...');

  // Start the automated scheduler
  startScheduler();

  // Start the bot using long polling
  bot.start({
    onStart: (botInfo) => {
      console.log(`[Bot] Successfully started! Logged in as @${botInfo.username}`);
    },
  });

  // Start a simple HTTP server for Render / Koyeb health checks and UptimeRobot keep-alive
  const PORT = process.env.PORT || 8080;
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`[HTTP Server] Listening on port ${PORT} for health checks.`);
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`[Bot] Received ${signal}. Stopping bot gracefully...`);
    await bot.stop();
    server.close(() => {
      console.log('[HTTP Server] Web server closed.');
    });
    console.log('[Bot] Bot stopped. Exiting process.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Start execution and catch any startup failures
startApp().catch((error) => {
  console.error('[Bot] Critical failure during startup:', error);
  process.exit(1);
});

