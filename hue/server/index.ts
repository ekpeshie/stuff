// Production server: serves the built app from dist/ and the product API.
//   npm run build && npm start

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { createApiHandler } from './api';
import { createProviderFromEnv, loadEnvFile } from './config';

loadEnvFile();
const setup = createProviderFromEnv();
const api = createApiHandler(setup);
console.log(setup.provider ? `[hue] product provider: ${setup.provider.info().label}` : `[hue] serving sample products — ${setup.reason}`);

const DIST = resolve('dist');
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

createServer((req, res) => {
  api(req, res, () => {
    const path = normalize(decodeURIComponent(new URL(req.url || '/', 'http://local').pathname)).replace(/^([/\\])+/, '');
    let file = join(DIST, path);
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
    if (file.includes(`${join('dist', 'assets')}`)) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    createReadStream(file).pipe(res);
  });
}).listen(Number(process.env.PORT) || 8787, () => console.log(`[hue] http://localhost:${Number(process.env.PORT) || 8787}`));
