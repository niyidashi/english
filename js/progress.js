// js/progress.js
const STORAGE_KEY = 'meowvocab_progress';

function createDefaultProgress() {
  const wordsState = {};
  WORDS.forEach(w => {
    wordsState[w.id] = 'unknown';
  });
  return {
    words: wordsState,
    currentUnit: 1,
    mode: 'unit',
    lastOpened: new Date().toISOString().split('T')[0],
    streakDays: 0,
    settings: {
      fontSize: 'medium',
      defaultMode: 'learning'
    }
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const data = JSON.parse(raw);
    WORDS.forEach(w => {
      if (!(w.id in data.words)) {
        data.words[w.id] = 'unknown';
      }
    });
    return data;
  } catch (e) {
    console.error('Failed to load progress:', e);
    return createDefaultProgress();
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save progress:', e);
    return false;
  }
}

function updateWordStatus(wordId, status) {
  const progress = loadProgress();
  if (status === 'mastered' || status === 'fuzzy' || status === 'unknown') {
    progress.words[wordId] = status;
  }
  const today = new Date().toISOString().split('T')[0];
  if (progress.lastOpened !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    progress.streakDays = (progress.lastOpened === yesterday)
      ? progress.streakDays + 1 : 1;
    progress.lastOpened = today;
  }
  saveProgress(progress);
  return progress;
}

function getCurrentWords() {
  const progress = loadProgress();
  if (progress.mode === 'mixed') {
    return [...WORDS];
  }
  return WORDS.filter(w => w.unit === progress.currentUnit);
}

function getUnitStats(unit) {
  const progress = loadProgress();
  const unitWords = WORDS.filter(w => w.unit === unit);
  const stats = { total: unitWords.length, mastered: 0, fuzzy: 0, unknown: 0 };
  unitWords.forEach(w => {
    const status = progress.words[w.id] || 'unknown';
    stats[status]++;
  });
  return stats;
}

function getGlobalStats() {
  const progress = loadProgress();
  const stats = { total: WORDS.length, mastered: 0, fuzzy: 0, unknown: 0 };
  WORDS.forEach(w => {
    const status = progress.words[w.id] || 'unknown';
    stats[status]++;
  });
  return stats;
}

function setUnit(unit) {
  const progress = loadProgress();
  progress.currentUnit = unit;
  saveProgress(progress);
}

function setMode(mode) {
  const progress = loadProgress();
  if (mode === 'unit' || mode === 'mixed') {
    progress.mode = mode;
  }
  saveProgress(progress);
}

function updateSetting(key, value) {
  const progress = loadProgress();
  if (key in progress.settings) {
    progress.settings[key] = value;
  }
  saveProgress(progress);
}

function resetAllProgress() {
  if (confirm('确定要重置所有学习进度吗？此操作不可撤销。')) {
    localStorage.removeItem(STORAGE_KEY);
    return createDefaultProgress();
  }
  return null;
}
