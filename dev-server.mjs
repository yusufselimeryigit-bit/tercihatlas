#!/usr/bin/env node
/**
 * TercihAtlas Local Dev Server (zero dependencies)
 * - Serves static frontend files from project root
 * - Proxies live YÖK Atlas API (/api/program/:code, /api/logo/:uniId)
 * - Provides local file-backed /api/sync for testing Personal Key Cloud Sync
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchProgramFromYokAtlas, fetchUniversityLogo } from './worker/src/yokatlas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const SYNC_DIR = path.join(__dirname, '.local-sync');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const programCache = new Map();

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Key',
  };
}

function sendJson(req, res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders(req),
  });
  res.end(JSON.stringify(data));
}

function hashSyncKey(rawKey) {
  const trimmed = String(rawKey || '').trim();
  if (trimmed.length < 6) return null;
  return crypto.createHash('sha256').update(`tercihatlas-v1:${trimmed}`).digest('hex');
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(req, res, 200, {
        ok: true,
        service: 'tercihatlas-local-dev',
        kvConfigured: true,
        timestamp: new Date().toISOString(),
      });
    }

    const programMatch = pathname.match(/^\/api\/program\/(\d{7,11})$/);
    if (programMatch && req.method === 'GET') {
      const code = programMatch[1];
      const force = url.searchParams.get('refresh') === '1';
      if (!force && programCache.has(code)) {
        return sendJson(req, res, 200, { ...programCache.get(code), fromCache: true });
      }
      const data = await fetchProgramFromYokAtlas(code);
      programCache.set(code, data);
      return sendJson(req, res, 200, { ...data, fromCache: false });
    }

    const logoMatch = pathname.match(/^\/api\/logo\/(\d+)$/);
    if (logoMatch && req.method === 'GET') {
      const logoRes = await fetchUniversityLogo(logoMatch[1]);
      if (!logoRes) {
        res.writeHead(404, corsHeaders(req));
        res.end('Not found');
        return;
      }
      const buf = Buffer.from(await logoRes.arrayBuffer());
      res.writeHead(200, {
        'Content-Type': logoRes.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders(req),
      });
      res.end(buf);
      return;
    }

    if (pathname === '/api/sync') {
      const keyHash = hashSyncKey(req.headers['x-sync-key']);
      if (!keyHash) {
        return sendJson(req, res, 401, { error: 'Kişisel senkronizasyon anahtarı en az 6 karakter olmalıdır.' });
      }
      await fs.mkdir(SYNC_DIR, { recursive: true });
      const filePath = path.join(SYNC_DIR, `${keyHash}.json`);

      if (req.method === 'GET') {
        try {
          const raw = await fs.readFile(filePath, 'utf-8');
          return sendJson(req, res, 200, { exists: true, data: JSON.parse(raw) });
        } catch {
          return sendJson(req, res, 200, { exists: false, data: null });
        }
      }

      if (req.method === 'PUT') {
        const raw = await readBody(req);
        const parsed = JSON.parse(raw);
        const syncedAt = new Date().toISOString();
        await fs.writeFile(filePath, JSON.stringify({ ...parsed, syncedAt }, null, 2), 'utf-8');
        return sendJson(req, res, 200, { ok: true, syncedAt });
      }
    }

    // Static file serving
    const safeRel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const fullPath = path.resolve(__dirname, safeRel);
    if (!fullPath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const stat = await fs.stat(fullPath);
      const target = stat.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;
      const content = await fs.readFile(target);
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  } catch (err) {
    const message = err?.message || 'Sunucu hatası';
    const status = message.includes('bulunamadı') ? 404 : message.includes('Geçersiz') ? 400 : 502;
    sendJson(req, res, status, { error: message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TercihAtlas dev server running at http://127.0.0.1:${PORT}`);
});
