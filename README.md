# Notion 台灣時鐘與月曆

兩個獨立的 Notion 小工具：灰色卡片、系統無襯線字型、**外圍透明**，隨嵌入頁面的明暗模式自動切換。無套件、無建置步驟、無外部字型、無追蹤與資料蒐集。

| 小工具 | Notion 嵌入網址 | 建議區塊高度 |
|---|---|---|
| 台灣時鐘 | https://lupinart.github.io/notion-clock-calendar/ | 125px |
| 月曆 | https://lupinart.github.io/notion-clock-calendar/calendar.html | 430px |

在 Notion 輸入 `/embed`，貼入網址即可。建議寬度240px以上；高度可拖曳調整。

## 顯示與行為

- 外圍的 html/body 永遠透明；保留卡片自身底色。無固定黑框、白框或品牌浮水印。
- 支援父頁淺色與深色協商；卡片採 `#f9f8f7`／`#383836`，文字及標題面板同步切換。不需要主題參數或更換網址。
- 時鐘固定 Asia/Taipei 時區，24小時制，TAIWAN 標籤；每秒校時，顯示時、分、當地日期及 UTC+8。使用觀看者裝置時間，不連線取得遠端標準時間。
- 月曆以台北日期為今天，週日開始；可前後切月、跨年、回到今天，跨日會更新日期標示。六週固定版面，不儲存行事曆事件。
- 語意化表格、按鈕中文標籤、鍵盤焦點、44px月份導覽按鈕；沒有閃爍或動畫。

## 明暗模式與透明

HTML 提前宣告 `<meta name="color-scheme" content="light dark">`，CSS 根節點也宣告 `color-scheme:light dark`。因此父頁與子頁可協商相同明暗模式，避免瀏覽器為 iframe 補不透明畫布。卡片以 `prefers-color-scheme` 切換色彩，外圍不填底色。

參考：[W3C CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/#color-scheme-effect)。Chromium 可將父頁模式傳遞到跨來源 iframe；Safari 有[已知差異](https://developer.chrome.com/docs/modern-web-guidance/guides/visual-design/dark-mode#known_issues_to_be_aware_of)，未經 Safari 實測，不宣稱所有平台皆驗證。

## 開發與驗證

純靜態檔案，GitHub Pages 使用 main 分支根目錄；HTTP 伺服器直接提供即可。iCloud 原始碼為權威，網站測試一律複製必要檔案到 `/private/tmp/codex-builds/`，所有 QA 截圖與可重建檔案只留 tmp，收尾清理。

- `node test.mjs`：台北跨日、跨年切月、閏年二月、42格日期排列。
- `node test-embed.mjs`：以 Playwright Chromium 建立不同來源 iframe，於同一載入頁面切換淺→深→淺；檢查實際像素確認外圍透出父頁色，卡片／文字依模式改變且對比至少4.5:1；驗證240px窄欄、月曆導覽、回到今天、台北午夜與無頁面錯誤。
- 測試瀏覽器為獨立無個人登入資料的程序，不操作使用者 Notion。

瀏覽器測試需要既有 Playwright、Chromium、Python Pillow；透過 `PLAYWRIGHT_MODULE`、`CHROMIUM_PATH`、`PYTHON` 指定路徑，不在 iCloud 安裝套件。`SITE_BASE_URL` 可指定正式網站做同樣測試；`QA_DIR` 若需保存截圖，**只可指定 tmp 測試目錄**。

## 設計規範與選型

原生 HTML/CSS/JS＋GitHub Pages：這兩個工具不需伺服器或套件；Astro 增加建置成本，Vercel 多一個服務。獨立實作，視覺方向參考使用者指定的 [MindfulWidgets 時鐘](https://mindfulwidgets.com/embed/notion/world-clock/v1?color=gray&font=sans&layout=list&z1=Asia/Taipei&n1=TAIWAN)與[行事曆](https://mindfulwidgets.com/embed/notion/calendar/v2?color=gray&font=sans&header=panel)，不打包原站程式。

CSS 採 primitive → semantic → component 變數。字型三角色均使用系統 sans；字級10/12/14/16/28/48px，時鐘數字隨欄寬縮放；間距4/8/12/16/24px，卡片圓角14px。日期與時間數字等寬，兩種模式均有高對比文字。
