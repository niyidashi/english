// js/flashcard.js
var fcWords = [];
var fcIndex = 0;
var fcFlipped = false;

function refreshFlashcardPanel() {
  var progress = loadProgress();
  var today = new Date().toISOString().split('T')[0];

  // Collect all candidate words (not known-learning type)
  var dueWords = [];
  var newWords = [];
  var unknownWords = [];

  getCurrentWords().forEach(function(w) {
    var d = getWordData(w.id);
    if (d.status === 'known') {
      // If has nextReview and due, add to due list
      if (d.nextReview && d.nextReview <= today) dueWords.push(w);
    } else if (d.status === 'mastered') {
      if (d.nextReview && d.nextReview <= today) dueWords.push(w);
    } else if (d.status === 'fuzzy') {
      if (d.nextReview && d.nextReview <= today) dueWords.push(w);
      else unknownWords.push(w);
    } else {
      // unknown — never studied in flashcard
      newWords.push(w);
    }
  });

  // Priority: due > new > unknown-queue
  fcWords = dueWords.concat(newWords).concat(unknownWords);

  if (fcWords.length === 0) {
    document.getElementById('fc-word-en').textContent = '✨';
    document.getElementById('fc-word-pos').textContent = '没有需要复习的单词了';
    document.getElementById('fc-word-zh').textContent = '';
    document.getElementById('fc-word-example').textContent = '';
    document.getElementById('flashcard-count').textContent = '0/0';
    document.getElementById('flashcard').classList.remove('flipped');
    fcFlipped = false;
    return;
  }

  // Restore position
  fcIndex = progress.flashcardIndex || 0;
  if (fcIndex >= fcWords.length) fcIndex = 0;

  showFlashcardWord(fcWords[fcIndex]);
  updateFlashcardCount();
  document.getElementById('flashcard').classList.remove('flipped');
  fcFlipped = false;
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
  var today = getTodayLearnedCount();
  document.getElementById('flashcard-count').textContent = (fcIndex + 1) + ' / ' + fcWords.length + ' | 今日已学 ' + today;
}

function getTodayLearnedCount() {
  var stats = getDailyStats();
  return (stats.flashcardKnown || 0) + (stats.flashcardFuzzy || 0) + (stats.flashcardUnknown || 0);
}

document.getElementById('flashcard').addEventListener('click', function() {
  this.classList.toggle('flipped');
  fcFlipped = !fcFlipped;
});

document.getElementById('btn-fc-known').addEventListener('click', function() {
  if (fcWords.length === 0) return;
  var word = fcWords[fcIndex];
  var d = getWordData(word.id);
  var today = new Date().toISOString().split('T')[0];

  if (d.status === 'unknown' || d.status === 'known') {
    // Promote to mastered, review in 7 days
    var next7 = dateAddDays(today, 7);
    updateWordStatus(word.id, 'mastered', next7, 7);
    incrementDailyStat('flashcardKnown');
    showToast('🎀 已掌握！7天后复习');
  } else if (d.status === 'fuzzy') {
    // Promote from fuzzy to mastered
    var next7 = dateAddDays(today, 7);
    updateWordStatus(word.id, 'mastered', next7, 7);
    incrementDailyStat('flashcardKnown');
    showToast('🎀 已掌握！7天后复习');
  } else if (d.status === 'mastered') {
    // Already mastered, extend interval
    var interval = (d.reviewInterval || 7) * 2;
    if (interval > 60) interval = 60;
    var nextDate = dateAddDays(today, interval);
    updateWordStatus(word.id, 'mastered', nextDate, interval);
    incrementDailyStat('flashcardKnown');
    showToast('🎀 巩固成功！' + interval + '天后复习');
  } else {
    updateWordStatus(word.id, 'mastered', dateAddDays(today, 7), 7);
    incrementDailyStat('flashcardKnown');
    showToast('🎀 已掌握！');
  }

  advanceFlashcard();
});

document.getElementById('btn-fc-fuzzy').addEventListener('click', function() {
  if (fcWords.length === 0) return;
  var word = fcWords[fcIndex];
  var today = new Date().toISOString().split('T')[0];
  updateWordStatus(word.id, 'fuzzy', dateAddDays(today, 3), 3);
  incrementDailyStat('flashcardFuzzy');
  showToast('💗 标记模糊，3天后复习');
  advanceFlashcard();
});

document.getElementById('btn-fc-unknown').addEventListener('click', function() {
  if (fcWords.length === 0) return;
  var word = fcWords[fcIndex];
  var today = new Date().toISOString().split('T')[0];
  updateWordStatus(word.id, 'unknown', dateAddDays(today, 1), 1);
  incrementDailyStat('flashcardUnknown');
  showToast('🤍 明天再复习');
  advanceFlashcard();
});

function advanceFlashcard() {
  var progress = loadProgress();
  var today = new Date().toISOString().split('T')[0];

  // Rebuild pool: exclude non-due mastered/fuzzy
  var allCandidates = getCurrentWords();
  var dueWords = [];
  var newWords = [];
  var unknownQueue = [];
  // Keep current unknown words that were just marked
  var currentUnknownId = fcWords.length > 0 ? fcWords[fcIndex].id : null;

  allCandidates.forEach(function(w) {
    var d = getWordData(w.id);
    if (d.status === 'known' || d.status === 'mastered') {
      if (d.nextReview && d.nextReview <= today) dueWords.push(w);
    } else if (d.status === 'fuzzy') {
      if (d.nextReview && d.nextReview <= today) dueWords.push(w);
      else unknownQueue.push(w);
    } else {
      newWords.push(w);
    }
  });

  fcWords = dueWords.concat(newWords).concat(unknownQueue);

  if (fcWords.length === 0) {
    fcIndex = 0;
    refreshFlashcardPanel();
    // Show completion modal
    var stats = getDailyStats();
    var totalLearned = (stats.flashcardKnown || 0) + (stats.flashcardFuzzy || 0) + (stats.flashcardUnknown || 0);
    document.getElementById('completion-msg').textContent = '今天学习了 ' + totalLearned + ' 个单词，已掌握 ' + (stats.flashcardKnown || 0) + ' 个';
    document.getElementById('completion-modal').style.display = 'flex';
    return;
  }

  fcIndex = fcIndex % fcWords.length;
  savePosition('flashcard', fcIndex);
  showFlashcardWord(fcWords[fcIndex]);
  updateFlashcardCount();
  document.getElementById('flashcard').classList.remove('flipped');
  fcFlipped = false;
}

function dateAddDays(dateStr, days) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
