// All persistence goes through this module. Nothing here ever talks to the network —
// it only reads and writes chrome.storage.local on the user's own device.

import { generateId } from "./utils.js";
import { DEFAULT_COLLECTIONS, buildMockSubscriptions, buildMockReadingList, buildMockActivity } from "./mockData.js";

const STORAGE_KEY = "quireData";
const SCHEMA_VERSION = 1;

function emptySchema() {
  return {
    version: SCHEMA_VERSION,
    subscriptions: [],
    collections: DEFAULT_COLLECTIONS.map((c) => ({ ...c })),
    readingList: [],
    activity: [],
    settings: {
      theme: "system",
      notifications: true,
      dataSource: "mock", // 'mock' | 'real'
      lastSync: null,
    },
    meta: {
      installedAt: new Date().toISOString(),
      dataUnavailable: true,
    },
  };
}

export function buildSeedData() {
  const data = emptySchema();
  const subs = buildMockSubscriptions();
  data.subscriptions = subs;
  data.readingList = buildMockReadingList(subs);
  data.activity = buildMockActivity(subs);
  data.meta.dataUnavailable = true;
  data.settings.dataSource = "mock";
  return data;
}

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

export function getAll() {
  return new Promise((resolve, reject) => {
    if (!hasChromeStorage()) {
      reject(new Error("chrome.storage.local is unavailable"));
      return;
    }
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

export function saveAll(data) {
  return new Promise((resolve, reject) => {
    if (!hasChromeStorage()) {
      reject(new Error("chrome.storage.local is unavailable"));
      return;
    }
    chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(data);
    });
  });
}

// Ensures storage is populated. Returns the current (possibly newly-seeded) data.
export async function ensureInitialized() {
  let data;
  try {
    data = await getAll();
  } catch {
    data = null;
  }
  if (!data) {
    data = buildSeedData();
    await saveAll(data);
  }
  return data;
}

export function onChange(callback) {
  if (!hasChromeStorage()) return () => {};
  const listener = (changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      callback(changes[STORAGE_KEY].newValue, changes[STORAGE_KEY].oldValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

// --- convenience mutators -------------------------------------------------

export async function mutate(mutator) {
  const data = await ensureInitialized();
  const next = (await mutator(data)) || data;
  await saveAll(next);
  return next;
}

export function logActivity(data, type, message) {
  data.activity = data.activity || [];
  data.activity.unshift({ id: generateId("act"), type, message, timestamp: new Date().toISOString() });
  data.activity = data.activity.slice(0, 50);
}

export function resetToMock() {
  const seeded = buildSeedData();
  return saveAll(seeded);
}
