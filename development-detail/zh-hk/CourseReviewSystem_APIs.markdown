# 課程評論系統 API 整理

## 用戶相關 API（User & Auth）
| 方法   | 端點路徑                       | 描述 |
|--------|--------------------------------|------|
| GET    | /api/user/profile             | 獲取用戶資訊（userId, firstName, lastName, email, accessLevel, createdAt, updatedAt）。 |
| GET    | /api/auth/status              | 檢查用戶是否已登入。 |
| POST   | /api/auth/login               | 驗證 userId 和 password，返回 JWT。 |
| POST   | /api/auth/register            | 創建用戶（accessLevel = 10001），發送驗證郵件。 |
| GET    | /api/auth/verify              | 處理驗證鏈接，設置 accessLevel = 10000。 |
| PATCH  | /api/user/password            | 更新密碼，驗證舊密碼和新密碼格式。 |
| PATCH  | /api/user/delete              | 邏輯刪除帳戶（accessLevel 設為負值，例如 -10000）。 |
| GET    | /api/user                     | 查看用戶列表（管理員用，僅 accessLevel >= 0）。 |
| PATCH  | /api/user/:userId/block       | 封鎖或解封用戶（accessLevel < 0 表示封鎖）。 |
| GET    | /api/user/:userId/details     | 獲取用戶詳細資訊及相關評論（管理員用）。 |

## 課程相關 API（Course）
| 方法   | 端點路徑                       | 描述 |
|--------|--------------------------------|------|
| GET    | /api/course                   | 查看課程列表（status = 'C'）。 |
| POST   | /api/course                   | 創建課程，驗證 courseId 唯一性。 |
| PATCH  | /api/course/:courseId         | 編輯課程（不可修改 courseId）。 |
| PATCH  | /api/course/:courseId/delete  | 邏輯刪除課程（status = 'D'）。 |
| GET    | /api/course/:courseId         | 獲取課程基本資訊、開設資訊及評論統計（平均評分和總數）。 |
| GET    | /api/course/:courseId/reviews | 獲取課程評論列表，支持分頁（例如 ?page=1&limit=30）。 |
| POST   | /api/course/:courseId/instructor | 新增教師到課程開設，需提供 courseId, semesterId, instructorId，自動創建 CourseOffering 若不存在。 |

## 學系相關 API（Department）
| 方法   | 端點路徑                          | 描述 |
|--------|-----------------------------------|------|
| GET    | /api/department                  | 查看學系列表（status = 'C'）。 |
| POST   | /api/department                  | 創建學系。 |
| PATCH  | /api/department/:departmentId    | 編輯學系（不可修改 departmentId）。 |
| PATCH  | /api/department/:departmentId/delete | 邏輯刪除學系（status = 'D'）。 |

## 學期相關 API（Semester）
| 方法   | 端點路徑                          | 描述 |
|--------|-----------------------------------|------|
| GET    | /api/semester                    | 查看學期列表（status = 'C'）。 |
| POST   | /api/semester                    | 創建學期。 |
| PATCH  | /api/semester/:semesterId        | 編輯學期（不可修改 semesterId）。 |
| PATCH  | /api/semester/:semesterId/delete | 邏輯刪除學期（status = 'D'）。 |

## 教師相關 API（Instructor）
| 方法   | 端點路徑                          | 描述 |
|--------|-----------------------------------|------|
| GET    | /api/instructor                  | 查看教師列表（status = 'C'）。 |
| POST   | /api/instructor                  | 創建教師，驗證 email 唯一性（若提供）。 |
| PATCH  | /api/instructor/:instructorId    | 編輯教師（不可修改 instructorId）。 |
| PATCH  | /api/instructor/:instructorId/delete | 邏輯刪除教師（status = 'D'）。 |
| GET    | /api/instructor/search?query=... | 模糊搜索教師（按 firstName, lastName, email）。 |

## 課程開設相關 API（CourseOffering）
| 方法   | 端點路徑                          | 描述 |
|--------|-----------------------------------|------|
| POST   | /api/course-offering             | 創建課程開設（CourseOffering 和 CourseOfferingInstructor，若需要）。 |

## 評論相關 API（Review）
| 方法   | 端點路徑                          | 描述 |
|--------|-----------------------------------|------|
| GET    | /api/review                      | 查看評論列表（status = 'C'）。 |
| POST   | /api/review                      | 創建評論，驗證用戶對該 CourseOffering 未提交過評論，自動生成 CourseOffering 若需要。 |
| PATCH  | /api/review/:reviewId/delete     | 邏輯刪除評論（status = 'D'）。 |

## 加油句子相關 API（Encouragement）
| 方法   | 端點路徑                          | 描述 |
|--------|-----------------------------------|------|
| GET    | /api/encouragement/random        | 隨機返回加油句子（status = 'C'）。 |
| POST   | /api/encouragement               | 創建新加油句子。 |
| PATCH  | /api/encouragement/:encouragementId | 編輯加油句子。 |
| PATCH  | /api/encouragement/:encouragementId/delete | 邏輯刪除加油句子（status = 'D'）。 |