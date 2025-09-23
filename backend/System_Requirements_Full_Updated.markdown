# 香港理工大學課程評論系統需求設計

## 1. 系統概述
香港理工大學課程評論系統（Course Review System, CRS）是一個基於 Web 的應用程式，旨在讓學生搜索課程、查看課程詳情、提交評論，以及讓管理員管理學系、學期、課程、教師、評論、用戶和加油句子。系統使用以下技術棧：
- **後端**：Node.js + Express，MySQL 資料庫
- **前端**：Vite + React（TypeScript），MUI（Material-UI）
- **密碼加密**：bcrypt（12 輪哈希）
- **網路配置**：
  - PC (192.168.0.105:54321) -> AP (192.168.0.1:80) / 113.252.199.67 -> modem -> http://atlweb.freedynamicdns.net/
  - PC (192.168.0.105:54320) -> AP (192.168.0.1:12345) / 113.252.199.67 -> modem -> http://atlweb.freedynamicdns.net/

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
    - 上方