# Course Review System API Documentation

## User & Authentication APIs (User & Auth)

| Method | Endpoint                          | Description                                                                 |
|--------|-----------------------------------|-----------------------------------------------------------------------------|
| GET    | /api/user/profile                 | Retrieve user profile (userId, firstName, lastName, email, accessLevel, createdAt, updatedAt). |
| GET    | /api/auth/status                  | Check if the user is currently logged in.                                   |
| POST   | /api/auth/login                   | Validate userId and password, return JWT token on success.                  |
| POST   | /api/auth/register                | Create a new user (accessLevel = 10001), send verification email.           |
| GET    | /api/auth/verify                  | Process email verification link, update accessLevel to 10000 upon success.  |
| PATCH  | /api/user/password                | Update password (requires old password verification and new password format check). |
| PATCH  | /api/user/delete                  | Logically delete account (set accessLevel to negative value, e.g., -10000). |
| GET    | /api/user                         | List all users (admin only, only users with accessLevel >= 0).              |
| PATCH  | /api/user/:userId/block           | Block or unblock a user (accessLevel < 0 indicates blocked).                |
| GET    | /api/user/:userId/details         | Retrieve detailed user information and associated reviews (admin only).     |

## Course APIs (Course)

| Method | Endpoint                               | Description                                                                 |
|--------|----------------------------------------|-----------------------------------------------------------------------------|
| GET    | /api/course                            | List all courses (status = 'C').                                            |
| POST   | /api/course                            | Create a new course, validate courseId uniqueness.                          |
| PATCH  | /api/course/:courseId                  | Edit course details (courseId cannot be modified).                          |
| PATCH  | /api/course/:courseId/delete           | Logically delete course (set status = 'D').                                 |
| GET    | /api/course/:courseId                  | Get course basic info, offering details, and review statistics (average rating and total count). |
| GET    | /api/course/:courseId/reviews          | Get paginated list of reviews for the course (e.g., ?page=1&limit=30).       |
| POST   | /api/course/:courseId/instructor       | Add instructor to a course offering (requires courseId, semesterId, instructorId); automatically creates CourseOffering if it does not exist. |

## Department APIs (Department)

| Method | Endpoint                                  | Description                                                  |
|--------|-------------------------------------------|--------------------------------------------------------------|
| GET    | /api/department                           | List all departments (status = 'C').                         |
| POST   | /api/department                           | Create a new department.                                     |
| PATCH  | /api/department/:departmentId              | Edit department details (departmentId cannot be modified).    |
| PATCH  | /api/department/:departmentId/delete      | Logically delete department (set status = 'D').               |

## Semester APIs (Semester)

| Method | Endpoint                               | Description                                                  |
|--------|----------------------------------------|--------------------------------------------------------------|
| GET    | /api/semester                          | List all semesters (status = 'C').                            |
| POST   | /api/semester                          | Create a new semester.                                       |
| PATCH  | /api/semester/:semesterId              | Edit semester details (semesterId cannot be modified).        |
| PATCH  | /api/semester/:semesterId/delete       | Logically delete semester (set status = 'D').                 |

## Instructor APIs (Instructor)

| Method | Endpoint                                      | Description                                                                 |
|--------|-----------------------------------------------|-----------------------------------------------------------------------------|
| GET    | /api/instructor                               | List all instructors (status = 'C').                                         |
| POST   | /api/instructor                               | Create a new instructor, validate email uniqueness if provided.             |
| PATCH  | /api/instructor/:instructorId                 | Edit instructor details (instructorId cannot be modified).                   |
| PATCH  | /api/instructor/:instructorId/delete          | Logically delete instructor (set status = 'D').                             |
| GET    | /api/instructor/search?query=...              | Fuzzy search instructors by firstName, lastName, or email.                  |

## Course Offering APIs (CourseOffering)

| Method | Endpoint                 | Description                                                                                     |
|--------|--------------------------|-------------------------------------------------------------------------------------------------|
| POST   | /api/course-offering     | Create a course offering (creates CourseOffering and CourseOfferingInstructor records if needed). |

## Review APIs (Review)

| Method | Endpoint                        | Description                                                                                               |
|--------|---------------------------------|-----------------------------------------------------------------------------------------------------------|
| GET    | /api/review                     | List all reviews (status = 'C').                                                                          |
| POST   | /api/review                     | Create a new review; validates that the user has not already reviewed the same CourseOffering; automatically creates CourseOffering if needed. |
| PATCH  | /api/review/:reviewId/delete    | Logically delete review (set status = 'D').                                                                |

## Encouragement APIs (Encouragement)

| Method | Endpoint                                      | Description                                                  |
|--------|-----------------------------------------------|--------------------------------------------------------------|
| GET    | /api/encouragement/random                     | Randomly return an active encouragement sentence (status = 'C'). |
| POST   | /api/encouragement                            | Create a new encouragement sentence.                         |
| PATCH  | /api/encouragement/:encouragementId           | Edit an encouragement sentence.                              |
| PATCH  | /api/encouragement/:encouragementId/delete    | Logically delete encouragement sentence (set status = 'D').  |