# 香港理工大學課程評論系統需求設計

## 1. 系統概述
香港理工大學課程評論系統（Course Review System, CRS）是一個基於 Web 的應用程式，旨在讓學生搜索課程、查看課程詳情、提交評論，以及讓管理員管理學系、學期、課程、教師、評論、用戶和加油句子。系統使用以下技術棧：
- **後端**：Node.js + Express，MySQL 資料庫
- **前端**：Vite + React（TypeScript），MUI（Material-UI）
- **密碼加密**：bcrypt（12 輪哈希）
- **網路配置**：
  - PC (192.168.0.x:54321) -> AP / router (192.168.0.1:80) -> modem -> public IP -> domain
  - PC (192.168.0.x:54320) -> AP / router (192.168.0.1:80) -> modem -> public IP -> domain

## 2. 功能需求

### 2.1 頂部導航欄（Top Navigation Bar）
- **功能描述**：
  - 水平導航欄，位於頁面頂部。
  - 中間包含搜索區域（Search Area）和搜索按鈕（Search Button），用於搜索課程（`Course.courseId`, `Course.name`）或教師（`Instructor.firstName`, `lastName`, `email`）。
  - 右側顯示已登入用戶的姓名（`User.firstName` + `User.lastName`）。
  - 滑鼠懸停在姓名上，顯示下拉選單，包含：
    1. **更改個人資料（Change Profile）**：導航至個人資料頁面。
    2. **評論歷史（Review History）**：導航至用戶評論歷史頁面，顯示所有評論（`Review` 表）。
    3. **切換主題（Dark Mode / Light Mode）**：切換深色/淺色模式。
  - 若用戶為管理員（`User.accessLevel = 0`），右側顯示「管理頁面（Admin Page）」按鈕，點擊導航至管理員後台。
  - 未登入用戶不顯示姓名和下拉選單。
- **前端實現**：
  - 使用 MUI 的 `AppBar` 和 `Toolbar` 組件。
  - 搜索區域使用 MUI 的 `TextField` 和 `Button`。
  - 下拉選單使用 MUI 的 `Menu` 組件。
  - 主題切換使用 MUI 的 `ThemeProvider`。
- **後端 API**：
  - `GET /api/user/profile`：獲取用戶資訊（`userId`, `firstName`, `lastName`, `accessLevel`）。
  - `GET /api/auth/status`：檢查用戶是否已登入。

### 2.2 更改個人資料（Change Profile）
- **功能描述**：
  - 顯示用戶資訊（來自 `User` 表）：
    - 用戶 ID（`userId`）
    - 電子郵件（`email`）
    - 名字（`firstName`）
    - 姓氏（`lastName`）
    - 註冊時間（`createdAt`）
    - 最後更新時間（`updatedAt`）
  - 提供兩個按鈕：
    1. **更改密碼（Change Password）**：
       - 點擊後顯示模態框，要求輸入：
         - 舊密碼：大小寫英文+符號，長度 > 8 字元。
         - 新密碼：大小寫英文+符號，長度 > 8 字元。
         - 確認新密碼：需與新密碼一致。
       - 使用 bcrypt（12 輪哈希）驗證舊密碼並更新新密碼。
       - 若 `loginFail` 超過 5 次，帳戶暫時鎖定（`accessLevel < 0`）。
    2. **刪除帳戶（Delete Account）**：
       - 點擊後顯示模態框，顯示用戶資訊並要求確認。
       - 確認後執行邏輯刪除（`accessLevel` 設為負值，如 -10000）。
- **前端實現**：
  - 使用 MUI 的 `Card` 或 `Grid` 展示用戶資訊。
  - 使用 MUI 的 `Dialog` 實現模態框。
  - 使用 MUI 的 `TextField`（設置 `type="password"`）和 `Button` 處理密碼更改。
  - 使用正則表達式驗證密碼格式（例如 `/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/`）。
- **後端 API**：
  - `GET /api/user/profile`：獲取用戶詳細資訊。
  - `PATCH /api/user/password`：更新密碼，驗證舊密碼和新密碼格式。
  - `PATCH /api/user/delete`：邏輯刪除帳戶。

