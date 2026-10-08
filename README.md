# Monotask
A web app that helps students turn a messy list of assignments into an actionable study plan. It doesn't just display assignments; instead, it helps the student decide what to work on next.

Monotask is a full-stack web application designed to help students manage assignments without feeling overwhelmed by a long list of deadlines.

Instead of requiring students to manually decide what is most important, Monotask analyzes assignment information and provides recommendations based on factors such as the due date, workload, and assignment requirements.

The goal is simple:

Give students one clear thing to focus on next.
## Table of Contents
- [Features](#features)
  - [Assignment Management](#assignment-management)
  - [AI Assignment Analysis](#ai-assignment-analysis)
  - [Do This Next](#do-this-next)
  - [Gentle Plan](#gentle-plan)
  - [Current Streak](#current-streak)
  - [User Accounts](#user-accounts)
  - [Secure Password Management](#secure-password-management)
  - [Account Deletion](#account-deletion)
  - [Responsive Design](#responsive-design)
- [Tech Stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Database](#database)
  - [Authentication](#authentication)
  - [AI](#ai)
  - [File Processing](#file-processing)
  - [Email](#email)
- [Database Structure](#database-structure)
  - [Users](#users)
  - [Assignments](#assignments)
  - [Password Change Requests](#password-change-requests)
- [How Assignment Analysis Works](#how-assignment-analysis-works)
- [Authentication Flow](#authentication-flow)
  - [Signup](#signup)
  - [Login](#login)
  - [Session](#session)
- [Password Change Flow](#password-change-flow)
- [Email Verification](#email-verification)
- [Installation](#installation)
- [Development](#development)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-1)
  - [Profile](#profile)
  - [Assignments](#assignments-1)
  - [AI Analysis](#ai-analysis)
  - [Password](#password)
  - [Account](#account)
- [Design Philosophy](#design-philosophy)
- [Project Goals](#project-goals)
- [Current Limitation](#current-limitation)
- [Future Plans](#future-plans)
  - [Assignment Breakdown](#assignment-breakdown)
  - [Smarter Planning](#smarter-planning)
  - [Calendar Integration](#calendar-integration)
  - [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [What I Learned](#what-i-learned)
- [Author](#author)
- [License](#license)
# Features
### Assignment Management
- Add assignments with:
    - Assignment title
    - Course
    - Due date
    - Description (optional, used for AI analysis)
    - Assignment files (optional, used for AI analysis)
- View upcoming and active assignments, sorted by due date
- Mark assignments as completed
- View full assignment descriptions by clicking the description or the assignment name
- See daily progress with a progress bar
- Automatically organize assignments based on their status
- Completed assignments that are past due are hidden in the assignment lists, but still visible in the weekly plan.
- The past-due assignments that are not completed stay visible
### AI Assignment Analysis
Monotask analyzes assignment information using the OpenAI API. Users can provide assignment information through:
- Text descriptions
- PDF files
- DOCX files
- TXT files
- PowerPoint files
- Images (JPG and PNG)
The backend extracts the assignment content and sends relevant information to the AI for analysis.
The AI returns:
- Priority
- Reason for the priority
- Recommendation
- Estimated time

All four are saved with the assignment. Currently, the priority and reason are shown in the interface, while the recommendation and estimated time are stored for future use.

Example:
Priority: High priority
Reason: This assignment is due in 2 days and requires a significant amount of work.

Uploaded files are only used for analysis. Their text is extracted and sent to the AI, and the files themselves are not stored in the database.
### Do This Next
The dashboard highlights the assignment that should receive the student's attention first.
The assignment shown is the unfinished assignment with the earliest due date that is not past due. 
If several assignments are due on the same day, the "Not now" button cycles through them. 
The "Why this one?" box displays the AI's reason for the assignment's priority. 
Instead of presenting another overwhelming list, Monotask provides a simple action, "Finish assignment." This keeps the interface focused on the student's immediate next step.
### Gentle Plan 
Monotask also provides a weekly overview of upcoming work (Sunday through Saturday), with a progress ring showing how many of this week's assignments are completed.
Assignments that are not immediately urgent can remain visible without competing with the student's current priority.
The dashboard also includes a "Today at a Glance" card showing assignments due today, assignments due this week, and the next deadline.
#### My Plan and Calendar
The My Plan page gives students a simple view of what is coming up:
- This week and next week, grouped by day, with priority labels
- A monthly calendar showing assignment deadlines
  - Up to three assignments are shown per day, with a "+N more" button
  - Completed assignments are crossed out
  - Today is marked, with a fire icon when it is part of the current streak
- Clicking an assignment opens its full description
### Current Streak
Monotask includes an assignment-based streak system.
A successful day is based on completing assignments on time.
The system considers:
- Assignment due dates
- Completion status
- Completion dates
- Dates with no assignments
- Past incomplete assignments
Streak rules:
- A day with no assignments due counts as a successful day. 
- If an assignment is not completed on or before its due date, the streak restarts at 1 day. 
- New accounts begin with a 1 Day streak. 
Each user's streak start date is stored in their account, and the streak is calculated in the browser.
### User Accounts
Students can create individual accounts and keep their information separate.
Each account stores:
- Name
- Email
- School level
- Password
- Assignments
- Streak information
Students can update their name, email, and school level from their profile.
Authentication is handled using server-side sessions.
### Secure Password Management
Users can change their password through a verification process:
1. Enter the current password
2. Enter a new password
3. Confirm the new password
4. The browser checks that the new passwords match and are at least 8 characters
5. The server verifies the current password
6. Receive an email verification code (valid for 10 minutes)
7. Enter the verification code
8. Set the new password
The verification email is only sent after the current password is verified.
### Account Deletion
Users can permanently delete their account from their profile.
Deleting an account also removes its associated:
- Assignments
- Password change requests
- User session
The action requires confirmation before deletion.
### Responsive Design
Monotask is designed to work across different screen sizes.
The desktop layout uses a sidebar navigation system, while smaller screens transition to a mobile top navigation.
- The interface adapts the following for smaller screens:
    - Navigation
    - Dashboard cards
    - Modals
    - Forms
    - Assignment lists
    - Calendar
    - Profile settings
# Tech Stack
### Frontend
- HTML
- CSS
- JavaScript
- Responsive CSS
- Fetch API
### Backend
- Node.js
- Express.js
- dotenv
- cors
### Database
- SQLite
- better-sqlite3
### Authentication
- bcrypt
- express-session
### AI
- OpenAI API
### File Processing
Monotask uses different libraries depending on the uploaded file type:
- mammoth - DOCX text extraction
- pdf-parse - PDF text extraction
- pptx2json - PowerPoint text extraction
- multer - File uploads
### Email
- Nodemailer
- Gmail SMTP
# Database Structure
Monotask currently uses SQLite.
The database file, `monotask.db`, and its tables are created automatically the first time the server runs.
### Users
The users table stores account information:
- ID
- Name
- Email
- Password
- School level
- Streak start date
Passwords are stored as bcrypt hashes rather than plain text.
### Assignments
The assignments table stores student assignments:
- ID
- User ID
- Title
- Course
- Due date
- Description
- Priority
- Reason
- Recommendation
- Estimated minutes
- Completed
- Completed-at
Each assignment belongs to a specific user.
### Password Change Requests
The password change requests table temporarily stores verification codes used during password changes.
- ID
- User ID
- Code
- Expires-at
# How Assignment Analysis works
The AI assignment analysis process follow this general flow:
1. Student -> Assignment text / file / image
2. Frontend -> POST / api/analyze-assignment
3. Express Server
    -> Extract text from PDF
    -> Extract text from DOCX
    -> Extract text from PPTX
    -> Read TXT files
    -> Process images
    -> Calculate days until due
4. OpenAI API
5. Assignment Analysis
    -> Priority
    -> Reason
    -> Recommendation
    -> Estimated time
6. Frontend -> POST /api/assignments (saved in SQLite)
7. Student's Dashboard

The OpenAI API key is kept on the backend rather than being exposed in frontend JavaScript.
The due date is the main factor in the priority.
Assignments due today or tomorrow are always "High priority," assignments due within a week are at least "Medium priority," and a very large workload can raise the priority.
If the AI request fails, the assignment is still saved with the priority "AI unavailable."
# Authentication Flow
Monotask uses session-based authentication
### Signup
Signup Form -> POST /api/signup -> Validate information -> Hash password with bcrypt -> Create user in SQLite
### Login
Login Form -> POST /api/login -> Find user -> Compare password with bcrypt -> Create session -> User authenticated
### Session
The authenticated user's ID is stored in the sever-side session: req.session.userId

Authenticated API requests can then identify the current user through that session.
# Password Change Flow
Password changes use an additional email verification step.
1. Current Password + New Password + Confirm Password
2. Initial Validation in the browser
3. Verify Current Password -> POST /api/change-password/verify
4. Send Email Code (6 digits, expires in 10 minutes)
5. Enter Verification Code
6. Verify Code -> POST /api/change-password/confirm-code
7. The session is allowed to change the password for 10 minutes
8. Update Password -> POST /api/change-password/update

The new password is only changed after the verification process succeeds.
# Email Verification
- Monotask uses Gmail SMTP through Nodemailer to send password verification codes.
- Environment variables are used for email credentials.
- Example:
  - `EMAIL_USER=your-email@example.com`
  - `EMAIL_PASS=your-app-password`
Never commit actual credentials to GitHub.
# Installation
1. Clone the repository: `git clone https://github.com/SelinaH2134/Monotask.git`. Then enter the project directory: `cd Monotask`
2. Install dependencies: `npm install`
3. Create your environment file
- Create a .env file in the project root:
  - `OPENAI_API_KEY=your_openai_api_key `
  - `SESSION_SECRET=your_session_secret`
  - `EMAIL_USER=your_email`
  - `EMAIL_PASS=your_email_app_password`
- Replace the placeholder values with your own credentials.
4. Start the server: `node js/server.js`
- The application should start on http://localhost:3000
- Open the application in your browser
# Development
- During development, the application can be run locally with: `node js/server.js`
- After making backend changes, restart the server so the changes are loaded.
- Frontend changes can be viewed by refreshing the browser.
# API Endpoints
Some of the main backend endpoints include:
### Authentication
- POST /api/signup 
- POST /api/login 
- GET /api/me 
- POST /api/logout
### Profile
- PUT /api/profile
### Assignments
- GET /api/assignments 
- POST /api/assignments 
- PUT /api/assignments/:id 
- DELETE /api/assignments/:id
### AI Analysis
- POST /api/analyze-assignment
### Password
- POST /api/change-password/verify 
- POST /api/change-password/confirm-code 
- POST /api/change-password/update
### Account
- DELETE /api/account
# Design Philosophy
Monotask is designed around the idea of reducing cognitive overload. Many productivity applications present users with:
- Long task lists
- Multiple prorities
- Complex schedules
- Large calendars
- Numerous productivity metrics

Monotask takes a different approach.
The interface emphasizes on, "What should I work on right now?"
The dashboard therefore prioritizes a single actionable assignment while still providing access to the student's broader workload.
# Project Goals
The main goals of this project are to:
- Reduce student overwhelm
- Turn deadlines into actionable tasks
- Use AI to understand assignment requirements
- Automatically determine which assignments deserve attention
- Give students one clear next action
- Make assignment planning easier without requiring complicated manual scheduling
- Provide a personalized experience through user accounts
# Current Limitation
Monotask is still under development.
Some planned functionality is not yet fully implemented.
For example:
- AI-based assignment prioritization is still being integrated into the complete assignment workflow. Currently, "Do This Next" is chosen by due date, and the AI priority is only displayed.
- The AI recommendation and estimated time are saved but not shown in the interface yet.
- Priority is calculated once when an assignment is added, and it does not update as the due date gets closer.
- Assignments cannot be edited or deleted yet. Only their completion status can be changed.
- Only JPG and PNG images are supported.
- Only one file can be uploaded per assignment.
- AI-generated study plans are still being expanded.
- Deployment infrastructure has not yet been finalized.
- Production security and scalability still need additional work.
The current application is primarily intended as a development and portfolio project.
# Future Plans
### Assignment Breakdown
Large assignments could eventually be divided into smaller actionable steps.
For example:
- Research paper:
    - Choose topic
    - Find sources
    - Create outline
    - Write introduction
    - Write body paragraphs
    - Write conclusion
    - Review and submit
### Smarter Planning
Future versions may consider:
- Multiple upcoming deadlines
- Estimated assignment effort
- Student workload
- Available time
- Assignment dependencies
- Upcoming exams
- Existing commitments
to create a more personalized plan.
### Calendar Integration
Monotask already includes a calendar of assignment deadlines. A future version coulld allow students to visualize:
- Planned work
- Upcoming exams
- Study sessions
- Events synced from an external calendar
#### Editing and Deleting Assignments
Students could eventually edit or remove an assignment after adding it.
### Deployment
The project is intended to eventually be deployed so that students can access Monotask without running the application locally.
# Security Considerations
Monotask uses several security practices:
- Passwords are hashed using bcrypt.
- Authentication uses server-side sessions.
- Session cookies are configured as HTTP-only.
- API credentials are stored in environment variables.
- OpenAI API keys are never intended to be exposed to the frontend.
- Each user can only read and update their own assignments.
- Account deletion requires explicit confirmation.
- Password changes require the current password and an email verification code that expires after 10 minutes.
For production deployment, additional security improvements should be considered, including:
- HTTPS
- Secure production cookies
- A persisten session store (sessions currently use the default in-memory store)
- Requiring a SESSION_SECRET instead of falling back to a development secret
- CSRF protection and a stricter CORS configuration
- Rate limiting for login and verification-code attempts
- Storing verification codes securely and generating them with a cryptographically secure method
- Requiring login for /api/analyze-assignment
- Stronger input validation, including email and password rules at signup
- Escaping assignment text before displaying it in the interface
- File upload restrictions and file size limits
- Deleting uploaded files after they are analyzed
- Serving only the client files (html, css, and js) as static files
- Production database configuration
- Secure secret management
# What I Learned
Building Monotask has provided experience with full-stack web development, including:
- Designing a responsive user interface
- Building frontend interactions with JavaScript
- Creating REST-style API endpoints
- Working with Node.js and Express
- Using SQLite databases
- Implementing authentication
- Hashing passwords with bcrypt
- Managing sessions
- Processing uploaded files
- Working with AI APIs
- Sending verification emails
- Designing database relationships
- Handling asynchronous requests
- Building responsive layouts
- Debugging frontend/backend integration
The project also provided experience thinking about software from the perspective of the user rather than only the implementation.
# Author
Selina Ho
- Monotask was created as a personal full-stack web development project focused on combining web development, artificial intelligence, and student productivity.
# License
This project is currently intended as a personal/portfolio project. A formal open-source license may be added in the future.
