const express = require("express");

const app = express();

const PORT = 3000;

app.use(express.json());

app.get("/api/test", function (req, res) {
    res.json({
        message: "Monotask backend is working!"
    });
});

app.post("/api/analyze-assignment", function (req, res) {
    const assignment = req.body;

    console.log("Received assignment:", assignment);

    res.json({
        priority: "High priority",
        reason: "This assignment is due soon and should be worked on next.",
        recommendation: "Start working on this assignment.",
        estimatedMinutes: 90
    });
});

app.listen(PORT, function () {
    console.log(`Monotask server running at http://localhost:${PORT}`);
});