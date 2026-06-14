// js/app.js
var currentWordIndex = 0;
var learningQueue = [];
var learningQueueReady = false;

var panels = {
  learning: document.getElementById('panel-learning'),
  flashcard: document.getElementById('panel-flashcard'),
  progress: document.getElementById('panel-progress'),
  settings: document.getElementById('panel-settings')
};

var navItems = document.querySelectorAll('.bottom-nav .nav-item');
var wordIndexEl = document.getElementById('word-index');
var bodyEl = document.body;

function switchPanel(panelName) {
  Object.values(panels).forEach(function(p) { p.classList.remove('active'); });
  panels[panelName].classList.add('active');

  navItems.forEach(function(item) {
    item.classList.toggle('active', item.dataset.panel === panelName);
  });

  if (panelName === 'learning') { learningQueueReady = false; refreshLearningPanel(); }
  if (panelName === 'flashcard') { fcPoolReady = false; refreshFlashcardPanel(); }
  if (panelName === 'progress') refreshProgressPanel();
  if (panelName === 'settings') refreshSettingsPanel();
}

navItems.forEach(function(item) {
  item.addEventListener('click', function() { switchPanel(item.dataset.panel); });
});

// ===== LEARNING MODE =====

function buildLearningQueue() {
  var progress = loadProgress();
  var allWords = getCurrentWords();
  var today = new Date().toISOString().split('T')[0];

  var knownWords = [];
  var unknownWords = [];

  allWords.forEach(function(w) {
    var d = getWordData(w.id);
    if (d.status === 'known' || d.status === 'mastered') {
      if (d.nextReview && d.nextReview <= today) knownWords.push(w);
      else if (!d.nextReview) knownWords.push(w);
    } else {
      if (!d.nextReview || d.nextReview <= today) unknownWords.push(w);
    }
  });

  // Shuffle unknown words
  shuffleArray(unknownWords);

  // Build queue: known once + unknown twice, randomly interspersed
  // Insert each unknown word twice at random positions in the known+unknown pool
  var base = knownWords.concat(unknownWords); // each unknown appears once here
  // Add second copy of unknown words at random positions
  unknownWords.forEach(function(w) {
    var pos = Math.floor(Math.random() * (base.length + 1));
    base.splice(pos, 0, w);
  });

  learningQueue = base;
  learningQueueReady = true;

  currentWordIndex = progress.currentWordIndex || 0;
  if (currentWordIndex >= learningQueue.length) currentWordIndex = 0;
}

function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
}

function refreshLearningPanel() {
  if (!learningQueueReady) buildLearningQueue();

  var dailyCount = getTodayLearningCount();
  var limitDisplay = getDailyLimitDisplay();

  document.getElementById('learning-progress-text').textContent = '今日: ' + dailyCount + '/' + limitDisplay;

  if (learningQueue.length === 0 || isDailyLimitReached()) {
    document.getElementById('word-en').textContent = '✨';
    document.getElementById('word-pos').textContent = '今日学习完成';
    document.getElementById('word-zh').textContent = '进入闪卡模式巩固吧~';
    document.getElementById('word-example').textContent = '';
    document.getElementById('word-index').textContent = '0/0';
    return;
  }

  if (currentWordIndex >= learningQueue.length) currentWordIndex = 0;

  renderWordCard(learningQueue[currentWordIndex]);
  updateWordIndexDisplay();

  var progress = loadProgress();
  var unitLabel = document.getElementById('learning-unit-label');
  if (progress.mode === 'mixed') {
    unitLabel.textContent = '🔀 全部混合';
  } else {
    unitLabel.textContent = 'Unit ' + progress.currentUnit;
  }
}

function renderWordCard(word) {
  document.getElementById('word-en').textContent = word.en;
  document.getElementById('word-pos').textContent = word.pos;
  document.getElementById('word-zh').textContent = word.zh || '';
  var exampleText = word.example || '';
  if (word.exampleZh) exampleText += ' （' + word.exampleZh + '）';
  document.getElementById('word-example').textContent = exampleText;
}

function updateWordIndexDisplay() {
  wordIndexEl.textContent = (currentWordIndex + 1) + ' / ' + learningQueue.length;
}