### 2.3 首頁（Homepage）
- **功能描述**：
  - **未登入用戶**：
    - 頁面中間顯示登入表單，包含：
      - 學生 ID（`userId`）：必填，文本輸入。
      - 密碼（`password`）：必填，大小寫英文+符號，長度 > 8 字元。
      - 登入按鈕（Login Button）。
      - 忘記密碼（Forget Password）：點擊導航至忘記密碼頁面（待設計）。
    - 提供「註冊（Register）」按鈕，點擊後表單切換為註冊表單，包含：
      - 電子郵件（`email`）：必填，需符合正則表達式。
      - 密碼（`password`）：必填，大小寫英文+符號，長度 > 8 字元。
      - 確認密碼：需與密碼一致。
      - 名字（`firstName`）：必填，最大 50 字元。
      - 姓氏（`lastName`）：必填，最大 50 字元。
    - 註冊提交後，系統向 `email` 發送驗證郵件，用戶點擊驗證鏈接後帳戶開通（`accessLevel = 10000`）。
  - **已登入用戶**：
    - 頁面中間顯示大型搜索區域（Search Area）和搜索按鈕（Search Button）。
    - 搜索區域下方顯示隨機加油句子，來自 `Encouragement` 表（`status = 'C'`）。
    - 示例句子：
      - 「努力學習，未來可期！」
      - 「每一步進步都在接近你的目標！」
- **前端實現**：
  - 使用 MUI 的 `Box`, `FormControl`, `TextField`, `Button` 實現登入/註冊表單。
  - 使用 MUI 的 `Typography` 顯示加油句子。
  - 使用 React 的條件渲染切換登入/註冊表單。
- **後端 API**：
  - `POST /api/auth/login`：驗證 `userId` 和 `password`，返回 JWT。
  - `POST /api/auth/register`：創建用戶（`accessLevel = 10001`），發送驗證郵件。
  - `GET /api/auth/verify`：處理驗證鏈接，設置 `accessLevel = 10000`。
  - `GET /api/encouragement/random`：隨機返回加油句子。

### 2.4 管理員頁面（Admin Page）
- **功能描述**：
  - **左側邊欄（Sidebar）**：
    - 提供按鈕選擇功能：
      1. 創建學系（Create Department）
      2. 創建學期（Create Semester）
      3. 查看學系（View Department）
      4. 查看學期（View Semester）
      5. 查看課程（View Course）
      6. 查看評論（View Review）
      7. 查看教師（View Instructor）
      8. 管理加油句子（Manage Encouragement）
      9. 管理用戶（Manage User）
    - 右下角提供收起邊欄按鈕，點擊後邊欄收起，主區域擴展。
  - **主要區域（Main Area）**：
    - **查看學系、學期、課程、評論、教師**：
      - 以表格形式顯示數據（僅 `status = 'C'`）。
      - 表格欄位：
        - `Department`：`departmentId`, `name`, 操作（Edit/Delete）
        - `Semester`：`semesterId`, `name`, 操作（Edit/Delete）
        - `Course`：`courseId`, `departmentId`, `name`, `description`, `credits`, 操作（Edit/Delete）
        - `Review`：`reviewId`, `userId`, `courseId`, `semesterId`, `contentRating`, `teachingRating`, `gradingRating`, `workloadRating`, `comment`, `createdAt`, 操作（Delete）
        - `Instructor`：`instructorId`, `firstName`, `lastName`, `email`, `departmentId`, 操作（Edit/Delete）
      - 操作欄：
        - `Review`：僅邏輯刪除（Delete）。
        - `Department`, `Semester`, `Course`, `Instructor`：編輯（Edit）和邏輯刪除（Delete）。
      - **編輯操作**：
        - 點擊「Edit」，彈出模態框，顯示可編輯欄位（不可修改主鍵，如 `departmentId`, `semesterId`, `courseId`, `instructorId`）。
        - 模態框提供「取消（Cancel）」、「重置（Reset）」、「保存（Save）」按鈕。
      - **刪除操作**：
        - 點擊「Delete」，彈出模態框，顯示記錄資訊並要求確認。
        - 確認後執行邏輯刪除（`status = 'D'`）。
      - 表格上方靠右提供搜索區域，支援按關鍵欄位搜索。
      - 表格上方左側顯示「Showing 1 to 10 of X rows」。
      - 表格下方左側提供每頁行數選擇（30、50、80、100）。
      - 表格下方右側提供分頁控制，請求後端 API。
    - **創建學系、學期**：
      - 顯示表單，欄位對應 `Department` 或 `Semester` 表：
        - `Department`：`departmentId`, `name`
        - `Semester`：`semesterId`, `name`
      - 提供「提交（Submit）」按鈕。
    - **管理加油句子**：
      - 顯示「新增加油句子（New Encouragement）」按鈕和表格，列出 `Encouragement` 表（`status = 'C'`）。
      - 表格欄位：`encouragementId`, `content`, 操作（Edit/Delete）。
      - 點擊「New Encouragement」，彈出模態框，輸入句子，提供「取消（Cancel）」、「保存（Save）」按鈕。
      - 編輯/刪除操作同上。
      - 支援搜索、分頁、每頁行數選擇。
    - **管理用戶（Manage User）**：
      - 顯示表格，列出 `User` 表（`accessLevel >= 0`），欄位：`userId`, `email`, `firstName`, `lastName`, `accessLevel`, `loginFail`, `createdAt`, `updatedAt`, 操作（Block/Unblock, Detail）。
      - 操作欄：
        - **Block/Unblock**：切換用戶狀態（`accessLevel < 0` 表示封鎖，恢復設為原值）。
        - **Detail**：點擊後彈出模態框，顯示用戶資訊（`User` 表）及相關評論（`Review` + `ReviewComment` 表）。
      - 支援搜索（按 `userId`, `email`, `firstName`, `lastName`）、分頁、每頁行數選擇。
