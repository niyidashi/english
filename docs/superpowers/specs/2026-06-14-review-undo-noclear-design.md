# 单词记忆器 — 修复 & 复习/撤销功能增强

> 日期：2026-06-14 | 状态：已确认

---

## 一、背景

用户报告三个问题，并在此基础上提出功能增强需求。当前代码基于单 HTML 四面板架构（学习/闪卡/进度/设置），localStorage 持久化。

---

## 二、Bug 修复（2 项）

### Bug 1：闪卡模式始终无单词显示

**现象**：进入闪卡模式提示"当前没有学习的单词，请先学习小宝宝~"。

**根因**：`buildFlashcardPool()` 从 `dailyStats.learningKnownIds` + `dailyStats.learningUnknownIds` 构建词源。但 `updateWordStatus()` 检测到日期变化时，将 `dailyStats` 整体重置（包括 ID 数组清空 → `[]`）。如果用户在同一自然日内标记了单词后没有立即进入闪卡（或页面刷新生效，或日切逻辑在标记前触发），ID 数组即为空。

**修复**：配合下文「每日统计不清零」变更，日切时只重置数值计数器保留 ID 数组。闪卡词源天然不再为空。

### Bug 2：统计页"全部重置"按钮无效

**现象**：点击 `🔄 重置进度` 无反应。

**根因**：`index.html` 按钮 `onclick="handleReset()"`，但 `handleReset` 函数未在任何 JS 文件中定义。`progress.js` 仅有 `resetAllProgress()`（返回新默认数据或 null）。

**修复**：在 `app.js` 中新增 `handleReset()`（因需要调用 `showToast`，而 `showToast` 定义在 `export.js` 中，`app.js` 最后加载可访问全部函数）：
```js
function handleReset() {
  var result = resetAllProgress();
  if (result !== null) {
    showToast('🔄 已重置全部进度');
    setTimeout(function() { location.reload(); }, 1500);
  }
}
```

---

## 三、功能变更

### 变更 A：每日统计不清零

**现状**：`updateWordStatus()` 检测到日期变更时，`dailyStats` 整体重置为带空数组的初始结构，ID 数组随数字一起清空。

**改为**：日切时仅重置数值计数器为 0，ID 数组保留不重置，持续累积历史数据。

**影响范围**：
- 统计页点击卡片 → 显示所有历史单词而非仅今日
- 闪卡词源 → 始终有所有历史学习过的单词可用
- "今日学习量"显示 → 仍反映今日计数（数字清零）
- 导出/导入 → ID 数组持久保存

**dailyStats 结构**（不变）：
```json
{
  "date": "2026-06-14",
  "learningKnown": 0,       "learningKnownIds": ["word1", "word3", ...],
  "learningUnknown": 0,     "learningUnknownIds": ["word5", "word2", ...],
  "flashcardKnown": 0,      "flashcardKnownIds": [...],
  "flashcardFuzzy": 0,      "flashcardFuzzyIds": [...],
  "flashcardUnknown": 0,    "flashcardUnknownIds": [...]
}
```

日切逻辑伪代码：
```
dailyStats.date = today
dailyStats.learningKnown = 0       // 只清零数字
dailyStats.learningUnknown = 0
dailyStats.flashcardKnown = 0
dailyStats.flashcardFuzzy = 0
dailyStats.flashcardUnknown = 0
// ID 数组全部保留
```

### 变更 B：学习模式新增复习按钮

**位置**：学习面板，← 箭头 → → 之间或右侧，新增「🔄 复习」按钮。

**行为**：
1. 点击后从 `dailyStats.learningKnownIds` + `dailyStats.learningUnknownIds` 中取所有历史 ID（去重）
2. 排除已在当前 `learningQueue` 中的 ID
3. 取前 N 个（N = `dailyLimit`），传入 `WORDS` 转为单词对象
4. 随机插入 `learningQueue` 当前位置之后（每个复习词随机选插入位置）
5. 可多次点击，每次补一批直到无可补的词

**UI 状态**：
- 按钮常亮，点击后短暂 disabled 3 秒防止误连击
- 无可复习词时灰色 disabled + 文字变为"已加载全部"
- Toast 提示载入了多少个复习词

### 变更 C：返回上一个 + 撤销标记（Undo）

#### 学习模式

**按钮布局**（单词卡片下方）：
```
[← 返回]   [当前进度]   [复习 →]
```
现有 prev 箭头（`btn-prev-word`）改名/改语义为"返回上一个"，并附加撤销逻辑。

