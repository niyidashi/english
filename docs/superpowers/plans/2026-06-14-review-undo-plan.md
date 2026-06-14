# 复习/撤销功能 + Bug 修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复闪卡无词 & 重置按钮无效两个 Bug；实现复习按钮、返回撤销标记、每日统计不清零、任务完成后可浏览四项功能增强。

**Architecture:** 共修改 4 个前端文件（progress.js / app.js / flashcard.js / index.html）+ 更新 SW 版本。所有状态存 localStorage，undo 栈存在内存中（不持久化）。学习/闪卡的 undo 各自独立栈。

**Tech Stack:** 纯原生 JS + HTML + CSS，零依赖。

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `js/progress.js` | localStorage CRUD，单词状态，每日统计。改动：日切保留 ID 数组 + `undoDailyStat()` |
| `js/app.js` | 学习模式逻辑。改动：`handleReset()`，复习按钮 `addReviewWords()`，undo 栈，标记按钮禁用/启用，不再自动跳转 |
| `js/flashcard.js` | 闪卡模式逻辑。改动：undo 栈，返回按钮，队列空后浏览池 |
| `index.html` | UI 布局。改动：学习面板按钮重组，闪卡面板新增返回按钮 |
| `sw.js` | Service Worker，改版本号强制刷新缓存 |

---

### Task 1: 日切保留 ID 数组 + `undoDailyStat()`

**Files:**
- Modify: `js/progress.js`

- [ ] **Step 1: 修改 `loadProgress()` 日切逻辑，保留 ID 数组**

定位到 `loadProgress()` 中约第 48-57 行的日切重置代码。将空数组初始化的 5 行改为保留旧数组。

当前代码：
```js
if (!data.dailyStats || data.dailyStats.date !== today) {
    data.dailyStats = {
        date: today,
        learningKnown: 0,      learningKnownIds: [],
        learningUnknown: 0,    learningUnknownIds: [],
        flashcardKnown: 0,     flashcardKnownIds: [],
        flashcardFuzzy: 0,     flashcardFuzzyIds: [],
        flashcardUnknown: 0,   flashcardUnknownIds: []
    };
}
```

替换为：
```js
if (!data.dailyStats || data.dailyStats.date !== today) {
    var oldIds = data.dailyStats ? {
        learningKnownIds: data.dailyStats.learningKnownIds || [],
        learningUnknownIds: data.dailyStats.learningUnknownIds || [],
        flashcardKnownIds: data.dailyStats.flashcardKnownIds || [],
        flashcardFuzzyIds: data.dailyStats.flashcardFuzzyIds || [],
        flashcardUnknownIds: data.dailyStats.flashcardUnknownIds || []
    } : {
        learningKnownIds: [],
        learningUnknownIds: [],
        flashcardKnownIds: [],
        flashcardFuzzyIds: [],
        flashcardUnknownIds: []
    };
    data.dailyStats = {
        date: today,
        learningKnown: 0,      learningKnownIds: oldIds.learningKnownIds,
        learningUnknown: 0,    learningUnknownIds: oldIds.learningUnknownIds,
        flashcardKnown: 0,     flashcardKnownIds: oldIds.flashcardKnownIds,
        flashcardFuzzy: 0,     flashcardFuzzyIds: oldIds.flashcardFuzzyIds,
        flashcardUnknown: 0,   flashcardUnknownIds: oldIds.flashcardUnknownIds
    };
}
```

- [ ] **Step 2: 修改 `updateWordStatus()` 日切逻辑，保留 ID 数组**

定位到 `updateWordStatus()` 中约第 99-111 行的日切重置代码。同样改为保留 ID 数组。

当前代码：
```js
progress.dailyStats = {
    date: today,
    learningKnown: 0,      learningKnownIds: [],
    learningUnknown: 0,    learningUnknownIds: [],
    flashcardKnown: 0,     flashcardKnownIds: [],
    flashcardFuzzy: 0,     flashcardFuzzyIds: [],
    flashcardUnknown: 0,   flashcardUnknownIds: []
};
```