- **前端實現**：
  - 使用 MUI 的 `Drawer` 實現側邊欄，支援收起。
  - 使用 MUI 的 `DataGrid` 實現表格，支援搜索、分頁、行數選擇。
  - 使用 MUI 的 `Dialog` 實現模態框。
  - 使用 MUI 的 `TextField`, `Button`, `Select` 實現表單和搜索。
- **後端 API**：
  - **查看**：`GET /api/department`, `GET /api/semester`, `GET /api/course`, `GET /api/review`, `GET /api/instructor`, `GET /api/user`
  - **創建**：`POST /api/department`, `POST /api/semester`, `POST /api/encouragement`
  - **編輯**：`PATCH /api/department/:departmentId`, `PATCH /api/semester/:semesterId`, `PATCH /api/course/:courseId`, `PATCH /api/instructor/:instructorId`, `PATCH /api/encouragement/:encouragementId`
  - **刪除**：`PATCH /api/department/:departmentId/delete`, `PATCH /api/semester/:semesterId/delete`, `PATCH /api/course/:courseId/delete`, `PATCH /api/review/:reviewId/delete`, `PATCH /api/instructor/:instructorId/delete`, `PATCH /api/encouragement/:encouragementId/delete`
  - **用戶管理**：`PATCH /api/user/:userId/block`, `GET /api/user/:userId/details`

### 2.5 評分組件（Rating Component）
- **功能描述**：
  - 用於顯示 `Review` 表的四個評分（`contentRating`, `teachingRating`, `gradingRating`, `workloadRating`）。
  - 格式：`x.xx / 10`（取 2 位小數）。
  - 背景顏色：
    - ≥ 8 分：綠色
    - ≥ 5 分，< 8 分：橙色
    - < 5 分：紅色
  - 使用粗字體（bold），分數為白色。
  - 滑鼠懸停顯示英文描述：
    - **contentRating**：The content reflects the student's evaluation of the quality of the course content...
    - **teachingRating**：The teaching reflects the student's evaluation of the instructor's teaching performance...
    - **gradingRating**：The grading reflects the student’s perception of the fairness of the course’s grading criteria...
    - **workloadRating**：The workload reflects the student’s evaluation of the intensity of the course workload...
- **前端實現**：
  - 使用 MUI 的 `Typography` 或自訂組件顯示評分。
  - 使用 MUI 的 `Tooltip` 顯示懸停描述。
  - 使用 CSS 設置背景顏色（`backgroundColor`）和字體（`fontWeight: 'bold'`, `color: 'white'`）。
- **後端 API**：
  - 評分數據從 `GET /api/course/:courseId/reviews` 獲取平均值。

