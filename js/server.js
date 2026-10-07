require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const bcrypt = require("bcrypt");
const session = require("express-session");

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "monotask.db");
const db = new Database(dbPath);

const nodemailer = require("nodemailer");

const emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

emailTransporter.verify(function (error) {
    if (error) {
        console.error("Gmail connection failed:", error.message);
    } else {
        console.log("Gmail connection successful.");
    }
});

console.log("SQLite database connected.");

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        school_level TEXT
    )
`).run();

try {
    db.prepare(`
        ALTER TABLE users
        ADD COLUMN school_level TEXT
    `).run();
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}

try {
    db.prepare(`
        ALTER TABLE users
        ADD COLUMN streak_start_date TEXT
    `).run();
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}

db.prepare(`
    CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        course TEXT,
        due_date TEXT,
        description TEXT,
        priority TEXT,
        reason TEXT,
        recommendation TEXT,
        estimated_minutes INTEGER,
        completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS password_change_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`).run();

try {
    db.prepare(`
        ALTER TABLE assignments
        ADD COLUMN completed_at TEXT
    `).run();
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}

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

app.use(session({
    secret: process.env.SESSION_SECRET || "monotask-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/html/index.html");
});

const upload = multer({ dest: "uploads/" });

/* Test Server */
app.get("/api/test", function (req, res) {
    res.json({
        message: "Monotask backend is working!"
    });
});

/* SignUp */
app.post("/api/signup", async function (req, res) {

    const { name, email, password, schoolLevel } = req.body;

    if (!name || !email || !password || !schoolLevel) {
        return res.status(400).json({
            message: "Please complete all fields."
        });
    }

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Please fill in all fields."
        });
    }

    const existingUser = db.prepare(`
        SELECT id FROM users WHERE email = ?
    `).get(email);

    if (existingUser) {
        return res.status(409).json({
            message: "An account with this email already exists."
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
        id: Date.now().toString(),
        name: name,
        email: email,
        passwordHash: passwordHash
    };

    db.prepare(`
        INSERT INTO users (
            id,
            name,
            email,
            password,
            school_level,
            streak_start_date
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        user.id,
        user.name,
        user.email,
        user.passwordHash,
        schoolLevel || "",
        new Date().toISOString().split("T")[0]
    );

    res.status(201).json({
        message: "Account created successfully."
    });

});

/* LogIn */
app.post("/api/login", async function (req, res) {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Please enter your email and password."
        });
    }

    const user = db.prepare(`
        SELECT id, name, email, password
        FROM users
        WHERE email = ?
    `).get(email);

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatches) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    req.session.userId = user.id;

    res.json({
        message: "Login successful.",
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    });

});

/* LogOut */
app.post("/api/logout", function (req, res) {
    req.session.destroy(function (error) {
        if (error) {
            return res.status(500).json({
                message: "Could not log out."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful."
        });
    });
});

/* User Account */
app.get("/api/me", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const user = db.prepare(`
        SELECT
            id,
            name,
            email,
            school_level AS schoolLevel,
            streak_start_date AS streakStartDate
        FROM users
        WHERE id = ?
    `).get(req.session.userId);

    if (!user) {
        return res.status(401).json({
            message: "User not found."
        });
    }

    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        schoolLevel: user.schoolLevel,
        streakStartDate: user.streakStartDate
    });
});

/* Update User Profile */
app.put("/api/profile", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const { name, email, schoolLevel } = req.body;

    if (!name || !email || !schoolLevel) {
        return res.status(400).json({
            message: "Please complete all profile fields."
        });
    }

    const existingUser = db.prepare(`
        SELECT id
        FROM users
        WHERE email = ? AND id != ?
    `).get(email, req.session.userId);

    if (existingUser) {
        return res.status(409).json({
            message: "An account with this email already exists."
        });
    }

    db.prepare(`
        UPDATE users
        SET name = ?,
            email = ?,
            school_level = ?
        WHERE id = ?
    `).run(
        name,
        email,
        schoolLevel,
        req.session.userId
    );

    res.json({
        message: "Profile updated successfully."
    });
});