替换为：
```js
var oldIds = {
    learningKnownIds: progress.dailyStats.learningKnownIds || [],
    learningUnknownIds: progress.dailyStats.learningUnknownIds || [],
    flashcardKnownIds: progress.dailyStats.flashcardKnownIds || [],
    flashcardFuzzyIds: progress.dailyStats.flashcardFuzzyIds || [],
    flashcardUnknownIds: progress.dailyStats.flashcardUnknownIds || []
};
progress.dailyStats = {
    date: today,
    learningKnown: 0,      learningKnownIds: oldIds.learningKnownIds,
    learningUnknown: 0,    learningUnknownIds: oldIds.learningUnknownIds,
    flashcardKnown: 0,     flashcardKnownIds: oldIds.flashcardKnownIds,
    flashcardFuzzy: 0,     flashcardFuzzyIds: oldIds.flashcardFuzzyIds,
    flashcardUnknown: 0,   flashcardUnknownIds: oldIds.flashcardUnknownIds
};
```

- [ ] **Step 3: 在 `progress.js` 末尾新增 `undoDailyStat()` 函数**

撤销一次每日统计计数。用于 undo 功能。

在 `resetAllProgress()` 函数之后（文件末尾）追加：
```js
function undoDailyStat(category, wordId) {
    var progress = loadProgress();
    if (progress.dailyStats[category] > 0) {
        progress.dailyStats[category]--;
    }
    var idKey = category + 'Ids';
    if (progress.dailyStats[idKey] && wordId !== undefined) {
        var idx = progress.dailyStats[idKey].indexOf(wordId);
        if (idx !== -1) progress.dailyStats[idKey].splice(idx, 1);
    }
    saveProgress(progress);
}
```

- [ ] **Step 4: 提交**

```bash
git add js/progress.js
git commit -m "fix: preserve dailyStats ID arrays on day change, add undoDailyStat helper"
```

---

### Task 2: 修复重置按钮 + 任务完成后不自动跳转

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: 在 `app.js` 末尾（`init()` 调用之前）新增 `handleReset()` 函数**

```js
function handleReset() {
    var result = resetAllProgress();
    if (result !== null) {
        showToast('🔄 已重置全部进度');
        setTimeout(function() { location.reload(); }, 1500);
    }
}
```

- [ ] **Step 2: 修改 `completeLearningTask()` 移除自动跳转闪卡**

定位到 `completeLearningTask()`（约第 203-207 行）。

当前代码：
```js
function completeLearningTask() {
    incrementCompletionDays();
    showToast('🎀 今日任务完成！真棒小宝宝，奖励十个亲亲');
    savePosition('learning', 0);
    setTimeout(function() { switchPanel('flashcard'); }, 1500);
}
```

替换为：
```js
function completeLearningTask() {
    incrementCompletionDays();
    showToast('🎀 今日任务完成！真棒小宝宝，奖励十个亲亲');
    savePosition('learning', 0);
}
```

- [ ] **Step 3: 提交**

```bash
git add js/app.js
git commit -m "fix: add handleReset for progress reset button, remove auto-switch to flashcard on task completion"
```

---

### Task 3: 学习模式 — undo 栈 + 复习按钮 + 完成后禁用标记

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: 在 `app.js` 顶部声明 undo 栈变量**

在 `var learningQueueReady = false;` 之后添加：
```js
var learnUndoStack = [];
```

- [ ] **Step 2: 重写 `markLearnWord()` 加入 undo 记录**

定位到 `markLearnWord()`（约第 169-201 行）。完全替换该函数：

```js
function markLearnWord(status) {
    if (learningQueue.length === 0) return;
    if (isDailyLimitReached()) {
        showToast('🎀 今日任务已完成，可浏览或手动进入闪卡巩固~');
        return;
    }

    var word = learningQueue[currentWordIndex];
    var today = new Date().toISOString().split('T')[0];
    var prevData = getWordData(word.id);
    var category = status === 'known' ? 'learningKnown' : 'learningUnknown';

    // Push undo record
    learnUndoStack.push({
        wordId: word.id,
        previousStatus: prevData.status,
        previousNextReview: prevData.nextReview,
        previousReviewInterval: prevData.reviewInterval || 0,
        category: category,
        queueIndex: currentWordIndex
    });
    if (learnUndoStack.length > 20) learnUndoStack.shift();

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
```

