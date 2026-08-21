# SCHEMA.md — 頁面範本與範例（xwcz）

This file documents the exact page templates and examples for the xwcz wiki. Reference `AGENTS.md` for the overall schema. All page content is Traditional Chinese. The corpus is 成德法師（熏聞成種 / xwcz.org）的開示.

## 頁面類型速覽

| 類型 | 位置 | frontmatter `type` |
|---|---|---|
| 類別頁 | `wiki/<類別>.md` | `category` |
| 主題頁 | `wiki/<類別>/<主題>.md` | `topic` |
| 開示頁 | `wiki/<類別>/<相簿標題>.md` | `source` |
| 概念頁 | `wiki/概念/<概念>.md` | `concept` |
| 問答頁 | `wiki/問答/<題目>.md` | `answer` |

## 範本

### 類別頁 (category)

```markdown
---
type: category
category: 樂在正論
tags: [正知正見, 心性]
albums: 20
updated: 2026-08-20
---

# 樂在正論

此類別涵蓋成德法師對學佛正知正見的開示：…（一段綜合說明）。

## 開示一覽

- [[會聽話、聽懂話]] — …
- [[忠恕之道]] — 主題頁（子分類）

依 [[index|索引]] 與 [[raw-manifest|原始清單]] 查閱。
```

### 主題頁 (topic)

```markdown
---
type: topic
category: 樂在正論
title: 忠恕之道
tags: [忠恕, 一門深入]
updated: 2026-08-20
---

# 忠恕之道

子分類主題。道之大要：…

## 開示

- [[會聽話、聽懂話]] — …
- …（該子分類下的相簿）

## 相關概念

- [[概念/師承]] [[概念/菩提心]]
```

### 開示頁 (source) — 每個相簿（系列）一頁

```markdown
---
type: source
category: 樂在正論
topic: 忠恕之道          # 子分類或主題，無則留白
code: 15-003             # num 的首兩段，如 16-058
title: 會聽話、聽懂話
date: 2020-03-30
place: 英國蘭彼得
pages: 1
raw: doc/影音/樂在正論/會聽話、聽懂話/
media: [CHT, mp3]
tags: [師承, 聽經]
created: 2026-08-20
updated: 2026-08-20
---

# 會聽話、聽懂話（15-003）

- **檔名**：15-003-0001（系列前綴 `15-003`）
- **類別**：樂在正論 / 忠恕之道
- **集數**：共 1 集
- **日期**：2020-03-30　地點：英國蘭彼得
- **原始路徑**：`doc/影音/樂在正論/會聽話、聽懂話/`

## 概要

一段話說明本開示講什麼。

## 重點

- 要點一〔15-003-0001〕
- 要點二

## 相關概念

- [[概念/師承]] [[概念/菩提心]]

## 相關頁面

- [[忠恕之道]] — 主題頁
- [[當信佛經語深]] — 同類別其他開示

## 原始資料與影音

原始資料夾：[GitHub](https://github.com/<owner>/xwcz/tree/main/doc/影音/樂在正論/會聽話、聽懂話)（逐集 `md`）

| 集數 | 檔名 | 文字 | 影音 |
|---|---|---|---|
| 1 | 15-003-0001 | [md](https://github.com/<owner>/xwcz/blob/main/doc/影音/樂在正論/會聽話、聽懂話/15-003-0001.md) · [正體doc](https://v.xwcz.org/CHT/15/15-003/15-003-0001.doc) | [mp3](https://v.xwcz.org/mp3/15/15-003/15-003-0001.mp3) |

> 每集皆須列入；集數多（上百集）時亦須全列，不得省略。文字與影音連結依該集 download 旗標與 `media` frontmatter 取用，永不臆測。URL 一律經 `wiki/tools/api_client.py` 的 `get_text_url` / `get_audio_mp3_url` / `get_video_mp4_url` / `get_video_hls_url` / `get_poster_url` 產生，不得手拼。
```

### 概念頁 (concept)

