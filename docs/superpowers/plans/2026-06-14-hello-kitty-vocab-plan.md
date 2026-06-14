# Hello Kitty 单词记忆器 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 `单词.pdf` 构建一个移动端 Hello Kitty 主题 PWA 单词记忆器，支持学习浏览、闪卡记忆、手动标记进度、localStorage 存储 + JSON 导出导入。

**Architecture:** 单 HTML 四面板 SPA，纯原生 HTML/CSS/JS，零依赖。数据层分离为 words.js（单词库）和 progress.js（进度管理），通过 localStorage 持久化。PWA 通过 sw.js 实现离线缓存，manifest.json 实现添加到主屏幕。

**Tech Stack:** HTML5 + CSS3 + Vanilla JS (ES6)，无框架、无构建工具，GitHub Pages 部署。

---

### Task 1: 项目脚手架与素材准备

**Files:**
- Create: `index.html`（骨架）
- Create: `css/style.css`（空文件）
- Create: `js/app.js`（空文件）
- Create: `js/words.js`（空文件）
- Create: `js/progress.js`（空文件）
- Create: `js/flashcard.js`（空文件）
- Create: `js/export.js`（空文件）
- Create: `manifest.json`（空文件）
- Create: `sw.js`（空文件）
- Create: `assets/kitty/`（从 ppt_assets 复制）
- Create: `img/icons/`（PWA 图标占位）

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p css js assets/kitty img/icons
```

- [ ] **Step 2: 复制 PPT 素材到 assets/kitty/**

```bash
cp ppt_assets/*.png assets/kitty/
```

- [ ] **Step 3: 创建空的目标文件**

```bash
touch css/style.css js/app.js js/words.js js/progress.js js/flashcard.js js/export.js manifest.json sw.js index.html
```

- [ ] **Step 4: 验证文件结构**

```bash
find . -type f | sort
```

Expected: 所有目录和文件就位。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold project structure and copy assets"
```

---

### Task 2: 单词数据模块（words.js）

**Files:**
- Create: `js/words.js`
- Reference: `单词.pdf`（已提取文本）

- [ ] **Step 1: 编写单词数据生成脚本**

用 Python 脚本从 PDF 文本解析单词、词性，并批量补充中文释义和例句：

```python
# generate_words.py — 生成 js/words.js
import json, re

# PDF 已提取的文本（pdftotext）
pdf_text = open("单词.txt", "r", encoding="utf-8").read()

# 解析模式：word n./v./adj.
# 例如: "balance n. ; v.  blush v./n."
pattern = re.compile(r'([a-zA-Z]+(?:\([a-z]+\))?)\s+((?:n|v|adj|adv|prep|conj|pron|num|art|int)\.(?:\s*;?\s*(?:n|v|adj|adv|prep|conj|pron|num|art|int)\.)*)')

words = []
unit = 1
current_id = 0

lines = pdf_text.split('\n')
for line in lines:
    if 'Lesson' in line and 'PDF Unit' in line:
        unit_match = re.search(r'PDF Unit\s*(\d+)', line)
        if unit_match:
            unit = int(unit_match.group(1))
        else:
            # Try matching "Lesson X"
            lesson_match = re.search(r'Lesson\s*(\d+)', line)
            if lesson_match:
                unit = int(lesson_match.group(1))
    
    matches = pattern.findall(line)
    for word, pos in matches:
        current_id += 1
        pos_clean = pos.strip().rstrip(';').strip()
        words.append({
            "id": current_id,
            "en": word.strip(),
            "pos": pos_clean,
            "zh": "",           # 待填充
            "example": "",      # 待填充
            "exampleZh": "",    # 待填充
            "unit": unit
        })

# 写入 JSON 中间文件
with open("words_raw.json", "w", encoding="utf-8") as f:
    json.dump(words, f, ensure_ascii=False, indent=2)

print(f"Parsed {len(words)} words across units 1-10")
```

Run: `python generate_words.py`
Expected: `Parsed ~1500 words across units 1-10` 并生成 `words_raw.json`

- [ ] **Step 2: 为单词补充中文释义和例句（分批 AI 生成）**

```python
# fill_meanings.py — 分批调用 AI 补全释义
import json

with open("words_raw.json", "r", encoding="utf-8") as f:
    words = json.load(f)

# 按每 50 个一批，生成 prompt 让 AI 补全 zh/example/exampleZh
# 实际执行时通过 Agent 工具分批处理

BATCH_SIZE = 50
batches = [words[i:i+BATCH_SIZE] for i in range(0, len(words), BATCH_SIZE)]

for i, batch in enumerate(batches):
    batch_json = json.dumps(batch, ensure_ascii=False)
    print(f"Batch {i+1}/{len(batches)}: {len(batch)} words")
    # 每批通过 Agent 调用 AI 补全：
    # prompt: "为以下英语单词补充中文释义(zh)、英文例句(example)、例句中文翻译(exampleZh)。
    #          保持原有 id/en/pos/unit 不变，只填充空字段。返回完整 JSON。\n{batch_json}"
```

Run: 通过 Agent 工具分 30 批（每批 50 词）补全 ~1500 词数据

- [ ] **Step 3: 将补全后的数据写入 js/words.js**

```javascript
// js/words.js
const WORDS = [
  // 以下数据由 generate_words.py + AI 补全生成
  {"id":1,"en":"action","pos":"n.","zh":"行动；动作","example":"She took immediate action to solve the problem.","exampleZh":"她立即采取行动解决问题。","unit":1},
  {"id":2,"en":"activate","pos":"v.","zh":"激活；启动","example":"Press the button to activate the system.","exampleZh":"按下按钮以激活系统。","unit":1},
  // ... ~1500 entries
];
```

Run: `python write_words_js.py` — 将补全后的 JSON 写入 `js/words.js`

- [ ] **Step 4: 验证数据完整性**

```bash
# 在浏览器 console 中验证
node -e "
const WORDS = require('./js/words.js');
console.log('Total words:', WORDS.length);
console.log('Units:', [...new Set(WORDS.map(w=>w.unit))]);
console.log('Sample:', JSON.stringify(WORDS[0], null, 2));
console.log('Missing zh:', WORDS.filter(w=>!w.zh).length);
console.log('Missing example:', WORDS.filter(w=>!w.example).length);
"
```

Expected: Total words ~1500+, Units [1-10], Missing zh/examples: 0

- [ ] **Step 5: Commit**

```bash
git add js/words.js generate_words.py fill_meanings.py words_raw.json
git commit -m "feat: add complete word data with Chinese meanings and examples"
```

---

### Task 3: 进度管理模块（progress.js）

**Files:**
- Create: `js/progress.js`

- [ ] **Step 1: 编写核心进度管理函数**

```javascript
// js/progress.js
const STORAGE_KEY = 'meowvocab_progress';

// 默认进度结构
function createDefaultProgress() {
  const wordsState = {};
  WORDS.forEach(w => {
    wordsState[w.id] = 'unknown'; // unknown | fuzzy | mastered
  });
  return {
    words: wordsState,
    currentUnit: 1,
    mode: 'unit',            // unit | mixed
    lastOpened: new Date().toISOString().split('T')[0],
    streakDays: 0,
    settings: {
      fontSize: 'medium',    // small | medium | large
      defaultMode: 'learning' // learning | flashcard
    }
  };
}

// 读取进度（不存在则初始化）
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const data = JSON.parse(raw);
    // 补齐新增单词的默认状态
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

// 保存进度
function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save progress:', e);
    return false;
  }
}

// 更新单个单词状态
function updateWordStatus(wordId, status) {
  const progress = loadProgress();
  if (status === 'mastered' || status === 'fuzzy' || status === 'unknown') {
    progress.words[wordId] = status;
  }
  // 更新连续学习天数
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

// 获取当前单元单词列表
function getCurrentWords() {
  const progress = loadProgress();
  if (progress.mode === 'mixed') {
    return [...WORDS];
  }
  return WORDS.filter(w => w.unit === progress.currentUnit);
}

// 获取单元统计
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

// 获取全局统计
function getGlobalStats() {
  const progress = loadProgress();
  const stats = { total: WORDS.length, mastered: 0, fuzzy: 0, unknown: 0 };
  WORDS.forEach(w => {
    const status = progress.words[w.id] || 'unknown';
    stats[status]++;
  });
  return stats;
}

// 切换单元
function setUnit(unit) {
  const progress = loadProgress();
  progress.currentUnit = unit;
  saveProgress(progress);
}

// 切换模式
function setMode(mode) {
  const progress = loadProgress();
  if (mode === 'unit' || mode === 'mixed') {
    progress.mode = mode;
  }
  saveProgress(progress);
}

// 更新设置
function updateSetting(key, value) {
  const progress = loadProgress();
  if (key in progress.settings) {
    progress.settings[key] = value;
  }
  saveProgress(progress);
}

// 重置所有进度
function resetAllProgress() {
  if (confirm('确定要重置所有学习进度吗？此操作不可撤销。')) {
    localStorage.removeItem(STORAGE_KEY);
    return createDefaultProgress();
  }
  return null;
}
```

- [ ] **Step 2: 编写测试页面验证**

创建 `test_progress.html`，在浏览器 console 中手动测试：

```html
<!DOCTYPE html>
<html><body>
<script src="js/words.js"></script>
<script src="js/progress.js"></script>
<script>
  // 测试1: 首次加载
  const p = loadProgress();
  console.assert(p.currentUnit === 1, 'Default unit should be 1');
  console.assert(Object.keys(p.words).length === WORDS.length, 'All words initialized');
  
  // 测试2: 标记并保存
  updateWordStatus(1, 'mastered');
  const p2 = loadProgress();
  console.assert(p2.words[1] === 'mastered', 'Word 1 should be mastered');
  
  // 测试3: 统计
  const stats = getUnitStats(1);
  console.log('Unit 1 stats:', stats);
  
  // 测试4: 切换单元
  setUnit(3);
  console.assert(loadProgress().currentUnit === 3, 'Unit should be 3');
  
  // 测试5: 模式切换
  setMode('mixed');
  console.assert(loadProgress().mode === 'mixed', 'Mode should be mixed');
  
  console.log('✅ All progress tests passed');
</script>
</body></html>
```

在浏览器打开 `test_progress.html` → F12 Console → 确认输出 `✅ All progress tests passed`

- [ ] **Step 3: Commit**

```bash
git add js/progress.js test_progress.html
git commit -m "feat: add progress management with localStorage persistence"
```

---

### Task 4: 导入导出模块（export.js）

**Files:**
- Create: `js/export.js`

- [ ] **Step 1: 编写导出函数**

```javascript
// js/export.js

// 导出进度为 JSON 文件下载
function exportProgress() {
  const progress = loadProgress();
  const dataStr = JSON.stringify(progress, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meowvocab-progress-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ 已导出进度文件');
}

// 导入进度（从文件选择器）
function importProgress(fileInputEl) {
  const file = fileInputEl.files[0];
  if (!file) {
    showToast('⚠️ 请先选择文件');
    return;
  }
  if (!file.name.endsWith('.json')) {
    showToast('❌ 文件格式无效，请选择 .json 文件');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // 验证数据结构
      if (!data.words || typeof data.words !== 'object') {
        throw new Error('Invalid structure');
      }
      // 验证至少有一些词
      const wordCount = Object.keys(data.words).length;
      if (wordCount === 0) {
        throw new Error('Empty word data');
      }
      // 写入 localStorage
      const success = saveProgress(data);
      if (success) {
        showToast(`📥 已恢复 ${wordCount} 个单词的进度`);
        // 延迟刷新页面以显示新进度
        setTimeout(() => location.reload(), 1500);
      } else {
        showToast('❌ 保存失败，请检查存储空间');
      }
    } catch (err) {
      console.error('Import error:', err);
      showToast('❌ 数据格式不兼容，无法导入');
    }
  };
  reader.readAsText(file);
}

// 简易 Toast 通知
function showToast(message) {
  // 移除已有 toast
  const existing = document.querySelector('.meow-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'meow-toast';
  toast.textContent = message;
  // 样式由 style.css 定义，此处设置内联保底
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #C4203B; color: #FFF; padding: 12px 24px;
    border-radius: 16px; font-size: 14px; font-weight: 600;
    z-index: 9999; animation: toastIn 0.3s ease-out;
    box-shadow: 0 4px 16px rgba(196,32,59,0.3);
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 触发文件选择（无需 UI 按钮时使用）
function triggerImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => importProgress(input);
  input.click();
}
```

- [ ] **Step 2: 验证导出导入流程**

创建 `test_export.html`：

```html
<!DOCTYPE html>
<html><body>
<button onclick="exportProgress()">导出</button>
<button onclick="triggerImport()">导入</button>
<script src="js/words.js"></script>
<script src="js/progress.js"></script>
<script src="js/export.js"></script>
</body></html>
```

测试步骤：
1. 打开页面，点击标记一些单词为 mastered
2. 点击"导出"→ 确认下载了 .json 文件
3. 清除 localStorage：`localStorage.clear()`
4. 点击"导入"→ 选择刚才下载的文件
5. 确认 Toast 显示"已恢复"，进度恢复

- [ ] **Step 3: Commit**

```bash
git add js/export.js test_export.html
git commit -m "feat: add import/export functionality with toast notifications"
```

---

### Task 5: Hello Kitty 主题 CSS（style.css）

**Files:**
- Create: `css/style.css`
- Reference: 设计文档第九节配色表、第六节动画规范

- [ ] **Step 1: 编写 CSS 变量和基础样式**

```css
/* css/style.css — Hello Kitty Word Memorizer */

