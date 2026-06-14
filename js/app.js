// js/app.js
var currentWordIndex = 0;
var currentWords = [];
var learningQueue = [];
var learningDoneToday = 0;

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

  if (panelName === 'learning') refreshLearningPanel();
  if (panelName === 'flashcard') refreshFlashcardPanel();
  if (panelName === 'progress') refreshProgressPanel();
  if (panelName === 'settings') refreshSettingsPanel();
}

navItems.forEach(function(item) {
  item.addEventListener('click', function() { switchPanel(item.dataset.panel); });
});

// ===== LEARNING MODE =====

function refreshLearningPanel() {
  var progress = loadProgress();
  var allWords = getCurrentWords();
  var today = new Date().toISOString().split('T')[0];

  // Build learning queue: due words first, then new (unknown without nextReview), then unknown with future review
  var dueWords = [];
  var newWords = [];
  var queuedUnknown = [];

  allWords.forEach(function(w) {
    var d = getWordData(w.id);
    if (d.status === 'known' || d.status === 'mastered') {
      // Already known/mastered, check if due for review
      if (d.nextReview && d.nextReview <= today) dueWords.push(w);
    } else if (d.status === 'unknown' || d.status === 'fuzzy') {
      if (!d.nextReview) {
        newWords.push(w);
      } else if (d.nextReview <= today) {
        dueWords.push(w);
      } else {
        queuedUnknown.push(w);
      }
    }
  });

  learningQueue = dueWords.concat(newWords).concat(queuedUnknown);

  // Restore position
  currentWordIndex = progress.currentWordIndex || 0;
  learningDoneToday = getTodayLearningCount();

  if (learningQueue.length === 0 || isDailyLimitReached()) {
    document.getElementById('word-en').textContent = '✨';
    document.getElementById('word-pos').textContent = '今日学习完成';
    document.getElementById('word-zh').textContent = '进入闪卡模式巩固吧~';
    document.getElementById('word-example').textContent = '';
    document.getElementById('word-index').textContent = '0/0';
    document.getElementById('learning-progress-text').textContent = '今日: ' + learningDoneToday + '/' + getDailyLimitDisplay();
    return;
  }

  if (currentWordIndex >= learningQueue.length) currentWordIndex = 0;

  renderWordCard(learningQueue[currentWordIndex]);
  updateWordIndexDisplay();

  var unitLabel = document.getElementById('learning-unit-label');
  if (progress.mode === 'mixed') {
    unitLabel.textContent = '🔀 全部混合';
  } else {
    unitLabel.textContent = 'Unit ' + progress.currentUnit;
  }

  document.getElementById('learning-progress-text').textContent =
    '今日: ' + learningDoneToday + '/' + getDailyLimitDisplay();

  // Highlight current status
  var currentWord = learningQueue[currentWordIndex];
  var d = getWordData(currentWord.id);
  var status = d.status || 'unknown';
  if (status === 'known' || status === 'mastered') {
    document.getElementById('btn-learn-unknown').style.opacity = '0.7';
    document.getElementById('btn-learn-known').style.opacity = '1';
  } else {
    document.getElementById('btn-learn-unknown').style.opacity = '1';
    document.getElementById('btn-learn-known').style.opacity = '1';
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

document.getElementById('btn-prev-word').addEventListener('click', function() {
  if (currentWordIndex > 0) { currentWordIndex--; savePosition('learning', currentWordIndex); refreshLearningPanel(); }
});

document.getElementById('btn-next-word').addEventListener('click', function() {
  if (currentWordIndex < learningQueue.length - 1) { currentWordIndex++; savePosition('learning', currentWordIndex); refreshLearningPanel(); }
});

// Touch swipe
var touchStartX = 0;
document.getElementById('word-card').addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].clientX;
});
document.getElementById('word-card').addEventListener('touchend', function(e) {
  var diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentWordIndex < learningQueue.length - 1) { currentWordIndex++; savePosition('learning', currentWordIndex); }
    else if (diff < 0 && currentWordIndex > 0) { currentWordIndex--; savePosition('learning', currentWordIndex); }
    refreshLearningPanel();
  }
});

document.getElementById('btn-learn-unknown').addEventListener('click', function() { markLearnWord('unknown'); });
document.getElementById('btn-learn-known').addEventListener('click', function() { markLearnWord('known'); });

function markLearnWord(status) {
  if (learningQueue.length === 0) return;
  var word = learningQueue[currentWordIndex];
  var today = new Date().toISOString().split('T')[0];

  if (status === 'known') {
    updateWordStatus(word.id, 'known', dateAddDays(today, 7), 7);
    incrementDailyStat('learningKnown');
  } else {
    updateWordStatus(word.id, 'unknown', dateAddDays(today, 1), 1);
    incrementDailyStat('learningUnknown');
    // Move to end of queue for re-practice
    var currentWord = learningQueue.splice(currentWordIndex, 1)[0];
    learningQueue.push(currentWord);
    savePosition('learning', currentWordIndex);
    refreshLearningPanel();
    return;
  }

  // Check if daily limit reached
  if (isDailyLimitReached()) {
    showToast('🎀 今日学习任务完成！进入闪卡模式');
    savePosition('learning', 0);
    setTimeout(function() { switchPanel('flashcard'); }, 1000);
    return;
  }

  // Advance in queue
  learningQueue.splice(currentWordIndex, 1);
  if (currentWordIndex >= learningQueue.length) currentWordIndex = 0;
  savePosition('learning', currentWordIndex);
  refreshLearningPanel();
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

  // Daily stats
  document.getElementById('stat-learn-known').textContent = daily.learningKnown || 0;
  document.getElementById('stat-learn-unknown').textContent = daily.learningUnknown || 0;
  document.getElementById('stat-fc-known').textContent = daily.flashcardKnown || 0;
  document.getElementById('stat-fc-fuzzy').textContent = daily.flashcardFuzzy || 0;
  document.getElementById('stat-fc-unknown').textContent = daily.flashcardUnknown || 0;
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
      tag.addEventListener('click', function() { setUnit(u); setMode('unit'); refreshSettingsPanel(); switchPanel('learning'); });
      unitSelector.appendChild(tag);
    })(i);
  }
  var mixedTag = document.createElement('span');
  mixedTag.className = 'unit-tag' + (progress.mode === 'mixed' ? ' active' : '');
  mixedTag.textContent = '🔀 全部混合';
  mixedTag.addEventListener('click', function() { setMode('mixed'); refreshSettingsPanel(); switchPanel('learning'); });
  unitSelector.appendChild(mixedTag);

  // Font size
  document.querySelectorAll('.font-size-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.size === progress.settings.fontSize);
    btn.onclick = function() {
      updateSetting('fontSize', btn.dataset.size);
      bodyEl.className = 'font-' + btn.dataset.size;
      refreshSettingsPanel();
    };
  });

  // Default mode
  document.querySelectorAll('.mode-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.mode === progress.settings.defaultMode);
    btn.onclick = function() {
      updateSetting('defaultMode', btn.dataset.mode);
      refreshSettingsPanel();
    };
  });

  // Daily limit
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

// ===== KEYBOARD SHORTCUTS =====

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
