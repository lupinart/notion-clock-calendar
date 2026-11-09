# Notion 台灣時鐘與藍色待辦

灰色台灣時鐘與仿原版外觀的藍色待辦，**外圍透明**。待辦保留原版式排版及操作，沒有 Customize 標示。兩者均使用系統字型，無套件、無外部字型、無追蹤與資料蒐集。

| 小工具 | Notion 嵌入網址 | 建議區塊高度 |
|---|---|---|
| 台灣時鐘 | https://lupinart.github.io/notion-clock-calendar/ | 125px |
| 藍色待辦 | https://lupinart.github.io/notion-clock-calendar/todo.html?v=2 | 400px起，可拖曳調整 |

在 Notion 輸入 `/embed`，貼入網址即可。建議寬度240px以上；高度可拖曳調整。

## 顯示與行為

- 外圍的 html/body 永遠透明；保留卡片自身底色。無固定黑框、白框或品牌浮水印。
- 時鐘支援父頁淺色與深色協商；卡片採 `#f9f8f7`／`#383836`，文字同步切換。不需要主題參數或更換網址。
- 時鐘固定 Asia/Taipei 時區，24小時制，TAIWAN 標籤；每秒校時，顯示時、分、當地日期及 UTC+8。使用觀看者裝置時間，不連線取得遠端標準時間。
- 使用語意化時間元素，沒有閃爍或動畫。

## 藍色待辦與保存

- 依使用者最新要求重現原版式外觀：Today Tasks 藍色標題列、add task／Add、圓形完成按鈕、淡色刪除圖示、滿高可捲動清單。先前灰色改版已移除。
- 底部小橫條開啟 Settings，支援 Light／Dark；沒有手動指定時自動跟隨嵌入頁面。手動主題選擇保存在瀏覽器。
- Reset all tasks 先顯示 Clear all tasks?，可按 Keep 保留或 Clear 清空；支援 Escape、遮罩關閉與鍵盤焦點管理。觸控上滑也可開設定。
- CSS 與 JavaScript 獨立實作，不載入原站 iframe、不重發佈原站完整程式；只把指定原版作為外觀、操作與尺寸參考，不顯示 Customize。待辦樣式使用 `classic-todo.css`，時鐘保持原樣。
- 資料只保存於目前瀏覽器的 localStorage（`lupin.todo.v1`），不傳送到伺服器、不連接 Notion 任務、不跨裝置同步。清除網站資料或使用無痕模式可能使清單消失；原站清單不會自動移入。
- 同一儲存分區的分頁會同步；保存前發現清單已變更時載入最新內容，保留輸入並提示重試。瀏覽器可能將直接開啟頁面與 Notion 嵌入分成不同儲存分區，兩者未必共用清單。
- 保存失敗時保留原有清單與未送出的輸入、明確提示；既有資料無法解析時暫停編輯，不自動覆寫。網站儲存被停用時會提示，不能假裝已保存。
- 任務文字以 textContent 顯示，HTML 字串不會執行；所有資料操作已用獨立測試瀏覽器的虛擬清單驗證，不碰使用者原本的清單。

## 明暗模式與透明

HTML 提前宣告 `<meta name="color-scheme" content="light dark">`，CSS 根節點也宣告 `color-scheme:light dark`。因此父頁與子頁可協商相同明暗模式，避免瀏覽器為 iframe 補不透明畫布。卡片以 `prefers-color-scheme` 切換色彩，外圍不填底色。

參考：[W3C CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/#color-scheme-effect)。Chromium 可將父頁模式傳遞到跨來源 iframe；Safari 有[已知差異](https://developer.chrome.com/docs/modern-web-guidance/guides/visual-design/dark-mode#known_issues_to_be_aware_of)，未經 Safari 實測，不宣稱所有平台皆驗證。

## 開發與驗證

純靜態檔案，GitHub Pages 使用 main 分支根目錄；HTTP 伺服器直接提供即可。iCloud 原始碼為權威，網站測試一律複製必要檔案到 `/private/tmp/codex-builds/`，所有 QA 截圖與可重建檔案只留 tmp，收尾清理。

- `node test.mjs`：台北跨日與時區轉換。
- `node test-todo-store.mjs`：待辦保存／還原、完成狀態、資料格式驗證、壞資料不覆寫、拒絕寫入會回報錯誤。
- `node test-classic-todo.mjs`：原版式待辦的新增、Enter、完成、重載保存、刪除、Keep／Clear確認、Light／Dark保存、Escape、長文窄欄、分頁同步、保存衝突、拒絕寫入與壞資料不覆寫，以及跨來源 iframe 淺→深→淺外圍透明。
- 設 `COMPARE_ORIGINAL=1` 可在獨立測試瀏覽器載入使用者指定原版，比對相同360×460尺寸的淺深主卡片截圖；Customize 位於主卡片外，不列入比對。首輪比對的主卡片像素平均誤差為淺色0.424/255、深色0.449/255，差異大於16的像素占比分別0.69%、0.64%；未宣稱所有像素及動畫完全相同。
- `node test-embed.mjs`：以 Playwright Chromium 建立不同來源 iframe，於同一載入頁面切換淺→深→淺；檢查實際像素確認外圍透出父頁色，卡片／文字依模式改變且對比至少4.5:1；驗證240px窄欄、台北午夜與無頁面錯誤。
- 測試瀏覽器為獨立無個人登入資料的程序，不操作使用者 Notion。

瀏覽器測試需要既有 Playwright、Chromium、Python Pillow；透過 `PLAYWRIGHT_MODULE`、`CHROMIUM_PATH`、`PYTHON` 指定路徑，不在 iCloud 安裝套件。`SITE_BASE_URL` 可指定正式網站做同樣測試；`QA_DIR` 若需保存截圖，**只可指定 tmp 測試目錄**。

## 設計規範與選型

原生 HTML/CSS/JS＋GitHub Pages：時鐘不需伺服器或套件；Astro 增加建置成本，Vercel 多一個服務。獨立實作，視覺方向參考使用者指定的 [MindfulWidgets 時鐘](https://mindfulwidgets.com/embed/notion/world-clock/v1?color=gray&font=sans&layout=list&z1=Asia/Taipei&n1=TAIWAN)，不打包原站程式。

待辦沿用已確認的相同靜態架構，依使用者要求只存瀏覽器，無需新增後端、登入或套件；外觀與操作參考[使用者指定原版](https://embeds.widgetsfornotion.com/sleek-blue-todo-list/v1.9d1c23e5c942f5c8.4965b8f073efb5adeee2621f9150fecf)，獨立實作。月曆已依使用者要求刪除。

時鐘 CSS 採 primitive → semantic → component 變數，字型三角色均使用系統 sans；待辦保留原版式藍色及字級比例，兩者樣式分離。待辦小字與淡色圖示沿用原版視覺，不宣稱全面達成4.5:1對比。