function getDailyLimitDisplay() {
  var progress = loadProgress();
  var limit = progress.settings.dailyLimit || 100;
  return limit === 9999 ? '不限' : String(limit);
}

function isDailyLimitReached() {
  var progress = loadProgress();
  var limit = progress.settings.dailyLimit || 100;
  if (limit === 9999) return false;
  return getTodayLearningCount() >= limit;
}

// Prev/Next
document.getElementById('btn-prev-word').addEventListener('click', function() {
  if (learningQueue.length === 0) return;
  if (currentWordIndex > 0) { currentWordIndex--; savePosition('learning', currentWordIndex); }
  refreshLearningPanel();
});
document.getElementById('btn-next-word').addEventListener('click', function() {
  if (learningQueue.length === 0) return;
  if (currentWordIndex < learningQueue.length - 1) { currentWordIndex++; savePosition('learning', currentWordIndex); }
  refreshLearningPanel();
});

// Touch swipe
var touchStartX = 0;
document.getElementById('word-card').addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].clientX;
});
document.getElementById('word-card').addEventListener('touchend', function(e) {
  if (learningQueue.length === 0) return;
  var diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentWordIndex < learningQueue.length - 1) { currentWordIndex++; savePosition('learning', currentWordIndex); }
    else if (diff < 0 && currentWordIndex > 0) { currentWordIndex--; savePosition('learning', currentWordIndex); }
    refreshLearningPanel();
  }
});

// Mark buttons
document.getElementById('btn-learn-unknown').addEventListener('click', function() { markLearnWord('unknown'); });
document.getElementById('btn-learn-known').addEventListener('click', function() { markLearnWord('known'); });

function markLearnWord(status) {
  if (learningQueue.length === 0) return;
  if (isDailyLimitReached()) {
    completeLearningTask();
    return;
  }

  var word = learningQueue[currentWordIndex];
  var today = new Date().toISOString().split('T')[0];

  if (status === 'known') {
    updateWordStatus(word.id, 'known', dateAddDays(today, 7), 7);
    incrementDailyStat('learningKnown', word.id);
    learningQueue.splice(currentWordIndex, 1);
    if (learningQueue.length === 0) currentWordIndex = 0;
    else if (currentWordIndex >= learningQueue.length) currentWordIndex = 0;
    savePosition('learning', currentWordIndex);
  } else {
    updateWordStatus(word.id, 'unknown', dateAddDays(today, 1), 1);
    incrementDailyStat('learningUnknown', word.id);
    learningQueue.push(learningQueue.splice(currentWordIndex, 1)[0]);
    if (currentWordIndex >= learningQueue.length) currentWordIndex = 0;
    savePosition('learning', currentWordIndex);
  }

  if (isDailyLimitReached()) {
    refreshLearningPanel();
    completeLearningTask();
    return;
  }

  refreshLearningPanel();
}

function completeLearningTask() {
  incrementCompletionDays();
  showToast('🎀 今日任务完成！真棒小宝宝，奖励十个亲亲');
  savePosition('learning', 0);
  setTimeout(function() { switchPanel('flashcard'); }, 1500);
}

// ===== PROGRESS PANEL =====

function refreshProgressPanel() {
  var stats = getGlobalStats();
  var progress = loadProgress();
  var daily = getDailyStats();

  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-mastered-total').textContent = (stats.mastered || 0) + (stats.known || 0);
  document.getElementById('stat-unit').textContent = progress.mode === 'mixed' ? '混合' : progress.currentUnit;

  var rate = stats.total > 0 ? Math.round(((stats.mastered || 0) + (stats.known || 0)) / stats.total * 100) : 0;
  document.getElementById('stat-rate').textContent = rate + '%';
  document.getElementById('stat-streak').textContent = progress.streakDays || 0;
  document.getElementById('progress-fill').style.width = rate + '%';

  document.getElementById('completion-days').textContent = progress.completionDays || 0;

  document.getElementById('stat-learn-known').textContent = daily.learningKnown || 0;
  document.getElementById('stat-learn-unknown').textContent = daily.learningUnknown || 0;
  document.getElementById('stat-fc-known').textContent = daily.flashcardKnown || 0;
  document.getElementById('stat-fc-fuzzy').textContent = daily.flashcardFuzzy || 0;
  document.getElementById('stat-fc-unknown').textContent = daily.flashcardUnknown || 0;

  // Key words: intersection of learning unknown + flashcard unknown
  var keyIds = intersectArrays(
    (daily.learningUnknownIds || []).concat(daily.flashcardUnknownIds || []),
    (daily.learningUnknownIds || []).concat(daily.flashcardUnknownIds || [])
  );
  // Better: words that appear in BOTH learningUnknown AND flashcardUnknown
  var keyWordIds = (daily.learningUnknownIds || []).filter(function(id) {
    return (daily.flashcardUnknownIds || []).indexOf(id) !== -1;
  });
  document.getElementById('stat-keywords').textContent = keyWordIds.length;
}

