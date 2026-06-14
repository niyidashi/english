// js/progress.js
var STORAGE_KEY = 'meowvocab_progress';

function createDefaultProgress() {
  var wordsState = {};
  WORDS.forEach(function(w) {
    wordsState[w.id] = 'unknown';
  });
  var today = new Date().toISOString().split('T')[0];
  return {
    words: wordsState,
    currentUnit: 1,
    mode: 'unit',
    lastOpened: today,
    streakDays: 0,
    currentWordIndex: 0,
    flashcardIndex: 0,
    dailyStats: {
      date: today,
      learningKnown: 0,
      learningUnknown: 0,
      flashcardKnown: 0,
      flashcardFuzzy: 0,
      flashcardUnknown: 0
    },
    settings: {
      fontSize: 'medium',
      defaultMode: 'learning',
      dailyLimit: 100
    }
  };
}

function loadProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    var data = JSON.parse(raw);
    // ensure all words exist
    WORDS.forEach(function(w) {
      if (!(w.id in data.words)) data.words[w.id] = 'unknown';
    });
    // ensure new fields exist
    if (!data.currentWordIndex) data.currentWordIndex = 0;
    if (!data.flashcardIndex) data.flashcardIndex = 0;
    var today = new Date().toISOString().split('T')[0];
    if (!data.dailyStats || data.dailyStats.date !== today) {
      data.dailyStats = {
        date: today,
        learningKnown: 0,
        learningUnknown: 0,
        flashcardKnown: 0,
        flashcardFuzzy: 0,
        flashcardUnknown: 0
      };
    }
    if (!data.settings.dailyLimit) data.settings.dailyLimit = 100;
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

function updateWordStatus(wordId, status, nextReview, reviewInterval) {
  var progress = loadProgress();
  if (status === 'mastered' || status === 'fuzzy' || status === 'unknown' || status === 'known') {
    progress.words[wordId] = status;
  }
  if (nextReview !== undefined) {
    if (typeof progress.words[wordId] === 'string') {
      var oldStatus = progress.words[wordId];
      progress.words[wordId] = { status: oldStatus, nextReview: nextReview, reviewInterval: reviewInterval };
    } else if (typeof progress.words[wordId] === 'object') {
      progress.words[wordId].nextReview = nextReview;
      progress.words[wordId].reviewInterval = reviewInterval;
    }
  }
  var today = new Date().toISOString().split('T')[0];
  if (progress.lastOpened !== today) {
    var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    progress.streakDays = (progress.lastOpened === yesterday) ? progress.streakDays + 1 : 1;
    progress.lastOpened = today;
    progress.dailyStats = { date: today, learningKnown: 0, learningUnknown: 0, flashcardKnown: 0, flashcardFuzzy: 0, flashcardUnknown: 0 };
  }
  saveProgress(progress);
  return progress;
}

function getWordData(wordId) {
  var progress = loadProgress();
  var raw = progress.words[wordId];
  if (typeof raw === 'string') return { status: raw, nextReview: null, reviewInterval: 0 };
  if (typeof raw === 'object') return raw;
  return { status: 'unknown', nextReview: null, reviewInterval: 0 };
}

function incrementDailyStat(category) {
  var progress = loadProgress();
  progress.dailyStats[category] = (progress.dailyStats[category] || 0) + 1;
  saveProgress(progress);
}

function getDailyStats() {
  return loadProgress().dailyStats;
}

function getTodayLearningCount() {
  var stats = getDailyStats();
  return (stats.learningKnown || 0) + (stats.learningUnknown || 0);
}

function getCurrentWords() {
  var progress = loadProgress();
  if (progress.mode === 'mixed') {
    return WORDS.slice();
  }
  return WORDS.filter(function(w) { return w.unit === progress.currentUnit; });
}

function getDueWords() {
  var progress = loadProgress();
  var today = new Date().toISOString().split('T')[0];
  return WORDS.filter(function(w) {
    var d = getWordData(w.id);
    return d.nextReview && d.nextReview <= today && d.status !== 'known';
  });
}

function getUnitStats(unit) {
  var progress = loadProgress();
  var unitWords = WORDS.filter(function(w) { return w.unit === unit; });
  var stats = { total: unitWords.length, mastered: 0, fuzzy: 0, unknown: 0, known: 0 };
  unitWords.forEach(function(w) {
    var d = getWordData(w.id);
    stats[d.status] = (stats[d.status] || 0) + 1;
  });
  return stats;
}

function getGlobalStats() {
  var progress = loadProgress();
  var stats = { total: WORDS.length, mastered: 0, fuzzy: 0, unknown: 0, known: 0 };
  WORDS.forEach(function(w) {
    var d = getWordData(w.id);
    stats[d.status] = (stats[d.status] || 0) + 1;
  });
  return stats;
}

function setUnit(unit) {
  var progress = loadProgress();
  progress.currentUnit = unit;
  saveProgress(progress);
}

function setMode(mode) {
  var progress = loadProgress();
  if (mode === 'unit' || mode === 'mixed') progress.mode = mode;
  saveProgress(progress);
}

function updateSetting(key, value) {
  var progress = loadProgress();
  if (key in progress.settings) progress.settings[key] = value;
  saveProgress(progress);
}

function savePosition(type, index) {
  var progress = loadProgress();
  if (type === 'learning') progress.currentWordIndex = index;
  if (type === 'flashcard') progress.flashcardIndex = index;
  saveProgress(progress);
}

function resetAllProgress() {
  if (confirm('确定要重置所有学习进度吗？此操作不可撤销。')) {
    localStorage.removeItem(STORAGE_KEY);
    return createDefaultProgress();
  }
  return null;
}
