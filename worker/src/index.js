import { fetchProgramFromYokAtlas, fetchUniversityLogo } from './yokatlas.js';

const CACHE_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const MAX_SYNC_BYTES = 1024 * 1024 * 2; // 2 MB guard

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(request, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

async function hashSyncKey(rawKey) {
  const trimmed = String(rawKey || '').trim();
  if (trimmed.length < 6) return null;
  const data = new TextEncoder().encode(`tercihatlas-v1:${trimmed}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Health check
      if (path === '/api/health' && request.method === 'GET') {
        return jsonResponse(request, {
          ok: true,
          service: 'tercihatlas-api',
          kvConfigured: Boolean(env.TERCIH_KV),
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Program lookup from YÖK Atlas
      const programMatch = path.match(/^\/api\/program\/(\d{7,11})$/);
      if (programMatch && request.method === 'GET') {
        const code = programMatch[1];
        const forceRefresh = url.searchParams.get('refresh') === '1';
        const cacheKey = `program:v1:${code}`;

        if (!forceRefresh && env.TERCIH_KV) {
          const cached = await env.TERCIH_KV.get(cacheKey, { type: 'json' });
          if (cached) {
            return jsonResponse(request, { ...cached, fromCache: true }, 200, {
              'Cache-Control': 'public, max-age=3600',
            });
          }
        }

        const program = await fetchProgramFromYokAtlas(code);
        if (env.TERCIH_KV) {
          ctx.waitUntil(
            env.TERCIH_KV.put(cacheKey, JSON.stringify(program), {
              expirationTtl: CACHE_TTL_SECONDS,
            }),
          );
        }

        return jsonResponse(request, { ...program, fromCache: false }, 200, {
          'Cache-Control': 'public, max-age=3600',
        });
      }

      // 3. Official university logo proxy
      const logoMatch = path.match(/^\/api\/logo\/(\d+)$/);
      if (logoMatch && request.method === 'GET') {
        const logoRes = await fetchUniversityLogo(logoMatch[1]);
        if (!logoRes) {
          return new Response('Not found', { status: 404, headers: corsHeaders(request) });
        }
        const contentType = logoRes.headers.get('Content-Type') || 'image/png';
        return new Response(logoRes.body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=604800',
            ...corsHeaders(request),
          },
        });
      }

      // 4. Personal-Key Cloud Sync (GET / PUT /api/sync)
      if (path === '/api/sync') {
        if (!env.TERCIH_KV) {
          return jsonResponse(request, { error: 'Bulut depolama (KV) henüz yapılandırılmadı.' }, 503);
        }

        const rawKey = request.headers.get('X-Sync-Key');
        const keyHash = await hashSyncKey(rawKey);
        if (!keyHash) {
          return jsonResponse(request, { error: 'Kişisel senkronizasyon anahtarı en az 6 karakter olmalıdır.' }, 401);
        }

        const kvKey = `sync:v1:${keyHash}`;

        if (request.method === 'GET') {
          const stored = await env.TERCIH_KV.get(kvKey, { type: 'json' });
          if (!stored) {
            return jsonResponse(request, { exists: false, data: null });
          }
          return jsonResponse(request, { exists: true, data: stored });
        }

        if (request.method === 'PUT') {
          const contentLength = Number(request.headers.get('Content-Length') || '0');
          if (contentLength > MAX_SYNC_BYTES) {
            return jsonResponse(request, { error: 'Veri boyutu sınırı (2 MB) aşıldı.' }, 413);
          }

          let payload;
          try {
            payload = await request.json();
          } catch {
            return jsonResponse(request, { error: 'Geçersiz JSON verisi.' }, 400);
          }

          const serialized = JSON.stringify({
            ...payload,
            syncedAt: new Date().toISOString(),
          });

          if (serialized.length > MAX_SYNC_BYTES) {
            return jsonResponse(request, { error: 'Veri boyutu sınırı (2 MB) aşıldı.' }, 413);
          }

          await env.TERCIH_KV.put(kvKey, serialized);
          return jsonResponse(request, { ok: true, syncedAt: new Date().toISOString() });
        }
      }

      return jsonResponse(request, { error: 'Uç nokta bulunamadı.' }, 404);
    } catch (err) {
      console.error(JSON.stringify({ event: 'worker_error', path, message: err?.message || String(err) }));
      const message = err?.message || 'Beklenmeyen bir sunucu hatası oluştu.';
      const status = message.includes('bulunamadı') ? 404 : message.includes('Geçersiz') ? 400 : 502;
      return jsonResponse(request, { error: message }, status);
    }
  },
};
