// js/flashcard.js
var fcWords = [];
var fcIndex = 0;
var fcFlipped = false;
var fcPoolReady = false;
var fcUndoStack = [];
var fcBrowseOnly = false;

function buildFlashcardPool() {
  fcBrowseOnly = false;
  var progress = loadProgress();
  var today = new Date().toISOString().split('T')[0];
  var daily = getDailyStats();

  // Source: words from today's learning mode (known + unknown IDs)
  var learnedIds = (daily.learningKnownIds || []).concat(daily.learningUnknownIds || []);

  if (learnedIds.length === 0) {
    fcWords = [];
    fcPoolReady = true;
    fcIndex = 0;
    return;
  }

  var learnedWords = WORDS.filter(function(w) { return learnedIds.indexOf(w.id) !== -1; });

  var dueWords = [];
  var newWords = [];
  var queuedWords = [];

  learnedWords.forEach(function(w) {
    var d = getWordData(w.id);
    if (d.status === 'known' || d.status === 'mastered') {
      if (!d.nextReview || d.nextReview <= today) dueWords.push(w);
    } else {
      if (!d.nextReview || d.nextReview <= today) newWords.push(w);
      else queuedWords.push(w);
    }
  });

  fcWords = dueWords.concat(newWords).concat(queuedWords);
  fcPoolReady = true;

  fcIndex = progress.flashcardIndex || 0;
  if (fcIndex >= fcWords.length) fcIndex = 0;
}

function refreshFlashcardPanel() {
  if (!fcPoolReady) buildFlashcardPool();

  if (fcWords.length === 0) {
    var daily = getDailyStats();
    var learnedIds = (daily.learningKnownIds || []).concat(daily.learningUnknownIds || []);
    document.getElementById('fc-word-en').textContent = '🐱';
    document.getElementById('fc-word-pos').textContent = learnedIds.length === 0
      ? '当前没有学习的单词，请先学习小宝宝~'
      : '没有需要复习的单词了';
    document.getElementById('fc-word-zh').textContent = '';
    document.getElementById('fc-word-example').textContent = '';
    document.getElementById('flashcard-count').textContent = '0/0';
    document.getElementById('flashcard').classList.remove('flipped');
    fcFlipped = false;
    setFlashcardButtonsDisabled(true);
    return;
  }

  if (fcIndex >= fcWords.length) fcIndex = 0;
  showFlashcardWord(fcWords[fcIndex]);
  updateFlashcardCount();
  document.getElementById('flashcard').classList.remove('flipped');
  fcFlipped = false;
  setFlashcardButtonsDisabled(fcBrowseOnly);
}

function setFlashcardButtonsDisabled(disabled) {
  var btns = ['btn-fc-unknown', 'btn-fc-fuzzy', 'btn-fc-known'];
  btns.forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.5' : '1';
    }
  });
}

function showFlashcardWord(word) {
  document.getElementById('fc-word-en').textContent = word.en;
  document.getElementById('fc-word-pos').textContent = word.pos;
  document.getElementById('fc-word-zh').textContent = word.zh;
  var exampleText = word.example;
  if (word.exampleZh) exampleText += ' （' + word.exampleZh + '）';
  document.getElementById('fc-word-example').textContent = exampleText;
}

function updateFlashcardCount() {
  var stats = getDailyStats();
  var today = (stats.flashcardKnown || 0) + (stats.flashcardFuzzy || 0) + (stats.flashcardUnknown || 0);
  document.getElementById('flashcard-count').textContent = (fcIndex + 1) + ' / ' + fcWords.length + ' | 今日 ' + today;
}

document.getElementById('flashcard').addEventListener('click', function() {
  this.classList.toggle('flipped');
  fcFlipped = !fcFlipped;
});

// 掌握 → mastered, 7天后复习, 移出今日队列
document.getElementById('btn-fc-known').addEventListener('click', function() {
  if (fcWords.length === 0 || fcBrowseOnly) return;
  var word = fcWords[fcIndex];
  var today = new Date().toISOString().split('T')[0];
  var prevData = getWordData(word.id);

  fcUndoStack.push({
    wordId: word.id,
    previousStatus: prevData.status,
    previousNextReview: prevData.nextReview,
    previousReviewInterval: prevData.reviewInterval || 0,
    category: 'flashcardKnown',
    fcIndex: fcIndex
  });
  if (fcUndoStack.length > 20) fcUndoStack.shift();

  updateWordStatus(word.id, 'mastered', dateAddDays(today, 7), 7);
  incrementDailyStat('flashcardKnown', word.id);
  showToast('🎀 已掌握！7天后复习');
  fcWords.splice(fcIndex, 1);
  if (fcWords.length === 0) { fcIndex = 0; finishFlashcard(); return; }
  if (fcIndex >= fcWords.length) fcIndex = 0;
  savePosition('flashcard', fcIndex);
  refreshFlashcardPanel();
});