- [ ] **Step 3: 重写「← 返回」按钮逻辑**

定位到 `btn-prev-word` 的 click 监听器（约第 139-143 行）。

当前代码：
```js
document.getElementById('btn-prev-word').addEventListener('click', function() {
    if (learningQueue.length === 0) return;
    if (currentWordIndex > 0) { currentWordIndex--; savePosition('learning', currentWordIndex); }
    refreshLearningPanel();
});
```

替换为：
```js
document.getElementById('btn-prev-word').addEventListener('click', function() {
    if (learnUndoStack.length > 0) {
        var undoEntry = learnUndoStack.pop();
        // Restore word status
        if (undoEntry.previousNextReview) {
            updateWordStatus(undoEntry.wordId, undoEntry.previousStatus, undoEntry.previousNextReview, undoEntry.previousReviewInterval);
        } else {
            updateWordStatus(undoEntry.wordId, undoEntry.previousStatus);
        }
        // Remove from daily stat
        undoDailyStat(undoEntry.category, undoEntry.wordId);
        // Put word back in queue at original position
        var word = WORDS.filter(function(w) { return w.id === undoEntry.wordId; })[0];
        if (word) {
            var insertPos = Math.min(undoEntry.queueIndex, learningQueue.length);
            learningQueue.splice(insertPos, 0, word);
            currentWordIndex = insertPos;
        }
        savePosition('learning', currentWordIndex);
        refreshLearningPanel();
        return;
    }
    if (learningQueue.length === 0) return;
    if (currentWordIndex > 0) { currentWordIndex--; savePosition('learning', currentWordIndex); }
    refreshLearningPanel();
});
```

- [ ] **Step 4: 新增 `addReviewWords()` 函数**

在 `markLearnWord()` 函数之后（`completeLearningTask()` 之前）插入：

```js
function addReviewWords() {
    var daily = getDailyStats();
    var progress = loadProgress();
    var limit = progress.settings.dailyLimit || 100;

    // Collect all historically marked learning word IDs, deduplicate
    var allIds = (daily.learningKnownIds || []).concat(daily.learningUnknownIds || []);
    var uniqueIds = [];
    allIds.forEach(function(id) {
        if (uniqueIds.indexOf(id) === -1) uniqueIds.push(id);
    });

    // Exclude IDs already in the learning queue
    var queueIds = {};
    learningQueue.forEach(function(w) { queueIds[w.id] = true; });
    var freshIds = uniqueIds.filter(function(id) { return !queueIds[id]; });

    if (freshIds.length === 0) {
        showToast('📚 已加载全部复习词');
        return;
    }

    // Take up to dailyLimit, randomly
    shuffleArray(freshIds);
    var count = Math.min(freshIds.length, limit);
    var picked = freshIds.slice(0, count);
    var words = getWordsByIds(picked);

    // Insert each at a random position after currentWordIndex
    words.forEach(function(w) {
        var maxPos = learningQueue.length;
        var minPos = currentWordIndex + 1;
        if (minPos > maxPos) minPos = maxPos;
        var pos = minPos + Math.floor(Math.random() * (maxPos - minPos + 1));
        learningQueue.splice(pos, 0, w);
    });

    showToast('📥 已载入 ' + count + ' 个复习词');
    refreshLearningPanel();
}
```

- [ ] **Step 5: 为复习按钮绑定事件**

在 `init()` 函数调用之前（文件末尾附近）添加：

```js
document.getElementById('btn-review-words').addEventListener('click', function() {
    var btn = this;
    if (btn.disabled) return;
    addReviewWords();
    btn.disabled = true;
    btn.textContent = '⏳ 冷却中';
    setTimeout(function() {
        btn.disabled = false;
        btn.textContent = '🔄 复习';
    }, 3000);
});
```

