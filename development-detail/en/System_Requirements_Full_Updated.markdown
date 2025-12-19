# Requirements Design for the Course Commenting System at Hong Kong Polytechnic University

 

## 1. System Overview

The Hong Kong Polytechnic University Course Review System (CRS) is a web-based application designed to allow students to search for courses, view course details, and submit reviews, while administrators manage departments, semesters, courses, instructors, reviews, users, and encouraging messages. The system uses the following technology stack:

Backend: Node.js + Express, MySQL database

Front-end development: Vite + React (TypeScript), MUI (Material-UI)

- **Password encryption**: bcrypt (12 rounds of hashing)

- **Network Configuration**:

- PC (192.168.0.x:54321) -> AP / router (192.168.0.1:80) -> modem -> public IP -> domain

- PC (192.168.0.x:54320) -> AP / router (192.168.0.1:80) -> modem -> public IP -> domain

 

## 2. Functional Requirements

 

### 2.1 Top Navigation Bar

- **Function Description**:

- Horizontal navigation bar, located at the top of the page.

- The middle section contains a search area and a search button for searching courses (`Course.courseId`, `Course.name`) or instructors (`Instructor.firstName`, `lastName`, `email`).

- The right side displays the names of logged-in users (`User.firstName` + `User.lastName`).

- Hovering the mouse over a name displays a drop-down menu containing:

1. **Change Profile:** Navigate to your profile page.

2. **Review History:** Navigate to the user's review history page, which displays all reviews (in the `Review` table).

3. **Switch Theme (Dark Mode / Light Mode)**: Switch between dark and light modes.

- If the user is an administrator (`User.accessLevel = 0`), the "Admin Page" button will be displayed on the right. Clicking it will navigate to the administrator backend.

- Users who are not logged in will not have their names or drop-down menus displayed.

- **Front-end implementation**:

- Use MUI's `AppBar` and `Toolbar` components.

- The search area uses MUI's `TextField` and `Button`.

- The dropdown menu uses MUI's `Menu` component.

- Theme switching uses MUI's `ThemeProvider`.

- ** Backend API**:

- `GET /api/user/profile`: Retrieves user information (`userId`, `firstName`, `lastName`, `accessLevel`).

- `GET /api/auth/status`: Check if the user is logged in.

 

### 2.2 Change Profile

- **Function Description**:

- Display user information (from the `User` table):

- User ID (`userId`)

- Email (`email`)

- Name (`firstName`)

- Last Name

- Registration time (`createdAt`)

- Last updated time (`updatedAt`)

- Provides two buttons:

1. **Change Password**:

Clicking this will display a modal window that prompts you to enter:

- Old password: uppercase and lowercase English letters + symbols, length > 8 characters.

- New password: uppercase and lowercase English letters + symbols, length > 8 characters.

- Confirm new password: Must match the new password.

- Use bcrypt (12 rounds of hashing) to verify the old password and update the new password.

- If `loginFail` occurs more than 5 times, the account will be temporarily locked (`accessLevel < 0`).

2. **Delete Account:**

- Clicking this will display a modal window showing user information and requiring confirmation.

- After confirmation, perform logical deletion (set `accessLevel` to a negative value, such as -10000).

- **Front-end implementation**:

- Use MUI's `Card` or `Grid` to display user information.

- Implement a modal using MUI's `Dialog`.

- Use MUI's `TextField` (with `type="password"`) and `Button` to handle password changes.

- Use regular expressions to validate password format (e.g., `/^(?=.*[az])(?=.*[AZ])(?=.*[!@#$%^&*]).{8,}$/`).

- **Backend API**:

- `GET /api/user/profile`: Retrieves detailed user information.

- `PATCH /api/user/password`: Updates the password, verifying the old password and the new password format.

- `PATCH /api/user/delete`: Logically deletes the account.

 

### 2.3 Homepage

- **Function Description**:

- **Users who are not logged in**:

- The login form is displayed in the middle of the page, containing:

- Student ID (`userId`): Required, text input.

- Password: Required, uppercase and lowercase English letters + symbols, length > 8 characters.

- Login Button.

- Forgot Password: Click to navigate to the Forgot Password page (to be designed).

- Provides a "Register" button; clicking it switches the form to a registration form, which includes:

- Email address (`email`): Required, must conform to a regular expression.

- Password: Required, uppercase and lowercase English letters + symbols, length > 8 characters.

- Confirm Password: Must match the password.

- Name (`firstName`): Required, maximum 50 characters.