// 模糊 → fuzzy, 3天后复习, 推回队尾
document.getElementById('btn-fc-fuzzy').addEventListener('click', function() {
  if (fcWords.length === 0 || fcBrowseOnly) return;
  var word = fcWords[fcIndex];
  var today = new Date().toISOString().split('T')[0];
  var prevData = getWordData(word.id);

  fcUndoStack.push({
    wordId: word.id,
    previousStatus: prevData.status,
    previousNextReview: prevData.nextReview,
    previousReviewInterval: prevData.reviewInterval || 0,
    category: 'flashcardFuzzy',
    fcIndex: fcIndex
  });
  if (fcUndoStack.length > 20) fcUndoStack.shift();

  updateWordStatus(word.id, 'fuzzy', dateAddDays(today, 3), 3);
  incrementDailyStat('flashcardFuzzy', word.id);
  showToast('💗 标记模糊，放到后面再练');
  var moved = fcWords.splice(fcIndex, 1)[0];
  fcWords.push(moved);
  if (fcIndex >= fcWords.length) fcIndex = 0;
  savePosition('flashcard', fcIndex);
  refreshFlashcardPanel();
});

// 不认识 → unknown, 放回队列末尾
document.getElementById('btn-fc-unknown').addEventListener('click', function() {
  if (fcWords.length === 0 || fcBrowseOnly) return;
  var word = fcWords[fcIndex];
  var prevData = getWordData(word.id);

  fcUndoStack.push({
    wordId: word.id,
    previousStatus: prevData.status,
    previousNextReview: prevData.nextReview,
    previousReviewInterval: prevData.reviewInterval || 0,
    category: 'flashcardUnknown',
    fcIndex: fcIndex
  });
  if (fcUndoStack.length > 20) fcUndoStack.shift();

  updateWordStatus(word.id, 'unknown');
  incrementDailyStat('flashcardUnknown', word.id);
  showToast('🤍 不认识，放到最后再练');
  var moved = fcWords.splice(fcIndex, 1)[0];
  fcWords.push(moved);
  if (fcIndex >= fcWords.length) fcIndex = 0;
  savePosition('flashcard', fcIndex);
  refreshFlashcardPanel();
});

function finishFlashcard() {
  // Build browse pool from all today's flashcard-marked words
  var daily = getDailyStats();
  var browseIds = (daily.flashcardKnownIds || [])
    .concat(daily.flashcardFuzzyIds || [])
    .concat(daily.flashcardUnknownIds || []);
  if (browseIds.length > 0) {
    fcWords = getWordsByIds(browseIds);
    fcBrowseOnly = true;
    fcIndex = 0;
  }
  refreshFlashcardPanel();
  var stats = getDailyStats();
  var totalLearned = (stats.flashcardKnown || 0) + (stats.flashcardFuzzy || 0) + (stats.flashcardUnknown || 0);
  document.getElementById('completion-msg').textContent = '今天复习了 ' + totalLearned + ' 个单词，已掌握 ' + (stats.flashcardKnown || 0) + ' 个';
  document.getElementById('completion-modal').style.display = 'flex';
}

function dateAddDays(dateStr, days) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

document.getElementById('btn-fc-prev').addEventListener('click', function() {
  if (fcUndoStack.length > 0) {
    var undoEntry = fcUndoStack.pop();
    // Restore word status
    if (undoEntry.previousNextReview) {
      updateWordStatus(undoEntry.wordId, undoEntry.previousStatus, undoEntry.previousNextReview, undoEntry.previousReviewInterval);
    } else {
      updateWordStatus(undoEntry.wordId, undoEntry.previousStatus);
    }
    // Remove from daily stat
    undoDailyStat(undoEntry.category, undoEntry.wordId);
    // Put word back at original position
    var word = WORDS.filter(function(w) { return w.id === undoEntry.wordId; })[0];
    if (word) {
      var insertPos = Math.min(undoEntry.fcIndex, fcWords.length);
      fcWords.splice(insertPos, 0, word);
      fcIndex = insertPos;
      fcBrowseOnly = false;
    }
    savePosition('flashcard', fcIndex);
    refreshFlashcardPanel();
    return;
  }
  if (fcWords.length === 0) return;
  if (fcIndex > 0) { fcIndex--; savePosition('flashcard', fcIndex); }
  refreshFlashcardPanel();
});
