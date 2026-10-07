# Monotask
A web app that helps students turn a messy list of assignments into an actionable study plan. It doesn't just display assignments; instead, it helps the student decide what to work on next.

Monotask is a full-stack web application designed to help students manage assignments without feeling overwhelmed by a long list of deadlines.

Instead of requiring students to manually decide what is most important, Monotask analyzes assignment information and provides recommendations based on factors such as the due date, workload, and assignment requirements.

The goal is simple:

Give students one clear thing to focus on next.

# Features
### Assignment Management
- Add assignments with:
    - Assignment title
    - Course
    - Due date
    - Description
    - Assignment files
- View upcoming and active assignments
- Mark assignments as completed
- View full assignment descriptions
- Automatically organize assignments based on their status
### AI Assignment Analysis
Monotask can analyze assignment information using the OpenAI API.
Users can provide assignment information through:
- Text descriptions
- PDF files
- DOCX files
- TXT files
- PowerPoint files
- Images
The backend extracts the assignment content and sends relevant information to the AI for analysis.
The AI can return:
- Priority
- Reason for the priority

Example:
Priority: High priority
Reason: This assignment is due in 2 days and requires a significant amount of work.
### Do This Next