### 2.6 搜索結果（Search Result）
- **功能描述**：
  - 用戶按課程編號（`Course.courseId`）、課程名稱（`Course.name`）或教師（`Instructor.firstName`, `lastName`, `email`）進行模糊搜索。
  - **主要區域**：
    - 結果以卡片行（Card Row）形式展示，每行顯示：
      - 課程編號（`courseId`）
      - 課程名稱（`name`）
      - 四個平均評分（使用評分組件）
      - 評論數量（`Review` 表，`status = 'C'`）
    - 若無結果或顯示到最後，顯示「創建課程（Create Course）」按鈕，點擊導航至創建課程頁面。
  - **分頁與顯示控制**：
    - 上方左側顯示「Showing 1 to 10 of X rows」。
    - 下方左側提供每頁行數選擇（30、50、80、100）。
    - 下方右側提供分頁控制，請求後端 API。
    - 上方右側提供排序：按評論數量（降序）、最新評論（`Review.createdAt` 降序，預設）、總平均評分（降序）。
  - **點擊行為**：
    - 點擊卡片行，導航至課程資訊頁面。
- **前端實現**：
  - 使用 MUI 的 `Card` 展示卡片行，`Rating` 組件顯示評分。
  - 使用 MUI 的 `Pagination` 和 `Select` 實現分頁和行數選擇。
  - 使用 MUI 的 `Button` 實現「創建課程」按鈕。
- **後端 API**：
  - `GET /api/course/search`：
    - 參數：`query`（匹配 `courseId`, `name`, `Instructor.firstName`, `lastName`, `email`）、`page`、`limit`、`sort`。
    - 返回：課程列表（包含平均評分和評論數量）。

### 2.7 創建課程（Create Course）
- **功能描述**：
  - 任何用戶可創建課程。
  - **頁面內容**：
    - 表單欄位（對應 `Course` 和 `CourseDescription` 表）：
      - 課程編號（`courseId`）：必填，長度 ≥ 6。
      - 學系（`departmentId`）：下拉選單，顯示 `Department` 表（`status = 'C'`）。
      - 課程名稱（`name`）：必填，最大 100 字元。
      - 課程描述（`description`）：可選，文本區域。
      - 學分（`credits`）：必填，範圍 0-6。
    - 提供「提交（Submit）」按鈕。
  - **提交前檢查**：
    - 驗證 `courseId` 是否唯一（`status = 'C'`）。
    - 若存在，顯示模態框，提示：「相同的課程編號已存在！」並提供：
      - 鏈接至課程資訊頁面。
      - 重新輸入選項，保留表單資料。
    - 提交成功，保存至 `Course` 和 `CourseDescription` 表（`status = 'C'`），導航回搜索結果頁面。
- **前端實現**：
  - 使用 MUI 的 `FormControl`, `TextField`, `Select`, `TextArea` 實現表單。
  - 使用 MUI 的 `Dialog` 實現模態框。
  - 使用 `react-hook-form` 保留表單資料。
- **後端 API**：
  - `POST /api/course`：創建課程。
  - `GET /api/department`：獲取學系列表。
  - `GET /api/course/check`：檢查 `courseId` 是否存在。

### 2.8 課程資訊（Course Information）
- **功能描述**：
  - 顯示特定課程的詳細資訊。
  - **頁面內容**：
    - **課程基本資訊**（`Course` 表）：
      - 課程編號（`courseId`）
      - 課程名稱（`name`）
      - 學系（`Department.name`）
      - 課程描述（`CourseDescription.description`）
      - 學分（`credits`）
    - **課程開設資訊**（`CourseOffering`, `CourseOfferingInstructor`）：
      - 學期（`Semester.name`）
      - 教師（`Instructor.firstName`, `lastName`）
    - **評論統計**（`Review` 表，`status = 'C'`）：
      - 四個平均評分（2 位小數，使用評分組件）：
        - `contentRating`, `teachingRating`, `gradingRating`, `workloadRating`
      - 總評論數量
    - **創建評論按鈕**：
      - 顯示「創建評論（Create Review）」按鈕，點擊導航至創建課程評論頁面（附帶 `courseId`，僅學生 `accessLevel = 10000` 可見）。
    - **評論列表**：
      - 顯示課程評論（`status = 'C'`，按 `createdAt` 降序）。
      - 每條評論顯示：
        - 學期（`Semester.name`）
        - 四個評分（使用評分組件）
        - 評論內容（`ReviewComment.comment`）
        - 創建時間（`createdAt`）
      - 分頁控制：每頁 30 條，請求後端 API。
