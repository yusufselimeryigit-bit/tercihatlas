/**
 * TercihAtlas — Real-Time Firebase Realtime Database Sync Engine
 * Dedicated isolated Firebase project: tercihatlas-2027 (independent of yks-takip).
 * Syncs Mac, iPad, and iPhone instantaneously over WebSocket with zero manual keys.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  off,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDhUR1tvPLnwWJr0AHJf5CmWnUxH9ua5sA',
  authDomain: 'tercihatlas-2027.firebaseapp.com',
  databaseURL: 'https://tercihatlas-2027-default-rtdb.firebaseio.com',
  projectId: 'tercihatlas-2027',
  storageBucket: 'tercihatlas-2027.firebasestorage.app',
  messagingSenderId: '1075081181083',
  appId: '1:1075081181083:web:992419e15662eecdd3933e',
};

const ROOM_STORAGE_KEY = 'tercihatlas_fb_room_v1';
const DEVICE_ID = (() => {
  try {
    let id = sessionStorage.getItem('tercihatlas_dev_id');
    if (!id) {
      id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem('tercihatlas_dev_id', id);
    }
    return id;
  } catch {
    return `dev-${Math.random().toString(36).slice(2, 9)}`;
  }
})();

let fbApp = null;
let fbDb = null;
let activeRoomRef = null;
let activeConnRef = null;
let activeListener = null;
let activeConnListener = null;
let lastAppliedUpdatedAt = null;
let initialized = false;

export function sanitizeRoomName(raw) {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return cleaned.length >= 2 ? cleaned.slice(0, 48) : 'main';
}

export function getFirebaseRoom() {
  try {
    return sanitizeRoomName(localStorage.getItem(ROOM_STORAGE_KEY) || 'main');
  } catch {
    return 'main';
  }
}

export function setFirebaseRoom(room) {
  const safe = sanitizeRoomName(room);
  try {
    localStorage.setItem(ROOM_STORAGE_KEY, safe);
  } catch {}
  return safe;
}

function ensureDb() {
  if (!fbDb) {
    fbApp = initializeApp(FIREBASE_CONFIG, 'tercihatlas');
    fbDb = getDatabase(fbApp);
  }
  return fbDb;
}

function getRoomPath(room) {
  return `tercihAtlas/rooms/${sanitizeRoomName(room)}`;
}

export async function pushStateToFirebase(stateObj, room = getFirebaseRoom()) {
  const db = ensureDb();
  const updatedAt = stateObj.updatedAt || new Date().toISOString();
  const envelope = {
    updatedAt,
    deviceId: DEVICE_ID,
    programCount: Array.isArray(stateObj.programs) ? stateObj.programs.length : 0,
    scenarioCount: Array.isArray(stateObj.scenarios) ? stateObj.scenarios.length : 1,
    examCount: Array.isArray(stateObj.examHistory) ? stateObj.examHistory.length : 0,
    payloadJson: JSON.stringify(stateObj),
  };
  lastAppliedUpdatedAt = updatedAt;
  await set(ref(db, getRoomPath(room)), envelope);
  return envelope;
}

export async function pullStateOnceFromFirebase(room = getFirebaseRoom()) {
  const db = ensureDb();
  const snap = await get(ref(db, getRoomPath(room)));
  if (!snap.exists()) return null;
  const val = snap.val();
  if (!val?.payloadJson) return null;
  return {
    data: JSON.parse(val.payloadJson),
    updatedAt: val.updatedAt || null,
    deviceId: val.deviceId || null,
  };
}

export function stopFirebaseLiveSync() {
  if (activeRoomRef && activeListener) {
    off(activeRoomRef, 'value', activeListener);
  }
  if (activeConnRef && activeConnListener) {
    off(activeConnRef, 'value', activeConnListener);
  }
  activeRoomRef = null;
  activeConnRef = null;
  activeListener = null;
  activeConnListener = null;
  initialized = false;
}

/**
 * Starts real-time WebSocket synchronization with Firebase Realtime Database.
 * Handles initial reconciliation safely so existing Mac data is never wiped,
 * and pushes/pulls live updates across Mac, iPad, and iPhone in real time.
 */
