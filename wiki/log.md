---
type: log
updated: 2026-10-26
---

# 活動日誌

每條以 `## [YYYY-MM-DD] type|detail` 開頭。可用 `grep "^## \[" wiki/log.md` 解析。

## [2026-08-21] ingest|15-003 會聽話、聽懂話
首個相簿 ingest：樂在正論「會聽話、聽懂話」（15-003，1 集，2020-03-30 英國蘭彼得）。建立開示頁、類別頁 `樂在正論`、概念頁 `師承`/`信`/`妄想執著`，更新 `index.md`。

## [2026-08-20] schema|建立 xwcz LLM wiki 骨架
建立 `AGENTS.md`、`wiki/SCHEMA.md`、`wiki/README.md`、`wiki/index.md`、`wiki/tools/*.py`（Python：`api_client.py`/`fetch_catalog.py`/`download.py`/`gen_manifest.py`）。`sync:catalog` 13 類別、257 相簿、1833 集 → `catalog.json`；`sync:download` 全量 1830 集入库（含 637 無文稿 stubs），`sync:manifest` 245 相簿；修復 Quartz `quartz.config.yaml` 頂層 `plugins`/`layout` 縮排致 build 失敗（`filter` of undefined）。

## [2026-08-21] ingest|bulk 256 批量生成剩餘相簿
批量生成 256 相簿骨架頁（含 6 重名消歧），補齊 12 類別頁，重建 `index.md`。首頁 `會聽話、聽懂話` 保持人工精校版，其餘待 lint 精煉。

## [2026-10-03] ingest|16-058 再談弟子規（38 集深煉）+ sync 補全
查明再談弟子規類別為空之因：API album/list?cid=66 回 0，相簿 305 未掛載。sync 升級：遍歷 news 視頻更新（36 相簿）＋ ID 探測孤兒相簿（25，305 依題名歸 66、餘入未分類）。catalog 318 相簿 / 2519 集；doc 新增 686 集；修 download 以 episode 欄位排序修正第N集。深煉再談弟子規 38 集（入則孝→出則弟→謹→信），新建 視頻更新／未分類 類別頁＋60 相簿頁，index／manifest 已更新。

## [2026-10-26] sync|2026-10-26 原始同步 + 去重 + 再談弟子規更新
`sync:catalog` 318 相簿 / 2519 集 → 322 相簿 / 2559 集（+4 相簿、+40 集）；`sync:download` 增量取回 80 檔，其中 40 檔為更名／移類重複（非新集）：學習海賢老和尚之表法 13-012 全 35 集由深入經藏移至菩薩修德／看懂表法（檔名 0001z–0019z 去 `z`，正文逐集比對一致）、2026年同修答疑交流 18-142 4 檔去 `z`、《十善業道經》13-015-0001 去 `z`，舊檔已刪除，新檔為準；淨增 40 集。去重後磁碟 2555 檔（catalog 2559 集含 4 筆 API 重複集數共用同一檔名，無缺檔）。`sync:manifest` 301 相簿／2555 集。維基同步：13-012 開示頁由 wiki/深入經藏移至 wiki/菩薩修德（類別、主題、原始路徑、逐集連結已更新，類別頁與 index 已對帳）；再談弟子規 16-058 由 38 集更新至 46 集（2026-10-03 至 10-25，39–46 集文字與 m3u8 皆經 HEAD 實測 200，mp3／mp4 404 故不列），類別頁與 index 已更新。其餘新增集數多為無文稿 stubs（淨業導航 21 集等），暫不 ingest，待文稿出現再補。