**撤销逻辑** — 维护 `learnUndoStack`（数组，最多 20 条）：
```
每条记录: { wordId, previousStatus, previousNextReview, previousReviewInterval, category }
```
- `category` = 'learningKnown' | 'learningUnknown'（标记时的分类）

**操作流程**：
1. 用户看到单词 A，点「认识」
2. `markLearnWord('known')` 执行前，先 push undo 记录入栈
3. 单词 A 标记完成，跳到下一个单词 B
4. 用户点「← 返回」
5. 系统检测栈顶是否恰为当前单词 A？是 → 执行 undo：
   - 恢复 `words[A.id]` 原状态（`previousStatus`、`previousNextReview`、`previousReviewInterval`）
   - `dailyStats[category]--`
   - 从 `dailyStats[category + 'Ids']` 数组移除 A.id
   - A 放回队列原位置
   - 出栈
6. 如果栈顶不是当前词（用户仅浏览未标记），则仅返回不撤销

**边界**：
- 从队列删掉后再 undo：放回 `currentWordIndex` 位置（原位置）
- 从队列末尾推过来的再 undo：从末尾移除放回头部

#### 闪卡模式

**按钮布局**（三个按钮上方）：
```
[← 返回上一词]
```

**撤销逻辑** — 维护 `fcUndoStack`（数组，最多 20 条）：
```
每条记录: { wordId, previousStatus, previousNextReview, previousReviewInterval, category, fcIndex }
```
- `category` = 'flashcardKnown' | 'flashcardFuzzy' | 'flashcardUnknown'

**操作流程**：
1. 用户翻卡后点「掌握」「模糊」「不认识」
2. 标记执行前 push undo 记录（含 `fcIndex` 原位置）
3. 用户点「← 返回上一词」
4. 回到上一个词，执行 undo：
   - 恢复 `words[wordId]` 原状态
   - `dailyStats[category]--`，从 ID 数组移除
   - `fcWords.splice(fcIndex, 0, word)` 放回原位置
   - `fcIndex = fcIndex` 指向放回的词
   - 出栈

#### UndoStack 通用规则

- 每次标记操作 push 一条
- 栈上限 20 条，超限 shift 最早
- 仅当"返回上一词"且该词在栈顶时触发 undo
- 如果用户返回后又前进再标记，覆盖或清空对应栈条目

### 变更 D：任务完成后仍可浏览

**现状**：
- 学习模式任务量达到后，面板直接显示"今日学习完成"，卡片不可见，队列锁定
- 学完所有词时 `completeLearningTask()` 自动跳转闪卡

**改为**：
- 任务量达到后，卡片仍正常显示，仍可 ← → 浏览单词
- 「认识/不认识」按钮灰色 disabled，文字变为"今日已完成 🎀"
- 不自动跳转闪卡（移除 `completeLearningTask()` 中的 `switchPanel('flashcard')`）
- 底部提示改为"今日任务完成！可浏览或手动进入闪卡巩固~"
- 闪卡同理：`fcWords` 空后仍显示最后一个词，标记按钮禁用

---

## 四、涉及文件与改动摘要

| 文件 | 改动 |
|------|------|
| `js/progress.js` | `loadProgress()` 日切逻辑保留 ID 数组；新增 `undoDailyStat(category, wordId)` |
| `js/app.js` | `markLearnWord()` 记录 undo 栈；新增复习按钮 + `addReviewWords()`；`handleReset()`；任务完成后禁用标记不禁用浏览；移除自动跳转；← 返回触发 undo |
| `js/flashcard.js` | 三个标记按钮记录 undo 栈；新增返回按钮 + undo；队列空后仍可浏览禁用标记 |
| `index.html` | 学习面板新增复习按钮、调整按钮布局；闪卡面板新增返回按钮 |

---

## 五、边界情况

| 场景 | 处理 |
|------|------|
| 复习按钮无词可补 | 按钮灰色 disabled，文字"已加载全部" |
| 复习按钮连击 | 3 秒冷却 |
| undo 栈为空时点返回 | 仅返回不撤销 |
| 返回时当前词不在栈顶 | 仅返回不撤销 |
| 连续标记多词后连续返回 | 每次返回撤销一条栈记录 |
| 旧数据无 ID 数组迁移 | `loadProgress()` 已有 ID 数组补全逻辑，保持不变 |
| 重置后立即使用 | `handleReset()` 调用 `resetAllProgress()` → confirm → reload |
| 任务量设为"不限" | `dailyLimit === 9999`，永不触发完成状态，所有按钮始终可用 |