/* === CSS Variables === */
:root {
  --red-bow: #FF2D55;
  --deep-pink: #E84060;
  --bg-pink: #FFF9FB;
  --white: #FFFFFF;
  --text-deep: #C4203B;
  --border-pink: #F8D0D8;
  --bg-light-pink: #FDE4E8;
  --text-medium: #D65B6E;
  --text-light: #8B1A2B;
  
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
  
  --font-heading: 'Varela Round', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-body: 'Nunito Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-word: Georgia, 'Times New Roman', serif;
  
  --shadow-card: 0 6px 20px rgba(200,60,80,0.08);
  --shadow-btn: 0 4px 14px rgba(232,64,96,0.3);
  --shadow-progress: 0 2px 8px rgba(230,60,80,0.04);
  
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease-out;
  --transition-flip: 400ms ease;
}

/* === Reset & Base === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-body);
  background: var(--bg-pink);
  color: var(--text-deep);
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

/* === Typography === */
h1, h2, h3 {
  font-family: var(--font-heading);
}

.word-en {
  font-family: var(--font-word);
  font-size: 28px;
  font-weight: 700;
}

/* === App Shell === */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-header {
  display: flex;
  align-items: center;
  padding: 16px 16px 8px;
  gap: 10px;
}

.app-header .logo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-pink);
}

