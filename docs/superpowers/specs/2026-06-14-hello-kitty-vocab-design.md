# Hello Kitty 单词记忆器 — 设计文档

> 日期：2026-06-14 | 状态：已确认

---

## 一、项目概述

将 `单词.pdf`（10 单元英语词汇，约 1500+ 词）制作成移动端单词记忆器 PWA。Hello Kitty 主题视觉风格，使用 PPT 素材库渲染，支持手动标记记忆进度，数据本地存储 + 导出备份。

---

## 二、需求决策

| # | 决策项 | 选择 |
|---|--------|------|
| 1 | 记忆模式 | D — 混合模式（学习浏览 + 闪卡 + 测验） |
| 2 | 掌握判定 | A — 手动标记（不认识 / 模糊 / 已掌握） |
| 3 | 单元组织 | C — 默认按单元，可切换为全部混合 |
| 4 | 数据存储 | C — localStorage 本地存储 + 导出/导入 JSON |
| 5 | 部署方式 | B — PWA 离线应用，部署到 GitHub Pages |
| 6 | 单词信息 | B — 英文 + 词性 + 中文释义 + 英文例句 + 例句翻译 |
| 7 | 视觉风格 | Hello Kitty 主题，使用用户提供的 PPT 37张素材 + image3 作为 Logo |

---

## 三、技术方案

### 技术栈

- **纯原生三件套**：HTML + CSS + JS，零依赖、零构建、零 npm
- **PWA**：Service Worker 离线缓存 + manifest.json（添加到手机主屏幕）
- **部署**：GitHub Pages，获得公网 URL

### 文件结构

```
单词记忆器/
├── index.html              # 主入口，所有页面在此通过显示/隐藏切换
├── manifest.json           # PWA 配置（图标、名称、主题色、启动画面）
├── sw.js                   # Service Worker（离线缓存策略）
├── css/
│   └── style.css           # Hello Kitty 主题样式（所有页面共用）
├── js/
│   ├── app.js              # 应用入口，页面路由切换、初始化
│   ├── words.js            # 全部单词数据（JSON 数组）
│   ├── progress.js         # 记忆进度读写（localStorage CRUD）
│   ├── flashcard.js        # 闪卡模式逻辑（翻转、标记）
│   └── export.js           # 导入/导出功能
├── assets/
│   └── kitty/              # PPT 提取的 37 张 Hello Kitty PNG 素材
├── img/
│   └── icons/              # PWA 各尺寸图标（从 image3 生成）
└── docs/
    └── superpowers/
        └── specs/          # 设计文档
```

---

## 四、页面结构（单 HTML 四面板）

底部导航栏切换四个面板，通过 CSS `display: none/block` 控制显隐。

### 📖 学习模式（默认首页）

- **顶部**：Logo（image3）+ 标题 "Hello 单词" + 当前单元标签
- **进度条**：掌握/模糊/未学比例条
- **单词卡片**：
  - 英文单词（大字）+ 词性 + 中文释义 + 例句
  - 背景水印点缀（PPT 猫咪素材）
  - 左右箭头切换单词
- **标记按钮**：不熟（白底粉框）| 模糊（粉底）| 掌握（渐变红）
- **标记后**自动滑入下一个单词

### 🃏 闪卡模式

- 默认显示英文面：「paradox」+ 词性 + "点击翻转"
- **点击卡片 3D 翻转** → 显示中文释义 + 例句
- 翻转后底部两个按钮：← 不认识 | 认识 →
- 只从「未掌握」词中抽取出题

### 📊 进度页

- 总词数 + 掌握/模糊/未学统计（数字 + 进度条）
- 当前单元 / 掌握率 / 连续学习天数 三个指标卡片
- **导出按钮**：下载 `meowvocab-progress.json`
- **导入按钮**：选择 JSON 文件恢复进度
- **重置按钮**：清空所有进度（二次确认弹窗）

### ⚙️ 设置页

- 切换单元（1-10）| 全部混合
- 字体大小：小 / 中 / 大
- 默认记忆模式：学习 / 闪卡 / 测验
- **关于信息** → 点击弹出模态框，展示用户自定义文字

---

## 五、数据模型

### 单词结构（words.js）

```javascript
{
  id: 1,                          // 唯一编号
  en: "paradox",                  // 英文单词
  pos: "n.",                      // 词性 (n./v./adj./adv.)
  zh: "悖论；自相矛盾的事物",       // 中文释义
  example: "The paradox is that standing is more tiring than walking.",
  exampleZh: "矛盾之处在于站着比走路更累。",
  unit: 3,                        // 所属单元 (1-10)
}
```

### 进度结构（localStorage key: `meowvocab_progress`）