- [ ] **Step 6: 修改 `refreshLearningPanel()` — 任务完成后禁用标记按钮而非隐藏卡片**

定位到 `refreshLearningPanel()`（约第 81-110 行）。替换函数：

```js
function refreshLearningPanel() {
    if (!learningQueueReady) buildLearningQueue();

    var dailyCount = getTodayLearningCount();
    var limitDisplay = getDailyLimitDisplay();
    var limitReached = isDailyLimitReached();

    document.getElementById('learning-progress-text').textContent = '今日: ' + dailyCount + '/' + limitDisplay;

    if (learningQueue.length === 0) {
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

    // Enable/disable mark buttons based on daily limit
    var btnUnknown = document.getElementById('btn-learn-unknown');
    var btnKnown = document.getElementById('btn-learn-known');
    var hintEl = document.querySelector('#panel-learning > div:last-child');
    if (limitReached) {
        btnUnknown.disabled = true;
        btnKnown.disabled = true;
        btnUnknown.textContent = '🎀 已完成';
        btnKnown.textContent = '🎀 已完成';
        if (hintEl) hintEl.innerHTML = '💡 今日任务完成！可浏览或手动进入闪卡巩固~';
    } else {
        btnUnknown.disabled = false;
        btnKnown.disabled = false;
        btnUnknown.textContent = '❌ 不认识';
        btnKnown.textContent = '✅ 认识';
        if (hintEl) hintEl.innerHTML = '💡 不认识会推到后面再练，任务完成后自动提示巩固';
    }

    // Update review button state
    updateReviewButtonState();

    var progress = loadProgress();
    var unitLabel = document.getElementById('learning-unit-label');
    if (progress.mode === 'mixed') {
        unitLabel.textContent = '🔀 全部混合';
    } else {
        unitLabel.textContent = 'Unit ' + progress.currentUnit;
    }
}
```

- [ ] **Step 7: 新增 `updateReviewButtonState()` 函数**

复习按钮状态管理。放在 `refreshLearningPanel()` 之后：

```js
function updateReviewButtonState() {
    var btn = document.getElementById('btn-review-words');
    if (!btn || btn.disabled) return; // Don't override cooldown
    var daily = getDailyStats();
    var allIds = (daily.learningKnownIds || []).concat(daily.learningUnknownIds || []);
    var queueIds = {};
    learningQueue.forEach(function(w) { queueIds[w.id] = true; });
    var hasFresh = allIds.some(function(id) { return !queueIds[id]; });
    if (!hasFresh) {
        btn.disabled = true;
        btn.textContent = '已加载全部';
    } else {
        btn.disabled = false;
        btn.textContent = '🔄 复习';
    }
}
```

- [ ] **Step 8: 提交**

```bash
git add js/app.js
git commit -m "feat: add learning undo stack, review button, disable mark on task completion"
```

---

### Task 4: 闪卡模式 — undo 栈 + 返回按钮 + 空队列浏览池

**Files:**
- Modify: `js/flashcard.js`

- [ ] **Step 1: 在 `flashcard.js` 顶部新增变量**

在 `var fcFlipped = false;` 之后添加：
```js
var fcUndoStack = [];
var fcBrowseOnly = false;
```

- [ ] **Step 2: 修改「掌握」按钮 — 记录 undo**

定位到 `btn-fc-known` 监听器（约第 91-103 行）。替换：

```js
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
```

- [ ] **Step 3: 修改「模糊」按钮 — 记录 undo**

定位到 `btn-fc-fuzzy` 监听器（约第 106-118 行）。替换：

```js
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
```

- [ ] **Step 4: 修改「不认识」按钮 — 记录 undo**

定位到 `btn-fc-unknown` 监听器（约第 121-132 行）。替换：

```js
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
```

- [ ] **Step 5: 重写 `finishFlashcard()` + 添加返回按钮逻辑**

替换 `finishFlashcard()`（约第 134-140 行）为：

```js
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
```

- [ ] **Step 6: 添加闪卡返回按钮事件绑定**

在文件末尾（`dateAddDays` 定义之后）添加：

```js
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
```

