// js/flashcard.js

var fcWords = [];
var fcIndex = 0;

function refreshFlashcardPanel() {
  var progress = loadProgress();
  fcWords = getCurrentWords().filter(function(w) {
    var status = progress.words[w.id] || 'unknown';
    return status !== 'mastered';
  });

  if (fcWords.length === 0) {
    document.getElementById('fc-word-en').textContent = '✨';
    document.getElementById('fc-word-pos').textContent = '没有需要复习的单词了';
    document.getElementById('fc-word-zh').textContent = '';
    document.getElementById('fc-word-example').textContent = '';
    document.getElementById('flashcard-count').textContent = '0/0';
    return;
  }

  fcIndex = Math.min(fcIndex, fcWords.length - 1);
  showFlashcardWord(fcWords[fcIndex]);
  updateFlashcardCount();
}

function showFlashcardWord(word) {
  var card = document.getElementById('flashcard');
  card.classList.remove('flipped');

  document.getElementById('fc-word-en').textContent = word.en;
  document.getElementById('fc-word-pos').textContent = word.pos;
  document.getElementById('fc-word-zh').textContent = word.zh;
  var exampleText = word.example;
  if (word.exampleZh) exampleText += ' （' + word.exampleZh + '）';
  document.getElementById('fc-word-example').textContent = exampleText;
}

function updateFlashcardCount() {
  document.getElementById('flashcard-count').textContent = (fcIndex + 1) + ' / ' + fcWords.length;
}

document.getElementById('flashcard').addEventListener('click', function() {
  this.classList.toggle('flipped');
});

document.getElementById('btn-fc-known').addEventListener('click', function() {
  if (fcWords.length === 0) return;
  var word = fcWords[fcIndex];
  var progress = loadProgress();
  var currentStatus = progress.words[word.id] || 'unknown';

  var newStatus;
  if (currentStatus === 'unknown') newStatus = 'fuzzy';
  else if (currentStatus === 'fuzzy') newStatus = 'mastered';
  else newStatus = 'mastered';

  updateWordStatus(word.id, newStatus);
  showToast(newStatus === 'mastered' ? '🎀 已掌握！' : '💗 标记为模糊');
  advanceFlashcard();
});

document.getElementById('btn-fc-unknown').addEventListener('click', function() {
  if (fcWords.length === 0) return;
  var word = fcWords[fcIndex];
  updateWordStatus(word.id, 'unknown');
  showToast('🤍 继续加油');
  advanceFlashcard();
});

function advanceFlashcard() {
  var progress = loadProgress();
  fcWords = fcWords.filter(function(w) {
    var status = progress.words[w.id] || 'unknown';
    return status !== 'mastered';
  });

  if (fcWords.length === 0) {
    fcIndex = 0;
    refreshFlashcardPanel();
    return;
  }

  fcIndex = fcIndex % fcWords.length;
  showFlashcardWord(fcWords[fcIndex]);
  updateFlashcardCount();
}