- **前端實現**：
  - 使用 MUI 的 `Card` 展示課程資訊和統計。
  - 使用 MUI 的 `List` 或 `Card` 展示評論列表。
  - 使用 MUI 的 `Pagination` 實現分頁。
  - 使用 MUI 的 `Button` 實現「創建評論」按鈕。
- **後端 API**：
  - `GET /api/course/:courseId`：獲取課程資訊。
  - `GET /api/course/:courseId/offerings`：獲取開設資訊。
  - `GET /api/course/:courseId/reviews`：獲取評論列表和統計。

### 2.9 創建課程評論（Create Course Review）
- **功能描述**：
  - 學生（`accessLevel = 10000`）為課程開設提交評論。
  - **頁面內容**：
    - 表單欄位（對應 `Review` 和 `ReviewComment` 表）：
      - **課程（`courseId`）**：自動填充（不可修改），從導航參數獲取。
      - **學期（`semesterId`）**：下拉選單，顯示該課程的 `CourseOffering`（`status = 'C'`）。
      - **教師（`instructorId`）**：
        - 自動顯示與選定 `CourseOffering` 關聯的教師。
        - 提供搜索區域（按 `Instructor.firstName`, `lastName`, `email`），顯示教師列表/下拉選單。
        - 列表末尾提供「創建教師（Create Instructor）」按鈕，點擊打開新頁面。
        - 提供「刷新教師列表」按鈕，重新加載教師數據。
      - **評分**（整數，0-10，使用評分組件）：
        - 課程內容評分（`contentRating`）：提示「課程內容質量如何？」
        - 教學質量評分（`teachingRating`）：提示「教師教學表現如何？」
        - 評分公平性評分（`gradingRating`）：提示「評分標準是否公平？」
        - 工作量評分（`workloadRating`）：提示「課程工作量是否合理？」
      - **評論內容（`comment`）**：文本區域，可選，最大 1000 字元，後端檢查是否僅空白或無意義字符。
    - **提交前檢查**：
      - 驗證評分在 0-10 範圍內。
      - 檢查用戶是否已對該 `CourseOffering` 提交評論（`userId`, `courseId`, `semesterId` 唯一）。
      - 若無 `CourseOffering`，自動創建（插入 `CourseOffering` 表）。
      - 若已存在評論，顯示模態框，提示：「你已對此課程提交過評論！」並提供鏈接至評論歷史頁面。
      - 提交成功，保存至 `Review` 和 `ReviewComment` 表（`status = 'C'`），導航回課程資訊頁面。
- **前端實現**：
  - 使用 MUI 的 `FormControl`, `Select`, `Rating`, `TextArea` 實現表單。
  - 使用 MUI 的 `Dialog` 實現模態框。
  - 使用 MUI 的 `Button` 實現提交、創建教師、刷新教師列表。
  - 使用 `react-hook-form` 管理表單狀態。
- **後端 API**：
  - `GET /api/course/:courseId/offerings`：獲取課程開設列表。
  - `GET /api/instructor/search`：搜索教師。
  - `POST /api/course-offering`：創建 `CourseOffering`。
  - `POST /api/review`：創建評論。
  - `GET /api/review/check`：檢查是否已提交評論。

### 2.10 創建教師（Create Instructor）
- **功能描述**：
  - 任何用戶可創建教師記錄（未來可限制為管理員）。
  - **頁面內容**：
    - 表單欄位（對應 `Instructor` 表）：
      - 名字（`firstName`）：必填，最大 50 字元。
      - 姓氏（`lastName`）：必填，最大 50 字元。
      - 電子郵件（`email`）：可選，需符合正則表達式。
      - 學系（`departmentId`）：下拉選單，顯示 `Department` 表（`status = 'C'`）。
    - 提供「提交（Submit）」按鈕。
  - **提交前檢查**：
    - 驗證 `firstName`, `lastName` 非空且符合長度。
    - 若提供 `email`，驗證格式並檢查是否唯一。
    - 若 `email` 已存在，顯示模態框，提示：「該電子郵件已存在！」並允許重新輸入（保留表單資料）。
    - 提交成功，保存至 `Instructor` 表（`status = 'C'`, `instructorId` 由 Snowflake 生成），導航回創建課程評論頁面。