```javascript
{
  "words": {
    "1": "mastered",     // id → 状态: mastered | fuzzy | unknown
    "2": "fuzzy",
    "3": "unknown"
  },
  "currentUnit": 3,
  "mode": "unit",        // unit | mixed
  "lastOpened": "2026-06-14",
  "streakDays": 28,
  "settings": {
    "fontSize": "medium",
    "defaultMode": "learning"
  }
}
```

### 存储策略

- 所有数据存于浏览器 localStorage
- 导出 = 下载 JSON 文件
- 导入 = 读取 JSON → 验证 → 写入 localStorage
- 多人使用同一 URL 互不干扰（各自浏览器独立存储）

---

## 六、交互与动画规范

| 交互 | 效果 | 时长 |
|------|------|------|
| 按钮按下 | `scale(0.95)` + 颜色加深 | 100ms |
| 按钮弹回 | spring 回弹 | 200ms |
| 标记"掌握" | 缩放 + 星星粒子 | 300ms |
| 标记"不熟" | 微微抖动 | 150ms |
| 闪卡翻转 | 3D rotateY(180deg) | 400ms |
| 页面切换 | opacity 淡入淡出 | 200ms |
| 单词切换 | 左滑动画 | 250ms |
| 进度条更新 | 平滑增长 | 300ms |
| Toast 弹出 | 底部滑入 + 3秒自动消失 | 300ms/3000ms |
| 模态框 | 缩放弹出 + 背景遮罩 | 200ms |

### 无障碍

- 所有按钮最小 44×44px 触摸区域
- 尊重 `prefers-reduced-motion`（用户开启减弱动效则跳过动画）
- 颜色对比度 ≥ 4.5:1（粉底白字已满足）

---

## 七、边界情况处理

### 首次使用
- 无进度数据 → 自动初始化第 1 单元，所有词标记"未学"
- 显示引导提示文字

### 数据丢失（清缓存/换浏览器）
- 进度归零 → 提示"💡 建议定期导出备份"
- 如有备份文件 → 通过导入恢复

### 导入异常
| 情况 | 处理 |
|------|------|
| 非 JSON 文件 | Toast：「❌ 文件格式无效」 |
| JSON 内容不匹配 | Toast：「❌ 数据格式不兼容」 |
| 部分数据缺失 | 可恢复的恢复，提示缺失条目数 |

### 全部掌握
- 进度页：「🎉 太棒了！全部单词已掌握」
- 闪卡模式：「✨ 没有需要复习的单词了」
- 可手动重置重新来过

### 离线行为
- Service Worker 缓存所有静态资源
- 完全离线可用（数据在 localStorage）
- 仅分享 URL 需要网络

### 屏幕适配
- 最小支持：320px 宽
- 最佳：375–414px
- 平板：最大宽度 480px，居中显示

---

## 八、PWA 配置

```json
// manifest.json
{
  "name": "Hello 单词 - Kitty 记忆伴侣",
  "short_name": "Hello 单词",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#FFF9FB",
  "theme_color": "#E84060",
  "icons": [
    { "src": "img/icons/icon-192.png", "sizes": "192x192" },
    { "src": "img/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

### Service Worker 策略
- 首次访问缓存所有资源（install）
- 后续请求优先从缓存返回（cache-first）
- HTML 页面使用 network-first 策略（保证更新）

---

## 九、配色与字体

### 配色

| 角色 | 色值 | 用途 |
|------|------|------|
| 蝴蝶结红 | `#FF2D55` | 主色调、导航激活态 |
| 深粉 | `#E84060` | 按钮渐变、强调文字 |
| 柔粉背景 | `#FFF9FB` | 页面底色 |
| 白色 | `#FFFFFF` | 卡片底色 |
| 深红文字 | `#C4203B` | 主文字 |
| 浅粉边框 | `#F8D0D8` | 卡片/按钮边框 |
| 粉色底 | `#FDE4E8` | 进度条底色、分隔线 |

### 字体

- 标题：Varela Round
- 正文：Nunito Sans
- 中文字体回退：PingFang SC, Microsoft YaHei
- 等宽（单词拼写）：Georgia, serif

### 素材

- Logo：image3（PPT 素材）
- 装饰：PPT 中提取的 37 张 Hello Kitty PNG 图片
- 图标：优先使用 PPT 素材中的小图标，不足时用 CSS 绘制

---

## 十、待完成

- [ ] `words.js` 中为 1500+ 单词逐一补充中文释义和例句（当前 PDF 仅有英文 + 词性）
- [ ] 关于信息弹窗的文字内容（用户自定义）

---

*下一步：进入 writing-plans 技能，制定详细实现计划。*