/* Delete the Account */
app.delete("/api/account", function (req, res) {

    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const userId = req.session.userId;

    try {

        // Delete the user's assignments
        db.prepare(`
            DELETE FROM assignments
            WHERE user_id = ?
        `).run(userId);


        // Delete password-change requests
        db.prepare(`
            DELETE FROM password_change_requests
            WHERE user_id = ?
        `).run(userId);


        // Delete the user account
        const result = db.prepare(`
            DELETE FROM users
            WHERE id = ?
        `).run(userId);


        if (result.changes === 0) {
            return res.status(404).json({
                message: "Account not found."
            });
        }


        // Destroy the login session
        req.session.destroy(function (error) {

            if (error) {
                console.error("Error destroying session:", error);

                return res.status(500).json({
                    message: "Account was deleted, but the session could not be cleared."
                });
            }

            res.clearCookie("connect.sid");

            res.json({
                message: "Account deleted successfully."
            });
        });

    } catch (error) {

        console.error("Delete account error:", error);

        res.status(500).json({
            message: "Unable to delete account."
        });
    }
});

/* Verify Current Password and Send Verification Code */
app.post("/api/change-password/verify", async function (req, res) {

    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const { currentPassword } = req.body;

    if (!currentPassword) {
        return res.status(400).json({
            message: "Please enter your current password."
        });
    }

    const user = db.prepare(`
        SELECT id, email, password
        FROM users
        WHERE id = ?
    `).get(req.session.userId);

    if (!user) {
        return res.status(401).json({
            message: "User not found."
        });
    }

    const passwordMatches = await bcrypt.compare(
        currentPassword,
        user.password
    );

    if (!passwordMatches) {
        return res.status(401).json({
            message: "Current password is incorrect."
        });
    }

    const code = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    const requestId = Date.now().toString();

    const expiresAt = new Date(
        Date.now() + 10 * 60 * 1000
    ).toISOString();

    db.prepare(`
        DELETE FROM password_change_requests
        WHERE user_id = ?
    `).run(req.session.userId);

    db.prepare(`
        INSERT INTO password_change_requests (
            id,
            user_id,
            code,
            expires_at
        )
        VALUES (?, ?, ?, ?)
    `).run(
        requestId,
        req.session.userId,
        code,
        expiresAt
    );

    try {
        await emailTransporter.sendMail({
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: "Monotask password change verification",
            text: `Your Monotask verification code is ${code}. This code expires in 10 minutes.`
        });

        res.json({
            message: "Verification code sent to your email."
        });

    } catch (error) {
        console.error(
            "Could not send verification email:",
            error
        );

        db.prepare(`
            DELETE FROM password_change_requests
            WHERE id = ?
        `).run(requestId);

        res.status(500).json({
            message: "Could not send the verification email."
        });
    }
});

/* Get the assignments */
app.get("/api/assignments", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const assignments = db.prepare(`
        SELECT
            id,
            title,
            course,
            due_date AS dueDate,
            description,
            priority,
            reason,
            recommendation,
            estimated_minutes AS estimatedMinutes,
            completed_at AS completedAt,
            completed
        FROM assignments
        WHERE user_id = ?
        ORDER BY due_date ASC
    `).all(req.session.userId);

    const formattedAssignments = assignments.map(function (assignment) {
        return {
            id: assignment.id,
            title: assignment.title,
            course: assignment.course,
            dueDate: assignment.dueDate,
            description: assignment.description,
            priority: assignment.priority,
            aiReason: assignment.reason,
            recommendation: assignment.recommendation,
            estimatedMinutes: assignment.estimatedMinutes,
            completedAt: assignment.completedAt,
            completed: Boolean(assignment.completed)
        };
    });

    res.json(formattedAssignments);
});