- **前端實現**：
  - 使用 MUI 的 `FormControl`, `TextField`, `Select` 實現表單。
  - 使用 MUI 的 `Dialog` 實現模態框。
  - 使用 `react-hook-form` 保留表單資料。
- **後端 API**：
  - `POST /api/instructor`：創建教師。
  - `GET /api/department`：獲取學系列表。
  - `GET /api/instructor/check`：檢查 `email` 是否存在。

## 3. 非功能需求
- **安全性**：
  - 使用 JWT 驗證用戶身份，限制管理員功能（`accessLevel = 0`）和學生功能（`accessLevel = 10000`）。
  - 註冊驗證郵件使用安全鏈接（帶一次性令牌）。
  - 僅顯示 `status = 'C'` 的數據。
  - 使用 bcrypt 加密密碼，限制 `loginFail`（> 5 次鎖定帳戶）。
  - 密碼需符合正則表達式：`^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$`。
- **性能**：
  - 分頁請求限制每頁數據量（10、30、50、80、100 行）。
  - 使用資料庫索引優化搜索（`courseId`, `name`, `Instructor.email` 等）。
  - 評分計算使用 SQL 聚合函數（`AVG`）。
- **可訪問性**：
  - 支援鍵盤導航，符合 WCAG 2.1。
  - 評分組件和表單使用高對比度，適配深色/淺色模式。
- **可擴展性**：
  - 支援未來添加篩選條件（如按學期搜索）。
  - 表單支援添加新欄位（如課程類型、教師職稱）。

## 4. 使用者介面設計
- **頂部導航欄**：使用 MUI 藍色主題，固定頂部。
- **首頁**：
  - 未登入：登入/註冊表單置中，使用 MUI `Card` 包裝。
  - 已登入：搜索框和句子置中，背景淺色漸變。
- **管理員頁面**：側邊欄深色主題，表格支援排序和過濾。
- **評分組件**：使用 MUI `Typography` 和 `Tooltip`，動態背景。
- **搜索結果**：卡片行適配移動設備，垂直滾動。
- **課程資訊**：分區顯示資訊、統計和評論，分頁直觀。
- **表單頁面**：使用 MUI `Grid` 佈局，模態框清晰。

## 5. 技術實現細節
- **前端**：
  - 使用 Vite + React（TypeScript）構建 SPA。
  - 使用 MUI 組件庫確保一致 UI。
  - 使用 `axios` 與後端交互。
  - 使用 React Router 導航。
  - 使用 `react-hook-form` 管理表單。
- **後端**：
  - 使用 Node.js + Express 構建 RESTful API。
  - 使用 `mysql2` 連接到 MySQL。
  - 使用 `nodemailer` 或類似庫發送驗證郵件。
  - 使用事務確保數據一致性。
- **資料庫查詢示例**：
  - 搜索課程和教師：
    ```sql
    SELECT c.courseId, c.name, AVG(r.contentRating) AS avgContentRating, ...
    FROM Course c
    LEFT JOIN CourseOffering co ON c.courseId = co.courseId
    LEFT JOIN Review r ON co.courseId = r.courseId AND co.semesterId = r.semesterId
    WHERE c.status = 'C' AND (c.courseId LIKE ? OR c.name LIKE ? OR EXISTS (
        SELECT 1 FROM CourseOfferingInstructor coi
        JOIN Instructor i ON coi.instructorId = i.instructorId
        WHERE coi.courseId = c.courseId AND i.status = 'C'
        AND (i.firstName LIKE ? OR i.lastName LIKE ? OR i.email LIKE ?)
    ))
    GROUP BY c.courseId;
    ```
  - 註冊用戶：
    ```sql
    INSERT INTO User (userId, email, password, accessLevel, firstName, lastName, loginFail, createdAt, updatedAt)
    VALUES (?, ?, ?, 10001, ?, ?, 0, NOW(), NOW());
    ```