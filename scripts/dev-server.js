// scripts/dev-server.js — Local development server using Node built-in http
// Simulates the Cloudflare Worker fetch handler locally for instant testing.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const workerPath = path.join(rootDir, 'worker.js');
const PORT = process.env.PORT || 8787;

async function startServer() {
  if (!fs.existsSync(workerPath)) {
    console.log('[Dev] worker.js not found. Running build first...');
    const { execSync } = await import('node:child_process');
    execSync('node scripts/build.js', { stdio: 'inherit', cwd: rootDir });
  }

  const workerModule = await import(`file://${workerPath}?t=${Date.now()}`);
  const worker = workerModule.default;

  const server = http.createServer(async (req, res) => {
    try {
      const fullUrl = `http://${req.headers.host || 'localhost:' + PORT}${req.url}`;
      const webReq = new Request(fullUrl, {
        method: req.method,
        headers: req.headers,
      });

      const response = await worker.fetch(webReq, {}, {});

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const bodyBuffer = Buffer.from(await response.arrayBuffer());
      res.end(bodyBuffer);
    } catch (err) {
      console.error('[Dev Server Error]', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error: ' + err.message);
    }
  });

  server.listen(PORT, () => {
    console.log(`[Dev] Server running at http://localhost:${PORT}`);
    console.log(`[Dev] Simulating Cloudflare Worker runtime. Press Ctrl+C to stop.`);
  });
}

startServer();
