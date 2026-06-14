// js/app.js

var currentWordIndex = 0;
var currentWords = [];

var panels = {
  learning: document.getElementById('panel-learning'),
  flashcard: document.getElementById('panel-flashcard'),
  progress: document.getElementById('panel-progress'),
  settings: document.getElementById('panel-settings'),
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

function refreshLearningPanel() {
  var progress = loadProgress();
  currentWords = getCurrentWords();

  if (currentWords.length === 0) {
    document.getElementById('word-en').textContent = '✨';
    document.getElementById('word-pos').textContent = '暂无单词';
    document.getElementById('word-zh').textContent = '';
    document.getElementById('word-example').textContent = '';
    return;
  }

  if (currentWordIndex >= currentWords.length) currentWordIndex = 0;
  if (currentWordIndex < 0) currentWordIndex = currentWords.length - 1;

  renderWordCard(currentWords[currentWordIndex]);
  updateWordIndexDisplay();

  var unitLabel = document.getElementById('learning-unit-label');
  if (progress.mode === 'mixed') {
    unitLabel.textContent = '🔀 全部混合';
  } else {
    unitLabel.textContent = 'Unit ' + progress.currentUnit;
  }

  var currentWord = currentWords[currentWordIndex];
  var status = progress.words[currentWord.id] || 'unknown';
  document.getElementById('btn-unknown').style.borderColor = status === 'unknown' ? 'var(--deep-pink)' : 'var(--border-pink)';
  document.getElementById('btn-fuzzy').style.borderColor = status === 'fuzzy' ? 'var(--deep-pink)' : 'var(--border-pink)';
  document.getElementById('btn-mastered').style.opacity = status === 'mastered' ? '1' : '0.9';
}

function renderWordCard(word) {
  document.getElementById('word-en').textContent = word.en;
  document.getElementById('word-pos').textContent = word.pos;
  document.getElementById('word-zh').textContent = word.zh;
  var exampleText = word.example;
  if (word.exampleZh) exampleText += ' （' + word.exampleZh + '）';
  document.getElementById('word-example').textContent = exampleText;
}

function updateWordIndexDisplay() {
  wordIndexEl.textContent = (currentWordIndex + 1) + ' / ' + currentWords.length;
}

document.getElementById('btn-prev-word').addEventListener('click', function() {
  if (currentWordIndex > 0) { currentWordIndex--; refreshLearningPanel(); }
});

document.getElementById('btn-next-word').addEventListener('click', function() {
  if (currentWordIndex < currentWords.length - 1) { currentWordIndex++; refreshLearningPanel(); }
});

var touchStartX = 0;
document.getElementById('word-card').addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].clientX;
});
document.getElementById('word-card').addEventListener('touchend', function(e) {
  var diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentWordIndex < currentWords.length - 1) currentWordIndex++;
    else if (diff < 0 && currentWordIndex > 0) currentWordIndex--;
    refreshLearningPanel();
  }
});

document.getElementById('btn-unknown').addEventListener('click', function() { markWord('unknown'); });
document.getElementById('btn-fuzzy').addEventListener('click', function() { markWord('fuzzy'); });
document.getElementById('btn-mastered').addEventListener('click', function() { markWord('mastered'); });

function markWord(status) {
  if (currentWords.length === 0) return;
  var word = currentWords[currentWordIndex];
  updateWordStatus(word.id, status);
  if (currentWordIndex < currentWords.length - 1) currentWordIndex++;
  refreshLearningPanel();
}

document.addEventListener('keydown', function(e) {
  if (!panels.learning.classList.contains('active')) return;
  if (e.key === 'ArrowLeft') document.getElementById('btn-prev-word').click();
  if (e.key === 'ArrowRight') document.getElementById('btn-next-word').click();
  if (e.key === '1') markWord('unknown');
  if (e.key === '2') markWord('fuzzy');
  if (e.key === '3') markWord('mastered');
});

function refreshProgressPanel() {
  var stats = getGlobalStats();
  var progress = loadProgress();

  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-mastered').textContent = stats.mastered;
  document.getElementById('stat-fuzzy').textContent = stats.fuzzy;
  document.getElementById('stat-unknown').textContent = stats.unknown;
  document.getElementById('stat-unit').textContent = progress.mode === 'mixed' ? '混合' : progress.currentUnit;

  var rate = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  document.getElementById('stat-rate').textContent = rate + '%';
  document.getElementById('stat-streak').textContent = progress.streakDays || 0;
  document.getElementById('progress-fill').style.width = rate + '%';
}

function handleReset() {
  var result = resetAllProgress();
  if (result) {
    showToast('🔄 进度已重置');
    currentWordIndex = 0;
    setTimeout(function() { switchPanel('learning'); refreshProgressPanel(); }, 500);
  }
}

function refreshSettingsPanel() {
  var progress = loadProgress();

  var unitSelector = document.getElementById('unit-selector');
  unitSelector.innerHTML = '';
  for (var i = 1; i <= 10; i++) {
    var tag = document.createElement('span');
    tag.className = 'unit-tag' + (progress.currentUnit === i && progress.mode === 'unit' ? ' active' : '');
    tag.textContent = 'Unit ' + i;
    tag.addEventListener('click', (function(u) { return function() {
      setUnit(u); setMode('unit'); refreshSettingsPanel(); switchPanel('learning');
    }})(i));
    unitSelector.appendChild(tag);
  }
  var mixedTag = document.createElement('span');
  mixedTag.className = 'unit-tag' + (progress.mode === 'mixed' ? ' active' : '');
  mixedTag.textContent = '🔀 全部混合';
  mixedTag.addEventListener('click', function() { setMode('mixed'); refreshSettingsPanel(); switchPanel('learning'); });
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
}

document.getElementById('btn-about').addEventListener('click', function() {
  document.getElementById('about-modal').style.display = 'flex';
});
document.getElementById('btn-close-about').addEventListener('click', function() {
  document.getElementById('about-modal').style.display = 'none';
});
document.getElementById('about-modal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) {
    document.getElementById('about-modal').style.display = 'none';
  }
});

function init() {
  var progress = loadProgress();
  bodyEl.className = 'font-' + progress.settings.fontSize;
  var defaultMode = progress.settings.defaultMode || 'learning';
  switchPanel(defaultMode);
  updateWordStatus(1, progress.words[1] || 'unknown');
  saveProgress(progress);
}

init();
