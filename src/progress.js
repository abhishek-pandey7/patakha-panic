export const SAVE_KEY = 'patakha-panic-v1';
export const freshSave = () => ({unlocked: 1, best: {}, seen: [], music: true, sound: true, uiScale: 3});

export function normalizeUIScale(value) {
  const number = typeof value === 'number' ? value :
    typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) ? Math.max(1, Math.min(5, Math.round(number))) : 3;
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(storage.getItem(SAVE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return freshSave();
    return {
      unlocked: Math.min(8, Math.max(1, Math.floor(Number(raw.unlocked) || 1))),
      best: raw.best && typeof raw.best === 'object' && !Array.isArray(raw.best) ? raw.best : {},
      seen: Array.isArray(raw.seen) ? raw.seen.filter(x => ['rocket','sutli','chakri','ladi'].includes(x)) : [],
      music: raw.music !== false,
      sound: raw.sound !== false,
      uiScale: normalizeUIScale(raw.uiScale),
    };
  } catch { return freshSave(); }
}

export function writeSave(save, storage = globalThis.localStorage) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; }
  catch { return false; }
}

export function awardDiyas({progress, shotsUsed, remaining}, level) {
  if (progress < 90) return 0;
  if (progress >= 97 && (shotsUsed <= level.par || remaining >= 2)) return 3;
  if (progress >= 95 || shotsUsed <= level.par || remaining >= 1) return 2;
  return 1;
}

export function recordResult(save, level, result) {
  if (!result.won) return save;
  save.unlocked = Math.max(save.unlocked, Math.min(8, level.id + 1));
  const previous = save.best[level.id] || {score: 0, diyas: 0, progress: 0};
  save.best[level.id] = {
    score: Math.max(previous.score || 0, result.score),
    diyas: Math.max(previous.diyas || 0, result.diyas),
    progress: Math.max(previous.progress || 0, result.progress),
  };
  return save;
}