- Last Name: Required, maximum 50 characters.

- After registration is submitted, the system will send a verification email to `email`. After the user clicks the verification link, the account will be activated (`accessLevel = 10000`).

- **Logged-in users**:

- A large search area and a search button are displayed in the middle of the page.

- Random encouraging sentences are displayed below the search area, from the `Encouragement` table (`status = 'C'`).

- Example sentence:

"Study hard, and the future will be bright!"

"Every step forward brings you closer to your goal!"

- **Front-end implementation**:

- Implement login/registration forms using MUI's `Box`, `FormControl`, `TextField`, and `Button`.

- Use MUI's `Typography` to display cheering sentences.

- Use React to conditionally render toggle login/registration forms.

- **Backend API**:

- `POST /api/auth/login`: Verifies `userId` and `password`, and returns a JWT.

- `POST /api/auth/register`: Creates a user (`accessLevel = 10001`) and sends a verification email.

- `GET /api/auth/verify`: Handles the verification link, setting `accessLevel = 10000`.

- `GET /api/encouragement/random`: Returns a random encouraging message.

 

### 2.4 Admin Page

- **Function Description**:

- **Left Sidebar**:

- Provides button selection functionality:

1. Create a Department

2. Create Semester

3. View Department

4. View Semester

5. View Course

6. View Reviews

7. View Instructor

8. Management Encouragement Phrases

9. Manage User

- A button to collapse the sidebar is provided in the bottom right corner. Clicking it will collapse the sidebar and expand the main area.

- **Main Area**:

- **View department, semester, courses, comments, and faculty:**

- Display data in tabular form (only `status = 'C'`).

- Table fields:

- `Department`: `departmentId`, `name`, operation (Edit/Delete)

- `Semester`: `semesterId`, `name`, operation (Edit/Delete)

- `Course`: `courseId`, `departmentId`, `name`, `description`, `credits`, operation (Edit/Delete)

- `Review`: `reviewId`, `userId`, `courseId`, `semesterId`, `contentRating`, `teachingRating`, `gradingRating`, `workloadRating`, `comment`, `createdAt`, operation (Delete)

- `Instructor`: `instructorId`, `firstName`, `lastName`, `email`, `departmentId`, operation (Edit/Delete)

- Operation bar:

- `Review`: Logical deletion only (Delete).

- `Department`, `Semester`, `Course`, `Instructor`: Edit and Delete logically.

- **Editing Operations**:

Click "Edit" to bring up a modal window that displays editable fields (primary keys such as `departmentId`, `semesterId`, `courseId`, and `instructorId` cannot be modified).

- The modal provides "Cancel", "Reset", and "Save" buttons.

- **Delete operation:**

Click "Delete" to bring up a modal window that displays the log information and asks for confirmation.

- Logical deletion will be performed after confirmation (`status = 'D'`).

- A search area is provided at the top right of the table, supporting searches by key fields.

- The top left of the table displays "Showing 1 to 10 of X rows".

- The number of rows per page is selected on the lower left of the table (30, 50, 80, 100).

- Pagination control is provided on the lower right side of the table, requesting the backend API.

- **Creating Departments and Semesters**:

- Display the form, with fields corresponding to the `Department` or `Semester` table:

- `Department`: `departmentId`, `name`

- `Semester`: `semesterId`, `name`

- Provides a "Submit" button.

- **Words of encouragement for managers**:

- Displays the "New Encouragement" button and a table, listing the `Encouragement` table (`status = 'C'`).

- Table fields: `encouragementId`, `content`, operations (Edit/Delete).

- Click "New Encouragement" to bring up a modal box, enter a sentence, and you will be provided with "Cancel" and "Save" buttons.

- Editing/deleting operations are the same as above.

- Supports search, pagination, and selection of the number of rows per page.

- **Manage User**:

- Displays a table listing the `User` table (`accessLevel >= 0`), with the following columns: `userId`, `email`, `firstName`, `lastName`, `accessLevel`, `loginFail`, `createdAt`, `updatedAt`, and operations (Block/Unblock, Detail).

- Operation bar:

- **Block/Unblock**: Toggle user status (`accessLevel < 0` indicates blocking, restores to the original value).

- **Detail**: Clicking this will bring up a modal window that displays user information (`User` table) and related comments (`Review` + `ReviewComment` tables).

- Supports search (by `userId`, `email`, `firstName`, `lastName`), pagination, and selection of the number of rows per page.