function intersectArrays(a, b) {
  return a.filter(function(v) { return b.indexOf(v) !== -1; });
}

// ===== SETTINGS PANEL =====

function refreshSettingsPanel() {
  var progress = loadProgress();

  var unitSelector = document.getElementById('unit-selector');
  unitSelector.innerHTML = '';
  for (var i = 1; i <= 10; i++) {
    (function(u) {
      var tag = document.createElement('span');
      tag.className = 'unit-tag' + (progress.currentUnit === u && progress.mode === 'unit' ? ' active' : '');
      tag.textContent = 'Unit ' + u;
      tag.addEventListener('click', function() {
        setUnit(u); setMode('unit'); learningQueueReady = false; refreshSettingsPanel(); switchPanel('learning');
      });
      unitSelector.appendChild(tag);
    })(i);
  }
  var mixedTag = document.createElement('span');
  mixedTag.className = 'unit-tag' + (progress.mode === 'mixed' ? ' active' : '');
  mixedTag.textContent = '🔀 全部混合';
  mixedTag.addEventListener('click', function() {
    setMode('mixed'); learningQueueReady = false; refreshSettingsPanel(); switchPanel('learning');
  });
  unitSelector.appendChild(mixedTag);

  document.querySelectorAll('.font-size-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.size === progress.settings.fontSize);
    btn.onclick = function() {
      updateSetting('fontSize', btn.dataset.size);
      bodyEl.className = 'font-' + btn.dataset.size;
      refreshSettingsPanel();
    };
  });

  document.querySelectorAll('.mode-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.mode === progress.settings.defaultMode);
    btn.onclick = function() {
      updateSetting('defaultMode', btn.dataset.mode);
      refreshSettingsPanel();
    };
  });

  document.querySelectorAll('.daily-limit-btn').forEach(function(btn) {
    var limit = parseInt(btn.dataset.limit);
    var current = progress.settings.dailyLimit || 100;
    btn.classList.toggle('active', limit === current);
    btn.onclick = function() {
      updateSetting('dailyLimit', limit);
      refreshSettingsPanel();
    };
  });
}

// ===== MODALS =====

document.getElementById('btn-about').addEventListener('click', function() {
  document.getElementById('about-modal').style.display = 'flex';
});
document.getElementById('btn-close-about').addEventListener('click', function() {
  document.getElementById('about-modal').style.display = 'none';
});
document.getElementById('about-modal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) document.getElementById('about-modal').style.display = 'none';
});

document.getElementById('btn-close-completion').addEventListener('click', function() {
  document.getElementById('completion-modal').style.display = 'none';
});
document.getElementById('completion-modal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) document.getElementById('completion-modal').style.display = 'none';
});

// ===== KEYBOARD =====

document.addEventListener('keydown', function(e) {
  if (panels.learning.classList.contains('active')) {
    if (e.key === 'ArrowLeft') document.getElementById('btn-prev-word').click();
    if (e.key === 'ArrowRight') document.getElementById('btn-next-word').click();
    if (e.key === '1') markLearnWord('unknown');
    if (e.key === '2') markLearnWord('known');
  }
});

// ===== INIT =====

function init() {
  var progress = loadProgress();
  bodyEl.className = 'font-' + progress.settings.fontSize;
  var defaultMode = progress.settings.defaultMode || 'learning';
  switchPanel(defaultMode);
}

function dateAddDays(dateStr, days) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

init();
