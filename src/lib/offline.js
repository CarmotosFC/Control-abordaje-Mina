"use client";

const QUEUE_KEY = "ca_offline_queue_v1";
const CACHE_KEY = "ca_passenger_cache_v1";

export function genScanId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "scan-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushToQueue(item) {
  const q = getQueue();
  q.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function removeFromQueue(deviceScanId) {
  const q = getQueue().filter((i) => i.device_scan_id !== deviceScanId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function queueLength() {
  return getQueue().length;
}

export function saveLocalCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, savedAt: Date.now() }));
  } catch {
    // almacenamiento lleno o no disponible — sin caché offline
  }
}

export function getLocalCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

export function lookupLocal(codigo) {
  const cache = getLocalCache();
  if (!cache) return null;
  return cache.items.find((i) => i.codigo_pasajero === codigo) || null;
}