- **Front-end implementation**:

- Implement the sidebar using MUI's `Drawer`, which supports collapsing.

- Use MUI's `DataGrid` to implement a table, supporting search, pagination, and row selection.

- Implement a modal using MUI's `Dialog`.

- Implement forms and search using MUI's `TextField`, `Button`, and `Select`.

- **Backend API**:

- **View**: `GET /api/department`, `GET /api/semester`, `GET /api/course`, `GET /api/review`, `GET /api/instructor`, `GET /api/user`

- **Create**: `POST /api/department`, `POST /api/semester`, `POST /api/encouragement`

- **EDIT**: `PATCH /api/department/:departmentId`, `PATCH /api/semester/:semesterId`, `PATCH /api/course/:courseId`, `PATCH /api/instructor/:instructorId`, `PATCH /api/encouragement/:encouragementId`

- **DELETE**: `PATCH /api/department/:departmentId/delete`, `PATCH /api/semester/:semesterId/delete`, `PATCH /api/course/:courseId/delete`, `PATCH /api/review/:reviewId/delete`, `PATCH /api/instructor/:instructorId/delete`, `PATCH /api/encouragement/:encouragementId /delete`

- **User Management**: `PATCH /api/user/:userId/block`, `GET /api/user/:userId/details`

 

### 2.5 Rating Component

- **Function Description**:

- Used to display the four ratings in the `Review` table (`contentRating`, `teachingRating`, `gradingRating`, `workloadRating`).

- Format: `x.xx / 10` (take 2 decimal places).

- Background color:

- ≥ 8 points: Green

- ≥ 5 points, < 8 points: Orange

- < 5 points: Red

- Use bold font, and the fractions are in white.

- Mouse hover display English description:

- **contentRating**: The content reflects the student's evaluation of the quality of the course content...

- **teachingRating**: The teaching reflects the student's evaluation of the instructor's teaching performance...

- **gradingRating**: The grading reflects the student's perception of the fairness of the course's grading criteria...

- **workloadRating**: The workload reflects the student's evaluation of the intensity of the course workload...

- **Front-end implementation**:

- Display ratings using MUI's `Typography` or a custom component.

- Use MUI's `Tooltip` to display hover descriptions.

- Use CSS to set the background color (`backgroundColor`) and font (`fontWeight: 'bold'`, `color: 'white'`).

- **Backend API**:

- The rating data is obtained by averaging the values from `GET /api/course/:courseId/reviews`.

 

### 2.6 Search Results

- **Function Description**:

- Users can perform fuzzy searches by course ID (`Course.courseId`), course name (`Course.name`), or instructor (`Instructor.firstName`, `lastName`, `email`).

- **Main Areas**:

- The results are displayed in card row format, with each row showing:

- Course ID (`courseId`)

- Course Name (`name`)

- Four average ratings (using a rating component)

- Number of comments (`Review` table, `status = 'C'`)

- If no results are found or the page is displayed at the end, the "Create Course" button will appear. Click it to navigate to the course creation page.

- **Paging and Display Controls**:

- The top left side displays "Showing 1 to 10 of X rows".

- The bottom left provides options for the number of rows per page (30, 50, 80, 100).

- Pagination control is provided on the bottom right, requesting the backend API.

- The top right side provides sorting options: by number of comments (descending), latest comments (`Review.createdAt` descending, default), and overall average rating (descending).

- **Click behavior**:

- Click on the card row to navigate to the course information page.

- **Front-end implementation**:

- Use MUI's `Card` component to display the card row, and the `Rating` component to display the rating.

- Use MUI's `Pagination` and `Select` to implement pagination and row selection.

- Implement the "Create Course" button using MUI's `Button`.

- **Backend API**:

- `GET /api/course/search`:

- Parameters: `query` (matches `courseId`, `name`, `Instructor.firstName`, `lastName`, `email`), `page`, `limit`, `sort`.

- Return: Course list (including average rating and number of reviews).

 

### 2.7 Creating a Course

- **Function Description**:

- Any user can create courses.

- **Page Content**:

- Form fields (corresponding to the `Course` and `CourseDescription` tables):

- Course ID ( `courseId` ): Required, length ≥ 6 .

- Department (`departmentId`): Drop-down menu displays the `Department` table (`status = 'C'`).

- Course Name (`name`): Required, maximum 100 characters.

- Course description (`description`): Optional, text area.

- Credits: Required, range 0-6.

- Provides a "Submit" button.

