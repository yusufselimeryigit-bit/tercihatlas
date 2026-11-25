/**
 * TercihAtlas — Backend API & Cloud Sync Client
 */

// Will be set automatically after Cloudflare Worker deployment.
// On localhost/127.0.0.1, same-origin dev-server.mjs is used automatically.
export const DEFAULT_WORKER_URL = 'https://tercihatlas-api.yusuf-kriptobot.workers.dev';

const API_URL_STORAGE_KEY = 'tercihatlas_api_url';

export function isLocalDev() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export function getApiBase() {
  const custom = localStorage.getItem(API_URL_STORAGE_KEY);
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  if (isLocalDev()) {
    return '';
  }
  return DEFAULT_WORKER_URL.replace(/\/+$/, '');
}

export function setCustomApiBase(url) {
  const cleaned = String(url || '').trim().replace(/\/+$/, '');
  if (!cleaned) {
    localStorage.removeItem(API_URL_STORAGE_KEY);
  } else {
    localStorage.setItem(API_URL_STORAGE_KEY, cleaned);
  }
}

export function hasConfiguredApi() {
  return isLocalDev() || Boolean(getApiBase());
}

export function getLogoUrl(universityId) {
  if (!universityId) return null;
  // Served directly from GitHub Pages (works 100% on Mac, iPad, iPhone & offline without workers.dev dependency)
  return `./logos/${encodeURIComponent(universityId)}.png`;
}

async function apiRequest(path, options = {}) {
  if (!hasConfiguredApi()) {
    throw new Error(
      'YÖK Atlas API sunucusu henüz bağlı değil. Sağ üstteki Bulut / API ayarından Cloudflare Worker adresini girin veya yerel sunucudan açın.',
    );
  }
  const url = `${getApiBase()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Sunucu hatası (${res.status})`);
  }
  return data;
}

export async function checkApiHealth() {
  return apiRequest('/api/health', { method: 'GET' });
}

export async function fetchProgramFromApi(code, { refresh = false } = {}) {
  const q = refresh ? '?refresh=1' : '';
  return apiRequest(`/api/program/${encodeURIComponent(code)}${q}`, { method: 'GET' });
}

export async function searchProgramsFromApi({ q = '', puanTuru = '', uniTuru = '', minRank = '', maxRank = '', size = 20 } = {}) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (puanTuru) sp.set('puanTuru', puanTuru);
  if (uniTuru) sp.set('uniTuru', uniTuru);
  if (minRank) sp.set('minRank', String(minRank));
  if (maxRank) sp.set('maxRank', String(maxRank));
  if (size) sp.set('size', String(size));
  return apiRequest(`/api/search?${sp.toString()}`, { method: 'GET' });
}

export async function pullCloudSync(syncKey) {
  return apiRequest('/api/sync', {
    method: 'GET',
    headers: { 'X-Sync-Key': syncKey },
  });
}

export async function pushCloudSync(syncKey, statePayload) {
  return apiRequest('/api/sync', {
    method: 'PUT',
    headers: { 'X-Sync-Key': syncKey },
    body: JSON.stringify(statePayload),
  });
}

export async function createShareSnapshot(payload) {
  return apiRequest('/api/share', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchShareSnapshot(shareId) {
  return apiRequest(`/api/share/${encodeURIComponent(shareId)}`, { method: 'GET' });
}
