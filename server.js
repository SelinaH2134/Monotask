require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

/* Files Reader Install */
const multer = require("multer");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const pptx2json = require("pptx2json");

const app = express();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static("."));

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/html/index.html");
});

const upload = multer({ dest: "uploads/" });

app.get("/api/test", function (req, res) {
    res.json({
        message: "Monotask backend is working!"
    });
});

app.post("/api/analyze-assignment", upload.single("file"), async function(req, res) {
    const assignment = req.body;

    console.log("Received assignment:", assignment);
    console.log("Received file:", req.file);
    
    let fileText = "";

    let imageData = null;

    if (req.file) {
        if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({
                path: req.file.path
            });

            fileText = result.value;
        } 
        
        else if (req.file.mimetype === "application/pdf") {
            const pdfBuffer = require("fs").readFileSync(req.file.path);

            const parser = new PDFParse({
                data: pdfBuffer
            });

            const result = await parser.getText();

            fileText = result.text;

            await parser.destroy();
        }

        else if (req.file.mimetype === "text/plain") {
            const fs = require("fs");

            fileText = fs.readFileSync(req.file.path, "utf8");
        }

        else if (req.file.mimetype === "image/jpeg" || req.file.mimetype === "image/png") {
            const fs = require("fs");

            const imageBuffer = fs.readFileSync(req.file.path);

            imageData = imageBuffer.toString("base64");
        }

        else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
            const fs = require("fs");

            const pptxBuffer = fs.readFileSync(req.file.path);

            const presentation = new pptx2json();

            const result = await presentation.buffer2json(pptxBuffer);

            const textParts = [];

            function collectText(value) {
                if (Array.isArray(value)) {
                    for (const item of value) {
                        collectText(item);
                    }
                    return;
                }

                if (value && typeof value === "object") {
                    if (Array.isArray(value["a:t"])) {
                        for (const text of value["a:t"]) {
                            textParts.push(text);
                        }
                    }

                    for (const key of Object.keys(value)) {
                        collectText(value[key]);
                    }
                }
            }

            collectText(result);

            fileText = textParts.join("\n");
        }

        console.log("Extracted file text:", fileText);
    }

    const today = new Date();

    const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const [year, month, day] = assignment.dueDate.split("-");

    const dueDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    const daysUntilDue = Math.round(
        (dueDate - todayDate) / (1000 * 60 * 60 * 24)
    );

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
                    - Uploaded file text, if provided

                    If uploaded file text is provided:
                    - Use it to understand the actual assignment requirements.
                    - Use specific requirements from the file when determining the recommendation.
                    - Use the apparent workload in the file when estimating the time required.
                    - Do not invent requirements that are not present in the file.
                    - If the file text conflicts with the user's description, use the assignment file as the primary source for understanding the requirements.

                    PRIORITY RULES:

                    The due date is the primary factor in determining priority.

                    You MUST follow these rules:

                    - daysUntilDue <= 0:
                    Priority MUST be "High priority".

                    - daysUntilDue === 1:
                    Priority MUST be "High priority".

                    - daysUntilDue >= 2 AND daysUntilDue <= 3:
                    Priority MUST be "Medium priority", unless the assignment clearly has a very large workload or unusually difficult requirements. In that case, use "High priority".

                    - daysUntilDue >= 4 AND daysUntilDue <= 7:
                    Priority MUST be "Medium priority", unless the assignment clearly has a very large workload or unusually difficult requirements. In that case, use "High priority".

                    - daysUntilDue > 7:
                    Priority MUST be "Low priority", unless the assignment clearly has a very large workload or unusually difficult requirements. In that case, use "Medium priority".

                    IMPORTANT:
                    - daysUntilDue is authoritative.
                    - Never choose "Low priority" when daysUntilDue <= 7.
                    - Never choose "Medium priority" when daysUntilDue <= 1.
                    - Never choose "Low priority" when daysUntilDue <= 1.
                    - A large workload may increase priority when the assignment is clearly substantial or unusually difficult.
                    - Do not lower priority because the assignment seems easy.
                    - Do not use the course name to determine priority.

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
                    content: [
                        {
                            type: "input_text",
                            text: JSON.stringify({
                                title: assignment.title,
                                course: assignment.course,
                                dueDate: assignment.dueDate,
                                daysUntilDue: daysUntilDue,
                                description: assignment.description,
                                fileText: fileText
                            })
                        },

                        ...(imageData
                            ? [
                                {
                                    type: "input_image",
                                    image_url: `data:${req.file.mimetype};base64,${imageData}`
                                }
                            ]
                            : [])
                    ]
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