- **Pre-submission checks:**

- Verify that `courseId` is unique (`status = 'C'`).

- If the course already exists, a modal window will be displayed with the message: "The same course number already exists!" and the following information will be provided:

- Link to course information page.

- Re-enter your options to retain your form data.

Submission successful. Saved to the `Course` and `CourseDescription` tables (`status = 'C'`). Navigate back to the search results page.

- **Front-end implementation**:

- Implement forms using MUI's `FormControl`, `TextField`, `Select`, and `TextArea`.

- Implement a modal using MUI's `Dialog`.

- Use `react-hook-form` to preserve form data.

- **Backend API**:

- `POST /api/course`: Create a course.

- `GET /api/department`: Retrieves the learning series table.

- `GET /api/course/check`: Checks if `courseId` exists.

 

### 2.8 Course Information

- **Function Description**:

- Displays detailed information about a specific course.

- **Page Content**:

- **Basic Course Information** (Course Table):

- Course ID (`courseId`)

- Course Name (`name`)

- Department (`Department.name`)

- Course Description (`CourseDescription.description`)

- Credits

- **Course Offering Information** (`CourseOffering`, `CourseOfferingInstructor`):

- Semester (`Semester.name`)

- Teacher (`Instructor.firstName`, `lastName`)

- **Review Statistics** (`Review` table, `status = 'C'`):

- Four average ratings (2 decimal places, using rating components):

- `contentRating`, `teachingRating`, `gradingRating`, `workloadRating`

- Total number of comments

- **Create Comment Button**:

- The "Create Review" button will appear. Clicking it will navigate to the course review creation page (with `courseId`, visible only to students with `accessLevel = 10000`).

- **Comment List**:

- Display course reviews (status = 'C', sorted in descending order by `createdAt`).

- Each comment displays:

- Semester (`Semester.name`)

- Four ratings (using a rating component)

- Comment content (`ReviewComment.comment`)

- Creation time (`createdAt`)

- Pagination control: 30 items per page, requesting the backend API.

- **Front-end implementation**:

- Use MUI's `Card` to display course information and statistics.

- Use MUI's `List` or `Card` to display the list of comments.

- Implement pagination using MUI's `Pagination`.

- Implement the "Create Comment" button using MUI's `Button`.

- **Backend API**:

- `GET /api/course/:courseId`: Retrieves course information.

- `GET /api/course/:courseId/offerings`: Retrieves course offering information.

- `GET /api/course/:courseId/reviews`: Retrieves the list and statistics of comments.

 

### 2.9 Create Course Review

- **Function Description**:

- Students (`accessLevel = 10000`) submit comments for the course.

- **Page Content**:

- Form fields (corresponding to the `Review` and `ReviewComment` tables):

- **Course (`courseId`): Auto-filled (cannot be modified), obtained from navigation parameters.