/* Update Password */
app.post("/api/change-password/update", async function (req, res) {

    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }


    /*
     * Make sure the email verification
     * was completed recently.
     */

    if (
        !req.session.passwordChangeVerifiedUntil ||
        Date.now() > req.session.passwordChangeVerifiedUntil
    ) {

        return res.status(403).json({
            message: "Please verify your email code first."
        });

    }


    const { newPassword } = req.body;


    if (!newPassword) {
        return res.status(400).json({
            message: "Please enter a new password."
        });
    }


    /*
     * Prevent extremely short passwords.
     */

    if (newPassword.length < 8) {
        return res.status(400).json({
            message: "Your new password must be at least 8 characters."
        });
    }


    try {

        /*
         * Hash the new password.
         */

        const passwordHash =
            await bcrypt.hash(newPassword, 10);


        /*
         * Update the user's password.
         */

        db.prepare(`
            UPDATE users
            SET password = ?
            WHERE id = ?
        `).run(
            passwordHash,
            req.session.userId
        );


        /*
         * Remove the temporary permission.
         */

        delete req.session.passwordChangeVerifiedUntil;


        res.json({
            message: "Password changed successfully."
        });


    } catch (error) {

        console.error(
            "Password update failed:",
            error
        );

        res.status(500).json({
            message: "Could not change your password."
        });

    }

});

/* Verify Password Change Code */
app.post("/api/change-password/confirm-code", function (req, res) {

    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            message: "Please enter the verification code."
        });
    }

    const request = db.prepare(`
        SELECT id, code, expires_at
        FROM password_change_requests
        WHERE user_id = ?
        ORDER BY expires_at DESC
        LIMIT 1
    `).get(req.session.userId);

    if (!request) {
        return res.status(400).json({
            message: "No verification code was found."
        });
    }

    const now = new Date();
    const expiresAt = new Date(request.expires_at);

    if (now > expiresAt) {

        db.prepare(`
            DELETE FROM password_change_requests
            WHERE id = ?
        `).run(request.id);

        return res.status(400).json({
            message: "This verification code has expired."
        });
    }

    if (code !== request.code) {
        return res.status(400).json({
            message: "The verification code is incorrect."
        });
    }

    /*
     * The code is correct.
     *
     * Give this session permission to change
     * the password for a short amount of time.
     */

    req.session.passwordChangeVerifiedUntil =
        Date.now() + (10 * 60 * 1000);


    /*
     * The code has now been used,
     * so delete it.
     */

    db.prepare(`
        DELETE FROM password_change_requests
        WHERE id = ?
    `).run(request.id);


    res.json({
        message: "Verification successful."
    });

});

/* Save assignments to the storage */
app.post("/api/assignments", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const assignment = req.body;

    const assignmentId =
        assignment.id || Date.now().toString();

    db.prepare(`
        INSERT INTO assignments (
            id,
            user_id,
            title,
            course,
            due_date,
            description,
            priority,
            reason,
            recommendation,
            estimated_minutes,
            completed,
            completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        assignmentId,
        req.session.userId,
        assignment.title,
        assignment.course || "",
        assignment.dueDate || "",
        assignment.description || "",
        assignment.priority || "",
        assignment.aiReason || "",
        assignment.recommendation || "",
        assignment.estimatedMinutes || null,
        assignment.completed ? 1 : 0,
        assignment.completedAt || null
    );

    res.status(201).json({
        ...assignment,
        id: assignmentId
    });
});

/* Assignments */
app.put("/api/assignments/:id", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const { completed, completedAt } = req.body;

    const result = db.prepare(`
        UPDATE assignments
        SET completed = ?, completed_at = ?
        WHERE id = ? AND user_id = ?
    `).run(
        completed ? 1 : 0,
        completedAt || null,
        req.params.id,
        req.session.userId
    );

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Assignment not found."
        });
    }

    res.json({
        message: "Assignment updated successfully."
    });
});

/* Streaks */
app.put("/api/streak", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in."
        });
    }

    const { streakStartDate } = req.body;

    db.prepare(`
        UPDATE users
        SET streak_start_date = ?
        WHERE id = ?
    `).run(
        streakStartDate || null,
        req.session.userId
    );

    res.json({
        message: "Streak updated successfully."
    });
});

/* AI Analyze Assignment */
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