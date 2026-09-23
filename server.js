require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const PORT = 3000;

app.use(express.json());
app.use(cors());

app.get("/api/test", function (req, res) {
    res.json({
        message: "Monotask backend is working!"
    });
});

app.post("/api/analyze-assignment", async function (req, res) {
    const assignment = req.body;

    console.log("Received assignment:", assignment);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(assignment.dueDate + "T00:00:00");
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    console.log("Days until due:", daysUntilDue);

    try {
        const response = await openai.responses.create({
            model: "gpt-5.6-luna",
            input: [
                {
                    role: "developer",
                    content: `
                    You are the AI planning assistant for Monotask, a college student productivity app.

                    Your job is to analyze an assignment and help the student decide what to work on next.

                    Use the assignment information provided by the user, especially:
                    - Current date
                    - Due date
                    - Days until due
                    - Assignment description
                    - Course
                    - Assignment title

                    PRIORITY RULES:

                    You MUST follow these priority rules exactly.

                    - daysUntilDue <= 0:
                    Priority MUST be "High priority".

                    - daysUntilDue === 1:
                    Priority MUST be "High priority".

                    - daysUntilDue >= 2 AND daysUntilDue <= 3:
                    Priority MUST be "Medium priority", unless the assignment clearly has a very large workload or unusually difficult requirements. In that case, use "High priority".

                    - daysUntilDue >= 4 AND daysUntilDue <= 7:
                    Priority MUST be "Medium priority".

                    - daysUntilDue > 7:
                    Priority MUST be "Low priority", unless the assignment clearly has a very large workload or unusually difficult requirements. In that case, use "Medium priority".

                    IMPORTANT:
                    - The value of daysUntilDue is authoritative.
                    - Do not ignore or reinterpret daysUntilDue.
                    - Do not choose Medium priority for an assignment due today or tomorrow.
                    - Do not choose Low priority for an assignment due today or tomorrow.
                    - The priority must agree with the due date.
                    - The student's deadline is more important than the course name.

                    RECOMMENDATION RULES:

                    The recommendation should be a specific action the student can take RIGHT NOW.

                    For an assignment due today:
                    - Tell the student to work on it now.
                    - If the description contains specific tasks, identify the first task.
                    - If the description is vague, recommend opening the assignment requirements and starting the first required component.

                    For an assignment due tomorrow:
                    - Tell the student to begin it now and identify the first useful step.

                    For assignments with specific tasks:
                    - Base the recommendation on those tasks.
                    - Do not give generic advice when the description provides enough information to be specific.

                    Examples of good recommendations:
                    - "Start the Queue Project now by reviewing the requirements and completing the first required queue operation."
                    - "Begin the essay by choosing your topic and creating a thesis statement."
                    - "Complete problems 1–3 first, then continue with the remaining problems."
                    - "Open the lab instructions and begin the required calculations."

                    Examples of bad recommendations:
                    - "Review the assignment."
                    - "Start working on this assignment."
                    - "Make progress on the assignment."
                    - "You have plenty of time."
                    - "Plan your time accordingly."

                    ESTIMATED TIME:

                    Estimate the number of minutes needed to complete the assignment based on the apparent workload.

                    Do not automatically use 60 or 90 minutes.
                    Do not invent detailed requirements that were not provided.

                    Return ONLY valid JSON in this exact format:

                    {
                        "priority": "High priority",
                        "reason": "This assignment is due today and should be worked on now.",
                        "recommendation": "Start by reviewing the assignment requirements and completing the first required task.",
                        "estimatedMinutes": 90
                    }
                    `
                },
                {
                    role: "user",
                    content: JSON.stringify({
                    title: assignment.title,
                    course: assignment.course,
                    dueDate: assignment.dueDate,
                    daysUntilDue: daysUntilDue,
                    description: assignment.description
                })
                }
            ]
        });

        const aiResult = JSON.parse(response.output_text);

        res.json(aiResult);

    } catch (error) {
        console.error("AI analysis failed:", error);

        res.status(500).json({
            priority: "AI unavailable",
            reason: "AI analysis could not be completed.",
            recommendation: "You can still work on this assignment manually.",
            estimatedMinutes: null
        });
    }
});

app.listen(PORT, function () {
    console.log(`Monotask server running at http://localhost:${PORT}`);
});