- [ ] **Step 7: 修改 `refreshFlashcardPanel()` — 浏览模式禁用标记按钮**

定位到 `refreshFlashcardPanel()`（约第 45-68 行）。在函数末尾 `fcFlipped = false;` 之前添加按钮状态控制。完整替换函数：

```js
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

    // Disable buttons in browse-only mode
    setFlashcardButtonsDisabled(fcBrowseOnly);
}

function setFlashcardButtonsDisabled(disabled) {
    var btns = ['btn-fc-unknown', 'btn-fc-fuzzy', 'btn-fc-known'];
    btns.forEach(function(id) {
        var btn = document.getElementById(id);
        if (btn) {
            btn.disabled = disabled;
            if (disabled) {
                btn.style.opacity = '0.5';
            } else {
                btn.style.opacity = '1';
            }
        }
    });
}
```

- [ ] **Step 8: 提交**

```bash
git add js/flashcard.js
git commit -m "feat: add flashcard undo stack, return button, browse pool after queue empty"
```

---

### Task 5: HTML 布局更改

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 调整学习模式按钮布局**

定位到学习面板的按钮区域（约第 42-52 行）。

当前代码：
```html
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px">
    <button id="btn-prev-word" class="btn btn-outline" style="min-width:48px">←</button>
    <span id="word-index" style="font-size:12px;color:var(--text-medium);font-weight:600"></span>
    <button id="btn-next-word" class="btn btn-outline" style="min-width:48px">→</button>
</div>
```

替换为：
```html
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:6px">
    <button id="btn-prev-word" class="btn btn-outline" style="min-width:40px;font-size:12px">← 返回</button>
    <button id="btn-review-words" class="btn btn-ghost" style="font-size:11px;padding:6px 10px">🔄 复习</button>
    <span id="word-index" style="font-size:12px;color:var(--text-medium);font-weight:600"></span>
    <button id="btn-next-word" class="btn btn-outline" style="min-width:36px;font-size:12px">→</button>
</div>
```

- [ ] **Step 2: 闪卡面板新增返回按钮**

定位到闪卡面板的按钮区域（约第 74-78 行）。在三个标记按钮之前插入返回按钮：

在 `<div class="btn-group">` 之前插入：
```html
<div style="text-align:center;margin-bottom:8px">
    <button id="btn-fc-prev" class="btn btn-outline" style="font-size:11px;padding:6px 14px">← 返回上一词</button>
</div>
```

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat: add review and return buttons to learning/flashcard panels"
```

---

### Task 6: Service Worker 版本号更新

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: 改 CACHE_NAME 版本号**

定位到 `sw.js` 第 1 行。将 `v4` 改为 `v5`：

```js
const CACHE_NAME = 'meowvocab-v5';
```

- [ ] **Step 2: 提交 + 推送全部**

```bash
git add sw.js
git commit -m "chore: bump SW cache to v5 for undo/review feature release"
git push origin master
```

---

### Task 7: 验证清单

全部提交推送后，在浏览器中验证：

- [ ] 闪卡模式：学习模式先点几个认识/不认识 → 切到闪卡 → 能看到单词
- [ ] 重置按钮：进度页点"重置进度"→ 确认弹窗 → 确认后刷新并重置
- [ ] 复习按钮：学习页点"复习"→ 队列中插入复习词 → 3 秒冷却后按钮恢复
- [ ] 学习 undo：点「认识」标记一个词 → 点「← 返回」→ 该词恢复原状态、放回队列、统计 -1
- [ ] 闪卡 undo：点「掌握」标记 → 点「← 返回上一词」→ 撤销
- [ ] 任务完成后标记按钮禁用：学到任务量上限 → 标记按钮变灰显示「🎀 已完成」
- [ ] 任务完成后仍可浏览：任务量满后仍可 ← → 浏览单词卡片
- [ ] 闪卡完成可浏览：闪卡全部做完 → 弹出完成弹窗 → 可浏览已标记词
- [ ] 跨天 ID 数组不清零：改系统日期再操作 → 统计页卡片点击能看到昨天+今天的单词