```markdown
---
type: concept
title: 念佛
tags: [淨土]
sources: [15-003, 16-058]
updated: 2026-08-20
---

# 念佛

定義：…

## 各開示的講法

- [[會聽話、聽懂話]] — 強調 …
- [[再談弟子規]] — …

## 要點

- …

## 相關概念

- [[概念/因果]] [[概念/師承]]

## 引用出處

- 〔15-003〕〔16-058〕
```

### 問答頁 (answer)

```markdown
---
type: answer
title: 如何對治疑心
tags: [比較, 修持]
updated: 2026-08-20
---

# 標題

**問題**：…

**回答**：…

## 出處

- 〔15-003-0001〕
- [[會聽話、聽懂話]]

## 相關頁面

- …
```

## 命名與連結規則

- 檔名：類別/主題/概念/相簿用中文名（如 `會聽話、聽懂話.md`）；`NUM` 代碼只用於 `doc/` 之下。檔名不含空格。
- 內部連結：`[[頁面名]]`；開示頁連結相簿標題 `[[會聽話、聽懂話]]`；概念頁用 `[[概念/念佛]]`。
- 引用：`〔15-003〕` 引用整個系列，`〔15-003-0001〕` 引用特定一集（系列前綴 = `num` 首兩段）。
- 開示頁需附 `## 原始資料與影音` 區段：原始資料夾的 GitHub 連結（`https://github.com/<owner>/xwcz/tree/main/doc/影音/<路徑>`）、每集 `md` 的 GitHub blob（`https://github.com/<owner>/xwcz/blob/main/doc/影音/<路徑>/<NUM>.md`），以及官方文字/影音連結（經 `get_text_url` 等產生）。中文路徑在 URL 中須以 UTF-8 百分比編碼。
- 文字/影音 URL 格式（host 若為 `https://v.xwcz.org/`，`NUM` 拆成 `major`/`minor`=前兩段，後接 `major-minor`）：
  - 正體文字：`https://v.xwcz.org/CHT/{major}/{major}-{minor}/{NUM}.{ext}`（`ext` ∈ `doc`、`docx`，依 episode `traditional_text_extension`，預設 `doc`）
  - 簡體文字：`https://v.xwcz.org/CHS/...`（少見；僅 `simplified_text_download=1` 時存在）
  - mp3：`https://v.xwcz.org/mp3/{major}/{major}-{minor}/{NUM}.mp3`
  - mp4：`https://v.xwcz.org/mp4/{major}/{major}-{minor}/{NUM}.mp4`
  - m3u8（HLS）：`https://v.xwcz.org/m3u8/{major}/{major}-{minor}/{NUM}/{NUM}.m3u8`
  - 海報：`https://v.xwcz.org/image/{major}/{major}-{minor}/{NUM}.jpg`
  - 學習資料 zip：`https://v.xwcz.org/lm/{major}/{major}-{minor}/{NUM}.zip`（少見）

## 前導資料 (frontmatter)

可用欄位：

| 欄位 | 說明 | 例 |
|---|---|---|
| `type` | 頁面類型 | `source` |
| `category` | 類別（中文） | `樂在正論` |
| `topic` | 子分類/主題（中文） | `忠恕之道` |
| `code` | 系列前綴（`num` 首兩段），無則留白 | `15-003` |
| `title` | 開示題目 | `會聽話、聽懂話` |
| `date` | 開示日期，`YYYY-MM-DD` | `2020-03-30` |
| `place` | 地點（第一集 metaLine 有則填） | `英國蘭彼得` |
| `pages` | 集數 | `1` |
| `raw` | 原始資料夾路徑 | `doc/影音/樂在正論/會聽話、聽懂話/` |
| `media` | 可取得的連結類型（依每集旗標；常見 `[CHT, mp3]`，`mp4`/`m3u8` 視旗標） | `[CHT, mp3]` |
| `tags` | 標籤 | `[師承, 聽經]` |
| `created` / `updated` | 日期 | `2026-08-20` |
| `sources` | 概念頁引用的系列代碼 | `[15-003, 16-058]` |

## 長度規則

- 單頁約 150 行內；超過則拆分。
- 例外：`## 原始資料與影音` 的逐集表格依集數增長，屬設計使然，不受行數限制（全表不得截斷）。
- 概念頁、問答頁隨內容演化而更新，不需每次重寫。