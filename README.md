# Notion 台灣時鐘與隨手待辦

台灣時鐘與隨手待辦：灰色卡片、系統無襯線字型、**外圍透明**，隨嵌入頁面的明暗模式自動切換。無套件、無建置步驟、無外部字型、無追蹤與資料蒐集。

| 小工具 | Notion 嵌入網址 | 建議區塊高度 |
|---|---|---|
| 台灣時鐘 | https://lupinart.github.io/notion-clock-calendar/ | 125px |
| 隨手待辦 | https://lupinart.github.io/notion-clock-calendar/todo.html | 360px起，依項目數調整 |

在 Notion 輸入 `/embed`，貼入網址即可。建議寬度240px以上；高度可拖曳調整。

## 顯示與行為

- 外圍的 html/body 永遠透明；保留卡片自身底色。無固定黑框、白框或品牌浮水印。
- 支援父頁淺色與深色協商；卡片採 `#f9f8f7`／`#383836`，文字同步切換。不需要主題參數或更換網址。
- 時鐘固定 Asia/Taipei 時區，24小時制，TAIWAN 標籤；每秒校時，顯示時、分、當地日期及 UTC+8。使用觀看者裝置時間，不連線取得遠端標準時間。
- 使用語意化時間元素，沒有閃爍或動畫。

## 隨手待辦與保存

- 新增（也可 Enter）、勾選完成、刪除單筆、清除已完成項目；文字上限500字，長文字自動換行。
- 配色直接共用時鐘的 `widgets.css`，僅新增待辦專屬樣式。新增按鈕採灰階，兩種主題的文字對比均至少4.5:1。
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
- `node test-todo-embed.mjs`：待辦新增、Enter、完成、鍵盤焦點、重載保存、刪除、清除已完成、長文窄欄、分頁同步、保存衝突、拒絕寫入與壞資料不覆寫；同時驗證跨來源 iframe 淺→深→淺外圍透明、與時鐘相同卡片色與對比。
- `node test-embed.mjs`：以 Playwright Chromium 建立不同來源 iframe，於同一載入頁面切換淺→深→淺；檢查實際像素確認外圍透出父頁色，卡片／文字依模式改變且對比至少4.5:1；驗證240px窄欄、台北午夜與無頁面錯誤。
- 測試瀏覽器為獨立無個人登入資料的程序，不操作使用者 Notion。

瀏覽器測試需要既有 Playwright、Chromium、Python Pillow；透過 `PLAYWRIGHT_MODULE`、`CHROMIUM_PATH`、`PYTHON` 指定路徑，不在 iCloud 安裝套件。`SITE_BASE_URL` 可指定正式網站做同樣測試；`QA_DIR` 若需保存截圖，**只可指定 tmp 測試目錄**。

## 設計規範與選型

原生 HTML/CSS/JS＋GitHub Pages：時鐘不需伺服器或套件；Astro 增加建置成本，Vercel 多一個服務。獨立實作，視覺方向參考使用者指定的 [MindfulWidgets 時鐘](https://mindfulwidgets.com/embed/notion/world-clock/v1?color=gray&font=sans&layout=list&z1=Asia/Taipei&n1=TAIWAN)，不打包原站程式。

待辦沿用已確認的相同靜態架構，依使用者要求只存瀏覽器，無需新增後端、登入或套件；參考原版待辦的基本操作，獨立實作，不打包第三方原站程式。月曆已依使用者要求刪除。

CSS 採 primitive → semantic → component 變數。字型三角色均使用系統 sans；字級10/12/14/16/28/48px，時鐘數字隨欄寬縮放；間距4/8/12/16/24px，卡片圓角14px。日期與時間數字等寬，兩種模式均有高對比文字。