.app-header .title {
  font-weight: 700;
  font-size: 17px;
  color: var(--text-deep);
}

.app-header .subtitle {
  font-size: 10px;
  color: #E8A0B0;
}

.app-content {
  flex: 1;
  padding: 8px 16px 80px; /* 80px for bottom nav */
  overflow-y: auto;
}

/* === Bottom Navigation === */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: space-around;
  padding: 10px 0 env(safe-area-inset-bottom, 10px);
  background: var(--white);
  border-top: 2px solid var(--bg-light-pink);
  z-index: 100;
}

.bottom-nav .nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 12px;
  border: none;
  background: none;
  color: var(--text-medium);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  transition: color var(--transition-fast);
}

.bottom-nav .nav-item.active {
  color: var(--red-bow);
  font-weight: 700;
}

.bottom-nav .nav-item img {
  width: 22px;
  height: 22px;
}

/* === Panel Display === */
.panel {
  display: none;
}
.panel.active {
  display: block;
  animation: fadeIn var(--transition-normal);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* === Progress Bar === */
.progress-bar {
  height: 8px;
  border-radius: 8px;
  background: var(--bg-light-pink);
  overflow: hidden;
  border: 1px solid var(--border-pink);
}

.progress-bar .fill {
  height: 100%;
  border-radius: 8px;
  background: linear-gradient(90deg, #FF8DA1, var(--deep-pink));
  transition: width 0.3s ease;
}

/* === Word Card === */
.word-card {
  background: var(--white);
  border: 3px solid var(--border-pink);
  border-radius: var(--radius-lg);
  padding: 28px 20px 20px;
  text-align: center;
  box-shadow: var(--shadow-card);
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}

.word-card .watermark {
  position: absolute;
  top: 8px;
  right: 12px;
  opacity: 0.1;
  pointer-events: none;
}

.word-card .word-pos {
  font-size: 13px;
  color: var(--deep-pink);
  font-weight: 600;
  margin-bottom: 6px;
}

.word-card .word-zh {
  font-size: 16px;
  color: var(--text-light);
  font-weight: 500;
  margin-bottom: 10px;
}

.word-card .word-example {
  padding: 10px 14px;
  background: #FFF5F6;
  border-radius: 14px;
  font-size: 12px;
  color: var(--text-medium);
  font-style: italic;
  border: 1px dashed var(--border-pink);
}

/* === Buttons === */
.btn {
  padding: 14px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;
}

.btn:active {
  transform: scale(0.95);
}

.btn-outline {
  border: 2px solid var(--border-pink);
  background: var(--white);
  color: var(--deep-pink);
}

.btn-outline:active {
  background: var(--bg-light-pink);
}

.btn-primary {
  background: linear-gradient(135deg, #FF5E7A, var(--deep-pink));
  color: var(--white);
  box-shadow: var(--shadow-btn);
}

.btn-primary:active {
  box-shadow: 0 2px 6px rgba(232,64,96,0.2);
}

.btn-ghost {
  background: var(--white);
  color: var(--text-medium);
  border: 2px solid var(--border-pink);
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-group .btn {
  flex: 1;
}

/* === Flashcard Flip === */
.flashcard-scene {
  perspective: 800px;
  width: 100%;
  min-height: 200px;
  margin-bottom: 16px;
}

.flashcard {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  transform-style: preserve-3d;
  transition: transform var(--transition-flip);
  cursor: pointer;
}

.flashcard.flipped {
  transform: rotateY(180deg);
}

.flashcard-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: var(--radius-lg);
  border: 3px solid var(--border-pink);
  background: var(--white);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.flashcard-back {
  transform: rotateY(180deg);
}

/* === Card & Stats === */
.stat-card {
  background: var(--white);
  border: 1px solid var(--border-pink);
  border-radius: var(--radius-sm);
  padding: 10px;
  text-align: center;
}

.stat-card .stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--deep-pink);
}

.stat-card .stat-label {
  font-size: 9px;
  color: var(--text-medium);
}

/* === Modal === */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn var(--transition-normal);
}

.modal {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: 24px 20px;
  max-width: 90vw;
  width: 340px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  animation: modalIn var(--transition-normal);
  border: 2px solid var(--border-pink);
  text-align: center;
}

.modal h3 {
  color: var(--text-deep);
  margin-bottom: 12px;
  font-family: var(--font-heading);
}

.modal p {
  color: var(--text-light);
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 16px;
}

.modal .btn {
  width: 100%;
}

@keyframes modalIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* === Toast (overrides inline style in export.js) === */
.meow-toast {
  font-family: var(--font-body);
}

@keyframes toastIn {
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

/* === Unit Selector === */
.unit-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.unit-tag {
  padding: 6px 14px;
  border-radius: 20px;
  border: 2px solid var(--border-pink);
  background: var(--white);
  color: var(--text-medium);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.unit-tag.active {
  background: var(--deep-pink);
  color: var(--white);
  border-color: var(--deep-pink);
}

/* === Font Size Variants === */
.font-small { font-size: 14px; }
.font-small .word-en { font-size: 22px; }
.font-medium { font-size: 16px; }
.font-medium .word-en { font-size: 28px; }
.font-large { font-size: 18px; }
.font-large .word-en { font-size: 34px; }

/* === Responsive === */
@media (min-width: 480px) {
  .app-container {
    border-left: 1px solid var(--border-pink);
    border-right: 1px solid var(--border-pink);
  }
}

/* === Reduced Motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add Hello Kitty theme CSS with animations and responsive layout"
```

---

### Task 6: HTML 主页面（index.html）

**Files:**
- Create: `index.html`

- [ ] **Step 1: 编写 HTML 骨架和四个面板**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#E84060">
  <meta name="description" content="Hello 单词 - Kitty 主题英语单词记忆器">
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="img/icons/icon-192.png">
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&family=Varela+Round&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <title>Hello 单词</title>
</head>
<body>
<div class="app-container">

  <!-- Header -->
  <header class="app-header">
    <img class="logo" src="assets/kitty/image3.png" alt="Hello Kitty Logo">
    <div>
      <div class="title">Hello 单词</div>
      <div class="subtitle">Kitty 记忆伴侣</div>
    </div>
  </header>

  <!-- Content Area -->
  <main class="app-content">

    <!-- Panel 1: 学习模式 -->
    <section id="panel-learning" class="panel active">
      <!-- Unit info -->
      <div style="background:var(--white);border:1px solid var(--border-pink);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-progress)">
        <span id="learning-unit-label" style="font-size:12px;font-weight:700;color:var(--text-deep)">Unit 1</span>
        <span id="learning-filter" style="font-size:10px;color:var(--text-medium);margin-left:auto"></span>
      </div>

      <!-- Word Card -->
      <div id="word-card" class="word-card">
        <div class="watermark"><img src="assets/kitty/image2.png" style="width:60px;height:60px;"></div>
        <div id="word-en" class="word-en"></div>
        <div id="word-pos" class="word-pos"></div>
        <div id="word-zh" class="word-zh"></div>
        <div id="word-example" class="word-example"></div>
      </div>

      <!-- Nav Arrows -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px">
        <button id="btn-prev-word" class="btn btn-outline" style="min-width:48px">←</button>
        <span id="word-index" style="font-size:12px;color:var(--text-medium);font-weight:600"></span>
        <button id="btn-next-word" class="btn btn-outline" style="min-width:48px">→</button>
      </div>

      <!-- Mark Buttons -->
      <div class="btn-group">
        <button id="btn-unknown" class="btn btn-ghost">🤍 不熟</button>
        <button id="btn-fuzzy" class="btn btn-ghost">💗 模糊</button>
        <button id="btn-mastered" class="btn btn-primary">🎀 掌握</button>
      </div>
    </section>

    <!-- Panel 2: 闪卡模式 -->
    <section id="panel-flashcard" class="panel">
      <div style="display:flex;align-items:center;margin-bottom:12px;gap:8px">
        <span style="font-size:13px;font-weight:700;color:var(--text-deep)">闪卡模式</span>
        <span id="flashcard-count" style="margin-left:auto;font-size:10px;color:var(--text-medium)"></span>
      </div>
      <div id="flashcard-scene" class="flashcard-scene">
        <div id="flashcard" class="flashcard">
          <div class="flashcard-face flashcard-front">
            <div id="fc-word-en" class="word-en" style="margin-bottom:6px"></div>
            <div id="fc-word-pos" style="font-size:13px;color:var(--deep-pink);font-weight:600"></div>
            <div style="font-size:11px;color:var(--text-medium);margin-top:12px">👆 点击翻转</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div id="fc-word-zh" style="font-size:20px;font-weight:700;color:var(--text-deep);margin-bottom:8px"></div>
            <div id="fc-word-example" class="word-example"></div>
          </div>
        </div>
      </div>
      <div class="btn-group">
        <button id="btn-fc-unknown" class="btn btn-outline">← 不认识</button>
        <button id="btn-fc-known" class="btn btn-primary">认识 →</button>
      </div>
    </section>

    <!-- Panel 3: 进度页面 -->
    <section id="panel-progress" class="panel">
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:12px;font-weight:700;color:var(--text-deep)">总计 <span id="stat-total"></span> 词</span>
        </div>
        <div class="progress-bar">
          <div id="progress-fill" class="fill" style="width:0%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-medium);margin-top:4px">
          <span>🎀 掌握: <span id="stat-mastered">0</span></span>
          <span>💗 模糊: <span id="stat-fuzzy">0</span></span>
          <span>🤍 未学: <span id="stat-unknown">0</span></span>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <div class="stat-card" style="flex:1">
          <div class="stat-value" id="stat-unit">-</div>
          <div class="stat-label">当前单元</div>
        </div>
        <div class="stat-card" style="flex:1">
          <div class="stat-value" id="stat-rate">-</div>
          <div class="stat-label">掌握率</div>
        </div>
        <div class="stat-card" style="flex:1">
          <div class="stat-value" id="stat-streak">-</div>
          <div class="stat-label">连续天数</div>
        </div>
      </div>

      <div class="btn-group" style="margin-bottom:8px">
        <button onclick="exportProgress()" class="btn btn-ghost">📥 导出</button>
        <button onclick="triggerImport()" class="btn btn-ghost">📤 导入</button>
      </div>
      <button onclick="handleReset()" class="btn btn-outline" style="width:100%;color:var(--deep-pink)">🔄 重置进度</button>
    </section>

    <!-- Panel 4: 设置页面 -->
    <section id="panel-settings" class="panel">
      <h3 style="color:var(--text-deep);margin-bottom:12px">⚙️ 设置</h3>

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-deep);margin-bottom:6px">学习单元</div>
        <div id="unit-selector" class="unit-selector">
          <!-- 动态生成 1-10 + 全部混合 -->
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-deep);margin-bottom:6px">字体大小</div>
        <div class="btn-group">
          <button class="btn btn-ghost font-size-btn" data-size="small">小</button>
          <button class="btn btn-ghost font-size-btn active" data-size="medium">中</button>
          <button class="btn btn-ghost font-size-btn" data-size="large">大</button>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-deep);margin-bottom:6px">默认模式</div>
        <div class="btn-group">
          <button class="btn btn-ghost mode-btn active" data-mode="learning">📖 学习</button>
          <button class="btn btn-ghost mode-btn" data-mode="flashcard">🃏 闪卡</button>
        </div>
      </div>

      <button id="btn-about" class="btn btn-outline" style="width:100%;color:var(--deep-pink)">ℹ️ 关于信息</button>

      <!-- About Modal (hidden by default) -->
      <div id="about-modal" class="modal-overlay" style="display:none">
        <div class="modal">
          <h3>🎀 关于 Hello 单词</h3>
          <p id="about-text">
            <!-- 用户自定义内容在这里 -->
            Hello 单词是一款 Kitty 主题的英语单词记忆器。<br><br>
            愿你在可爱的猫咪陪伴下，轻松快乐地掌握每一个单词 🐱💕
          </p>
          <button id="btn-close-about" class="btn btn-primary">知道了</button>
        </div>
      </div>
    </section>
  </main>

  <!-- Bottom Navigation -->
  <nav class="bottom-nav">
    <button class="nav-item active" data-panel="learning">
      <img src="assets/kitty/image12.png" alt="学习">
      <span>学习</span>
    </button>
    <button class="nav-item" data-panel="flashcard">
      <img src="assets/kitty/image9.png" alt="闪卡">
      <span>闪卡</span>
    </button>
    <button class="nav-item" data-panel="progress">
      <img src="assets/kitty/image4.png" alt="进度">
      <span>进度</span>
    </button>
    <button class="nav-item" data-panel="settings">
      <img src="assets/kitty/image7.png" alt="设置">
      <span>设置</span>
    </button>
  </nav>
</div>

<script src="js/words.js"></script>
<script src="js/progress.js"></script>
<script src="js/export.js"></script>
<script src="js/flashcard.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: create main HTML shell with four panels and bottom navigation"
```

---

### Task 7: 应用入口与路由（app.js）

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: 编写应用初始化与面板路由**

```javascript
// js/app.js — Hello Kitty Word Memorizer: App Entry & Router

// === State ===
let currentWordIndex = 0;
let currentWords = [];

// === DOM References ===
const panels = {
  learning: document.getElementById('panel-learning'),
  flashcard: document.getElementById('panel-flashcard'),
  progress: document.getElementById('panel-progress'),
  settings: document.getElementById('panel-settings'),
};

const navItems = document.querySelectorAll('.bottom-nav .nav-item');
const wordIndexEl = document.getElementById('word-index');
const bodyEl = document.body;

// === Navigation ===
function switchPanel(panelName) {
  // Hide all panels
  Object.values(panels).forEach(p => p.classList.remove('active'));
  // Show target
  panels[panelName].classList.add('active');
  
  // Update nav
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.panel === panelName);
  });
  
  // Refresh panel content
  if (panelName === 'learning') refreshLearningPanel();
  if (panelName === 'flashcard') refreshFlashcardPanel();
  if (panelName === 'progress') refreshProgressPanel();
  if (panelName === 'settings') refreshSettingsPanel();
}

navItems.forEach(item => {
  item.addEventListener('click', () => switchPanel(item.dataset.panel));
});

// === Panel 1: Learning Mode ===
function refreshLearningPanel() {
  const progress = loadProgress();
  currentWords = getCurrentWords();
  
  if (currentWords.length === 0) {
    document.getElementById('word-en').textContent = '✨';
    document.getElementById('word-pos').textContent = '暂无单词';
    document.getElementById('word-zh').textContent = '';
    document.getElementById('word-example').textContent = '';
    return;
  }
  
  // Clamp index
  if (currentWordIndex >= currentWords.length) currentWordIndex = 0;
  if (currentWordIndex < 0) currentWordIndex = currentWords.length - 1;
  
  renderWordCard(currentWords[currentWordIndex]);
  updateWordIndexDisplay();
  
  // Unit label
  const unitLabel = document.getElementById('learning-unit-label');
  if (progress.mode === 'mixed') {
    unitLabel.textContent = '🔀 全部混合';
  } else {
    unitLabel.textContent = 'Unit ' + progress.currentUnit;
  }
  
  // Highlight current mark button
  const currentWord = currentWords[currentWordIndex];
  const status = progress.words[currentWord.id] || 'unknown';
  document.getElementById('btn-unknown').style.borderColor = status === 'unknown' ? 'var(--deep-pink)' : 'var(--border-pink)';
  document.getElementById('btn-fuzzy').style.borderColor = status === 'fuzzy' ? 'var(--deep-pink)' : 'var(--border-pink)';
  document.getElementById('btn-mastered').style.opacity = status === 'mastered' ? '1' : '0.9';
}

function renderWordCard(word) {
  document.getElementById('word-en').textContent = word.en;
  document.getElementById('word-pos').textContent = word.pos;
  document.getElementById('word-zh').textContent = word.zh;
  document.getElementById('word-example').textContent = word.example + (word.exampleZh ? ' （' + word.exampleZh + '）' : '');
}

function updateWordIndexDisplay() {
  wordIndexEl.textContent = (currentWordIndex + 1) + ' / ' + currentWords.length;
}

// Word navigation
document.getElementById('btn-prev-word').addEventListener('click', () => {
  if (currentWordIndex > 0) {
    currentWordIndex--;
    refreshLearningPanel();
  }
});

document.getElementById('btn-next-word').addEventListener('click', () => {
  if (currentWordIndex < currentWords.length - 1) {
    currentWordIndex++;
    refreshLearningPanel();
  }
});

// Swipe support for word card
let touchStartX = 0;
document.getElementById('word-card').addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
});
document.getElementById('word-card').addEventListener('touchend', (e) => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) { // threshold: 50px
    if (diff > 0 && currentWordIndex < currentWords.length - 1) {
      currentWordIndex++;
    } else if (diff < 0 && currentWordIndex > 0) {
      currentWordIndex--;
    }
    refreshLearningPanel();
  }
});

// Mark buttons
document.getElementById('btn-unknown').addEventListener('click', () => markWord('unknown'));
document.getElementById('btn-fuzzy').addEventListener('click', () => markWord('fuzzy'));
document.getElementById('btn-mastered').addEventListener('click', () => markWord('mastered'));

function markWord(status) {
  if (currentWords.length === 0) return;
  const word = currentWords[currentWordIndex];
  updateWordStatus(word.id, status);
  // Auto advance
  if (currentWordIndex < currentWords.length - 1) {
    currentWordIndex++;
  }
  refreshLearningPanel();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (!panels.learning.classList.contains('active')) return;
  if (e.key === 'ArrowLeft') document.getElementById('btn-prev-word').click();
  if (e.key === 'ArrowRight') document.getElementById('btn-next-word').click();
  if (e.key === '1') markWord('unknown');
  if (e.key === '2') markWord('fuzzy');
  if (e.key === '3') markWord('mastered');
});

// === Panel 3: Progress Page ===
function refreshProgressPanel() {
  const stats = getGlobalStats();
  const progress = loadProgress();
  
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-mastered').textContent = stats.mastered;
  document.getElementById('stat-fuzzy').textContent = stats.fuzzy;
  document.getElementById('stat-unknown').textContent = stats.unknown;
  document.getElementById('stat-unit').textContent = progress.mode === 'mixed' ? '混合' : progress.currentUnit;
  
  const rate = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  document.getElementById('stat-rate').textContent = rate + '%';
  document.getElementById('stat-streak').textContent = progress.streakDays || 0;
  document.getElementById('progress-fill').style.width = rate + '%';
}

// Reset handler
function handleReset() {
  const result = resetAllProgress();
  if (result) {
    showToast('🔄 进度已重置');
    currentWordIndex = 0;
    setTimeout(() => {
      switchPanel('learning');
      refreshProgressPanel();
    }, 500);
  }
}

// === Panel 4: Settings ===
function refreshSettingsPanel() {
  const progress = loadProgress();
  
  // Unit selector
  const unitSelector = document.getElementById('unit-selector');
  unitSelector.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const tag = document.createElement('span');
    tag.className = 'unit-tag' + (progress.currentUnit === i && progress.mode === 'unit' ? ' active' : '');
    tag.textContent = 'Unit ' + i;
    tag.addEventListener('click', () => {
      setUnit(i);
      setMode('unit');
      refreshSettingsPanel();
      switchPanel('learning');
    });
    unitSelector.appendChild(tag);
  }
  const mixedTag = document.createElement('span');
  mixedTag.className = 'unit-tag' + (progress.mode === 'mixed' ? ' active' : '');
  mixedTag.textContent = '🔀 全部混合';
  mixedTag.addEventListener('click', () => {
    setMode('mixed');
    refreshSettingsPanel();
    switchPanel('learning');
  });
  unitSelector.appendChild(mixedTag);

  // Font size buttons
  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === progress.settings.fontSize);
    btn.onclick = () => {
      updateSetting('fontSize', btn.dataset.size);
      bodyEl.className = 'font-' + btn.dataset.size;
      refreshSettingsPanel();
    };
  });

  // Default mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === progress.settings.defaultMode);
    btn.onclick = () => {
      updateSetting('defaultMode', btn.dataset.mode);
      refreshSettingsPanel();
    };
  });
}

// === About Modal ===
document.getElementById('btn-about').addEventListener('click', () => {
  document.getElementById('about-modal').style.display = 'flex';
});
document.getElementById('btn-close-about').addEventListener('click', () => {
  document.getElementById('about-modal').style.display = 'none';
});
document.getElementById('about-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('about-modal').style.display = 'none';
  }
});

// === Init ===
function init() {
  const progress = loadProgress();
  
  // Apply saved settings
  bodyEl.className = 'font-' + progress.settings.fontSize;
  
  // Apply default mode
  const defaultMode = progress.settings.defaultMode || 'learning';
  switchPanel(defaultMode);
  
  // Update streak on open
  updateWordStatus(1, progress.words[1] || 'unknown'); // trigger streak update
  saveProgress(progress);
}

// Start the app
init();
```

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "feat: add app entry point with panel routing and all interaction handlers"
```

---

### Task 8: 闪卡模块（flashcard.js）

**Files:**
- Create: `js/flashcard.js`

- [ ] **Step 1: 编写闪卡逻辑**

```javascript
// js/flashcard.js — Flashcard mode logic

let fcWords = [];
let fcIndex = 0;

function refreshFlashcardPanel() {
  const progress = loadProgress();
  // Only show unmastered words
  fcWords = getCurrentWords().filter(w => {
    const status = progress.words[w.id] || 'unknown';
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
  // Reset flip state
  const card = document.getElementById('flashcard');
  card.classList.remove('flipped');
  
  document.getElementById('fc-word-en').textContent = word.en;
  document.getElementById('fc-word-pos').textContent = word.pos;
  document.getElementById('fc-word-zh').textContent = word.zh;
  document.getElementById('fc-word-example').textContent = word.example + (word.exampleZh ? ' （' + word.exampleZh + '）' : '');
}

function updateFlashcardCount() {
  document.getElementById('flashcard-count').textContent = (fcIndex + 1) + ' / ' + fcWords.length;
}

// Flip on click
document.getElementById('flashcard').addEventListener('click', function() {
  this.classList.toggle('flipped');
});

// Known / Unknown buttons
document.getElementById('btn-fc-known').addEventListener('click', () => {
  if (fcWords.length === 0) return;
  const word = fcWords[fcIndex];
  const progress = loadProgress();
  const currentStatus = progress.words[word.id] || 'unknown';
  
  // Cycle: unknown → fuzzy → mastered
  let newStatus;
  if (currentStatus === 'unknown') newStatus = 'fuzzy';
  else if (currentStatus === 'fuzzy') newStatus = 'mastered';
  else newStatus = 'mastered';
  
  updateWordStatus(word.id, newStatus);
  showToast(newStatus === 'mastered' ? '🎀 已掌握！' : '💗 标记为模糊');
  advanceFlashcard();
});

document.getElementById('btn-fc-unknown').addEventListener('click', () => {
  if (fcWords.length === 0) return;
  const word = fcWords[fcIndex];
  updateWordStatus(word.id, 'unknown');
  showToast('🤍 继续加油');
  advanceFlashcard();
});

function advanceFlashcard() {
  // Remove mastered words from the pool
  const progress = loadProgress();
  fcWords = fcWords.filter(w => {
    const status = progress.words[w.id] || 'unknown';
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
```

- [ ] **Step 2: Commit**

```bash
git add js/flashcard.js
git commit -m "feat: add flashcard mode with 3D flip animation and smart word cycling"
```

---

### Task 9: PWA 配置（manifest.json + sw.js）

**Files:**
- Create: `manifest.json`
- Create: `sw.js`

- [ ] **Step 1: 编写 manifest.json**

```json
{
  "name": "Hello 单词 - Kitty 记忆伴侣",
  "short_name": "Hello 单词",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#FFF9FB",
  "theme_color": "#E84060",
  "description": "Kitty 主题英语单词记忆器",
  "lang": "zh-CN",
  "orientation": "portrait",
  "icons": [
    {
      "src": "img/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "img/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: 生成 PWA 图标**

```bash
# 使用 Python 从 image3 生成 192 和 512 尺寸图标
python3 -c "
from PIL import Image
img = Image.open('assets/kitty/image3.png')
img = img.convert('RGBA')
# 缩放到正方形
size = min(img.size)
left = (img.size[0] - size) // 2
top = (img.size[1] - size) // 2
img = img.crop((left, top, left + size, top + size))
img.resize((192, 192), Image.LANCZOS).save('img/icons/icon-192.png')
img.resize((512, 512), Image.LANCZOS).save('img/icons/icon-512.png')
print('Icons generated')
"
```

- [ ] **Step 3: 编写 Service Worker**

```javascript
// sw.js — Service Worker for offline PWA

const CACHE_NAME = 'meowvocab-v1';

// Resources to cache on install
const PRECACHE_URLS = [
  '.',
  'index.html',
  'css/style.css',
  'js/words.js',
  'js/progress.js',
  'js/export.js',
  'js/flashcard.js',
  'js/app.js',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&family=Varela+Round&display=swap',
];

// Install: pre-cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for HTML
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network-first for HTML (ensure latest app version)
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for all other assets
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
  }
});
```

- [ ] **Step 4: 在 index.html 中注册 Service Worker**

在 `</body>` 前添加：

```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('[SW] Registered:', reg.scope))
    .catch(err => console.log('[SW] Registration failed:', err));
}
</script>
```

- [ ] **Step 5: Commit**

```bash
git add manifest.json sw.js index.html img/icons/
git commit -m "feat: add PWA manifest, service worker, and app icons"
```

---

### Task 10: 最终集成与验证

**Files:**
- Test: 手动验证清单

- [ ] **Step 1: 本地测试**

```bash
# 启动本地服务器
npx serve .
# 在浏览器打开 http://localhost:3000
```

验证清单：
- [ ] 页面加载无 JS 控制台错误
- [ ] 学习模式：显示单词、可切换、可标记
- [ ] 闪卡模式：点击翻转、标记按钮正常
- [ ] 进度页：统计数据正确、导出下载 JSON、导入恢复
- [ ] 设置页：切换单元/模式/字体生效
- [ ] 关于弹窗：点击弹出/关闭
- [ ] 底部导航：四个面板切换流畅
- [ ] 手机测试：375px 屏幕显示正常、触控正常

- [ ] **Step 2: PWA 验证**

在 Chrome DevTools → Application → Manifest → 确认信息正确
在 Chrome DevTools → Application → Service Workers → 确认 SW 已注册

- [ ] **Step 3: Lighthouse 审计**

Chrome DevTools → Lighthouse → 运行移动端审计
目标：PWA 分数 90+、Performance 90+、Accessibility 90+

- [ ] **Step 4: 跨浏览器测试**

```bash
# 在 Chrome、Safari（iOS）、Firefox 中分别打开测试
```

- [ ] **Step 5: 修复问题并最终提交**

```bash
git add -A
git commit -m "chore: final integration, fixes, and verification"
```

---

*计划完毕。实现时请按 Task 1 → 10 顺序执行，每完成一个 Task 验证无误后再继续。*