export function startFirebaseLiveSync({
  room = getFirebaseRoom(),
  getLocalState,
  isLocalMeaningful,
  onRemoteState,
  onStatus,
}) {
  stopFirebaseLiveSync();
  const db = ensureDb();
  const safeRoom = sanitizeRoomName(room);
  activeRoomRef = ref(db, getRoomPath(safeRoom));
  activeConnRef = ref(db, '.info/connected');

  onStatus?.('syncing', 'Firebase bağlanıyor...');

  activeConnListener = (snap) => {
    const connected = Boolean(snap.val());
    if (connected) {
      if (initialized) onStatus?.('synced', 'Firebase Canlı');
    } else if (initialized) {
      onStatus?.('error', 'Çevrimdışı');
    }
  };
  onValue(activeConnRef, activeConnListener);

  let firstSnapshot = true;

  activeListener = (snap) => {
    try {
      const local = getLocalState();
      const localHasData = isLocalMeaningful(local);
      const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;

      if (!snap.exists() || !snap.val()?.payloadJson) {
        firstSnapshot = false;
        initialized = true;
        if (localHasData) {
          pushStateToFirebase(local, safeRoom)
            .then(() => onStatus?.('synced', 'Firebase Canlı'))
            .catch(() => onStatus?.('error', 'Yazma Hatası'));
        } else {
          onStatus?.('synced', 'Firebase Canlı');
        }
        return;
      }

      const val = snap.val();
      const cloudTime = val.updatedAt ? new Date(val.updatedAt).getTime() : 0;

      // Ignore our own write echo after initial load
      if (!firstSnapshot && val.deviceId === DEVICE_ID) {
        onStatus?.('synced', 'Firebase Canlı');
        return;
      }

      const cloudData = JSON.parse(val.payloadJson);
      const cloudHasData = isLocalMeaningful(cloudData);

      if (firstSnapshot) {
        firstSnapshot = false;
        initialized = true;

        // First load reconciliation: never let an empty cloud overwrite populated local data,
        // and immediately hydrate an empty tablet/phone from cloud!
        if (!localHasData && cloudHasData) {
          lastAppliedUpdatedAt = val.updatedAt || null;
          onRemoteState(cloudData, { initial: true, updatedAt: val.updatedAt });
          onStatus?.('synced', 'Firebase Canlı');
        } else if (localHasData && !cloudHasData) {
          pushStateToFirebase(local, safeRoom)
            .then(() => onStatus?.('synced', 'Firebase Canlı'))
            .catch(() => onStatus?.('error', 'Yazma Hatası'));
        } else if (cloudTime >= localTime) {
          lastAppliedUpdatedAt = val.updatedAt || null;
          onRemoteState(cloudData, { initial: true, updatedAt: val.updatedAt });
          onStatus?.('synced', 'Firebase Canlı');
        } else {
          pushStateToFirebase(local, safeRoom)
            .then(() => onStatus?.('synced', 'Firebase Canlı'))
            .catch(() => onStatus?.('error', 'Yazma Hatası'));
        }
        return;
      }

      // Live real-time remote update from another device (Mac <-> iPad <-> iPhone)
      if (val.updatedAt && val.updatedAt === lastAppliedUpdatedAt) {
        onStatus?.('synced', 'Firebase Canlı');
        return;
      }
      lastAppliedUpdatedAt = val.updatedAt || null;
      onRemoteState(cloudData, { initial: false, updatedAt: val.updatedAt });
      onStatus?.('synced', 'Firebase Canlı');
    } catch (err) {
      onStatus?.('error', err?.message || 'Eşitleme Hatası');
    }
  };

  onValue(activeRoomRef, activeListener, (err) => {
    onStatus?.('error', err?.message || 'Bağlantı Hatası');
  });
}
