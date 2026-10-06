// Anonymous player counter backed by worker/index.js. Every call fails quietly:
// the game never depends on the counter, and the Vite dev server has no /api.
const COUNTED_KEY = 'patakha-panic-counted';
const enabled = !import.meta.env.DEV;

function firstTime(storage = globalThis.localStorage) {
  try {
    if (storage.getItem(COUNTED_KEY)) return false;
    storage.setItem(COUNTED_KEY, '1');
    return true;
  } catch { return false; }
}

let recorded = false;
/** Counts the first level started in each page load; a new browser also counts as a new player. */
export function recordPlay() {
  if (!enabled || recorded) return;
  recorded = true;
  fetch('/api/play', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({newPlayer: firstTime()}),
    keepalive: true,
  }).catch(() => {});
}

export async function fetchStats() {
  if (!enabled) return null;
  try {
    const response = await fetch('/api/stats');
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