- **Semester (`semesterId`): The drop-down menu displays the `CourseOffering` (`status = 'C') for this course.

- **Teacher (`instructorId`):**

- Automatically displays the teachers associated with the selected `CourseOffering`.

- Provides a search area (by `Instructor.firstName`, `lastName`, `email`) to display a list of instructors/drop-down menus.

- A "Create Instructor" button is provided at the end of the list; clicking it will open a new page.

- Provides a "Refresh Teacher List" button to reload teacher data.

- **Rating** (integer, 0-10, using rating components):

- Course content rating: Provides a prompt asking, "How is the quality of the course content?"

- Teaching Rating: Provides a prompt asking, "How was the teacher's teaching performance?"

- Grading Rating: Provides a prompt asking, "Is the grading standard fair?"

- Workload Rating: Provides a prompt asking, "Is the course workload reasonable?"

- **Comment content (`comment`): Text area, optional, maximum 1000 characters. The backend checks whether it contains only blank spaces or meaningless characters.

- **Pre-submission checks:**

- The verification score is in the range of 0-10.

- Check if the user has submitted a comment on the `CourseOffering` (`userId`, `courseId`, `semesterId` are unique).

- If `CourseOffering` does not exist, it will be created automatically (the `CourseOffering` table will be inserted).

- If a comment already exists, a modal window will be displayed with the message: "You have already submitted a comment for this course!" and a link to the comment history page will be provided.

Submission successful. Saved to the `Review` and `ReviewComment` tables (`status = 'C'`). Navigate back to the course information page.

- **Front-end implementation**:

- Implement forms using MUI's `FormControl`, `Select`, `Rating`, and `TextArea`.

- Implement a modal using MUI's `Dialog`.

- Use MUI's `Button` to implement submit, create teacher, and refresh the teacher list.

- Use `react-hook-form` to manage form state.

- **Backend API**:

- `GET /api/course/:courseId/offerings`: Retrieves a list of courses offered.

- `GET /api/instructor/search`: Search for instructors.

- `POST /api/course-offering`: Creates `CourseOffering`.

- `POST /api/review`: Create a comment.

- `GET /api/review/check`: Check if a comment has been submitted.

 

### 2.10 Creating an Instructor

- **Function Description**:

- Any user can create teacher records (this could be restricted to administrators in the future).

- **Page Content**:

- Form fields (corresponding to the `Instructor` table):

- Name (`firstName`): Required, maximum 50 characters.

- Last Name: Required, maximum 50 characters.

- Email address (`email`): Optional, must conform to a regular expression.

- Department (`departmentId`): Drop-down menu displays the `Department` table (`status = 'C'`).

- Provides a "Submit" button.

- **Pre-submission checks:**

- Verify that `firstName` and `lastName` are not empty and meet the length requirement.

- If an `email` is provided, verify the format and check if it is unique.

- If `email` already exists, a modal will be displayed with the message: "This email address already exists!" and you will be allowed to re-enter it (the form data will be preserved).

Submission successful. Saved to the `Instructor` table (`status = 'C'`, `instructorId` generated by Snowflake). Navigate back to the Create Course Comments page.

- **Front-end implementation**:

- Implement forms using MUI's `FormControl`, `TextField`, and `Select`.

- Implement a modal using MUI's `Dialog`.

- Use `react-hook-form` to preserve form data.

- **Backend API**:

- `POST /api/instructor`: Creates a teacher.

- `GET /api/department`: Retrieves the learning series table.

- `GET /api/instructor/check`: Checks if `email` exists.

 

## 3. Non-functional requirements

- **Security**:

- Use JWT to verify user identity and restrict administrator functions (`accessLevel = 0`) and student functions (`accessLevel = 10000`).

- The registration verification email uses a secure link (with a one-time token).

- Only display data for `status = 'C'`.

- Use bcrypt to encrypt passwords and limit `loginFail` (> 5 account lockouts).

- The password must conform to the regular expression: `^(?=.*[az])(?=.*[AZ])(?=.*[!@#$%^&*]).{8,}$`.

- **Performance**:

- Pagination request limits the amount of data per page (10, 30, 50, 80, 100 rows).

- Optimize searches using database indexes (courseId, name, Instructor.email, etc.).

- The score calculation uses the SQL aggregate function (`AVG`).

- **Accessibility**:

- Supports keyboard navigation and complies with WCAG 2.1.

- The rating components and forms use high contrast and are compatible with dark/light modes.

- **Scalability**:

- Support for adding filtering criteria in the future (such as searching by semester).

- The form supports adding new fields (such as course type, teacher title).

 

## 4. User Interface Design

- **Top Navigation Bar:** Uses the MUI blue theme and is fixed at the top.

- **front page**:

- Not logged in: Login/registration form in the middle, wrapped with MUI `Card`.

- Logged in: The search box and sentence are centered, and the background is a light gradient.

- **Administrator Page**: Dark theme for sidebar, tables support sorting and filtering.

- **Rating component**: Uses MUI `Typography` and `Tooltip`, with dynamic backgrounds.

- **Search Results**: Card rows are adapted for mobile devices and scroll vertically.

- **Course Information**: Sections display information, statistics, and comments, with intuitive pagination.

- **Form Page**: Uses MUI `Grid` layout, with clear modal boxes.

 

## 5. Technical Implementation Details

- **front end**:

- Build an SPA using Vite + React (TypeScript).

- Use the MUI component library to ensure a consistent UI.

- Use `axios` to interact with the backend.

- Navigate using React Router.

- Use `react-hook-form` to manage forms.

- **rear end**:

- Build a RESTful API using Node.js + Express.

- Connect to MySQL using `mysql2`.

- Use `nodemailer` or a similar library to send verification emails.

- Use transactions to ensure data consistency.

- **Example of database query:**

- Search for courses and teachers:
```
SQL

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

- Registered users:
```
SQL
INSERT INTO User (userId, email, password, accessLevel, firstName, lastName, loginFail, createdAt, updatedAt)

VALUES (?, ?, ?, 10001, ?, ?, 0, NOW(), NOW());

```