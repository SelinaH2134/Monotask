let assignments = [];

let nextTaskQueue = [];

let streakStartDate = null;

const addAssignmentButton = document.getElementById("addAssignmentButton");

const assignmentModal = document.getElementById("assignmentModal");

const closeAssignmentModal = document.getElementById("closeAssignmentModal");

const cancelAssignment = document.getElementById("cancelAssignment");

const assignmentForm = document.getElementById("assignmentForm");

const taskList = document.getElementById("taskList");

const planList = document.getElementById("planList");

const dailyProgressText = document.getElementById("dailyProgressText");

const dailyProgressBar = document.getElementById("dailyProgressBar");

const dailyProgressPercent = document.getElementById("dailyProgressPercent");

const weeklyProgress = document.getElementById("weeklyProgress");

const sessionsPlanned = document.getElementById("sessionsPlanned");

const finishNextTask = document.getElementById("finishNextTask");

const skipNextTask = document.getElementById("skipNextTask");

const nextTaskTitle = document.getElementById("nextTaskTitle");

const nextTaskCourse = document.getElementById("nextTaskCourse");

const nextTaskDue = document.getElementById("nextTaskDue");

const whyTaskText = document.getElementById("whyTaskText");

// Finish assignment
finishNextTask.addEventListener("click", function () {
    const nextTask = nextTaskQueue[0];

    if (!nextTask) {
        return;
    }

    nextTask.completed = true;
    nextTask.completedAt = new Date().toISOString();

    if (!streakStartDate) {
        streakStartDate = getTodayDateString();
        saveStreakStartDate();
    }
    

    /* Remove the completed assignment from the queue */
    nextTaskQueue = nextTaskQueue.filter(function (assignment) {
        return assignment.id !== nextTask.id;
    });

    saveAssignments();
    sortAssignments();
    updateGentlePlan();
    updateNextTask();
    updateDailyProgress();
    updateStreak();
});

// Skip next task
skipNextTask.addEventListener("click", function () {
    if (nextTaskQueue.length <= 1) {
        return;
    }

    /* Move the current assignment to the back of the current due-date queue */
    const skippedTask = nextTaskQueue.shift();

    nextTaskQueue.push(skippedTask);

    updateNextTask();
});

// Load Saved Assignments
const savedAssignments = localStorage.getItem("monotaskAssignments");

if (savedAssignments) {

    assignments = JSON.parse(savedAssignments);
    sortAssignments();

}

const savedStreakStartDate = localStorage.getItem("monotaskStreakStartDate");

if (savedStreakStartDate) {
    streakStartDate = savedStreakStartDate;
}

// Call the function
updateGentlePlan();
updateNextTask();
updateDailyProgress();
updateGreeting();
updateStreak();
updateCurrentDate();

// Open Modal
addAssignmentButton.addEventListener("click", function() {
    assignmentModal.classList.add("active");
});


// Close Modal
closeAssignmentModal.addEventListener("click", function() {
    assignmentModal.classList.remove("active");
});


// Cancel Button
cancelAssignment.addEventListener("click", function() {
    assignmentModal.classList.remove("active");
});

// Add to the List
assignmentForm.addEventListener("submit", async  function(event) {

    // Stop the page from refreshing
    event.preventDefault();

    // Get information from the form
    const title = document.getElementById("assignmentTitle").value.trim();

    const course = document.getElementById("assignmentClass").value.trim();

    const dueDate = document.getElementById("assignmentDueDate").value;

    const description = document.getElementById("assignmentDescription").value.trim();


    // Create an assignment object
    const assignment = {

        id: Date.now(),
        title: title,
        course: course,
        dueDate: dueDate,
        description: description,

        completed: false,
        completedAt: null,

        // AI recommendation data
        priority: "Analyzing...",
        aiReason: "",
        recommendation: "",
        estimatedMinutes: null

    };

    try {
        const response = await fetch("http://localhost:3000/api/analyze-assignment", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(assignment)
        });

        const aiResult = await response.json();

        assignment.priority = aiResult.priority;
        assignment.aiReason = aiResult.reason;
        assignment.recommendation = aiResult.recommendation;
        assignment.estimatedMinutes = aiResult.estimatedMinutes;

    } catch (error) {
        console.error("AI analysis failed:", error);
    }

    // Add assignment to array
    assignments.push(assignment);

    saveAssignments();

    // Sort and display assignment
    sortAssignments();
    updateGentlePlan();
    updateNextTask();
    updateDailyProgress();
    updateStreak();
    console.log("New assignment:", assignment);

    // Clear the form 
    assignmentForm.reset();

    // Close modal
    assignmentModal.classList.remove("active");

});

/* Display Assignment Function */
function addAssignmentToListWithoutSorting(assignment) {

    const taskItem = document.createElement("div");

    taskItem.classList.add("task-list-item");

    taskItem.innerHTML = `

        <input type="checkbox" class="task-checkbox" aria-label="Mark assignment complete" ${assignment.completed ? "checked" : ""}>

        <div class="task-list-info">
            <h3>${assignment.title}</h3>

            <p>${assignment.course || "No class"}</p>
        </div>

        <div class="task-list-due">
            <p>Due ${formatDueDate(assignment.dueDate)}</p>

            <span class="priority">${assignment.priority}</span>
        </div>

    `;

    taskList.appendChild(taskItem);

    // Show completed styling
    if (assignment.completed) {
        taskItem.classList.add("completed");
    }

    // Checkbox
    const checkbox = taskItem.querySelector(".task-checkbox");

    checkbox.addEventListener("change", function () {

        assignment.completed = checkbox.checked;

        if (checkbox.checked) {
            assignment.completedAt = new Date().toISOString();

            if (!streakStartDate) {
                streakStartDate = getTodayDateString();
                saveStreakStartDate();
            }
        } 
        
        else {
            assignment.completedAt = null;
        }

        taskItem.classList.toggle(
            "completed",
            assignment.completed
        );

        saveAssignments();
        sortAssignments();
        updateGentlePlan();
        updateNextTask();
        updateDailyProgress();
        updateStreak();

    });

}

/* Format Date Function */
function formatDueDate(dateString) {

    if (!dateString) {
        return "No date";
    }

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-US", {

        month: "short",
        day: "numeric",
        year: "numeric"

    });

}

/* Save Assignments Function */
function saveAssignments() {

    localStorage.setItem("monotaskAssignments", JSON.stringify(assignments));

}

/* Save Streak Function */
function saveStreakStartDate() {
    if (streakStartDate) {
        localStorage.setItem("monotaskStreakStartDate", streakStartDate);
    } 
    
    else {
        localStorage.removeItem("monotaskStreakStartDate");
    }
}

/* Check if Due Date has Passed Function */
function isPastDue(dateString) {

    if (!dateString) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString + "T00:00:00");
    return dueDate < today;
}

/* The current week from Sunday through Saturday */
function isThisWeek(dateString) {

    if (!dateString) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(dateString + "T00:00:00");

    const dayOfWeek = today.getDay();

    const startOfWeek = new Date(today);
    startOfWeek.setDate(
        today.getDate() - dayOfWeek
    );

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(
        startOfWeek.getDate() + 6
    );

    return date >= startOfWeek && date <= endOfWeek;
}

/* Calculate the Priority Level Function */
function calculatePriority(dueDate) {

    if (!dueDate) {
        return "Low priority";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate + "T00:00:00");

    const difference = due - today;

    const daysUntilDue = Math.ceil( difference / (1000 * 60 * 60 * 24) );

    if (daysUntilDue <= 1) {
        return "High priority";
    }

    if (daysUntilDue <= 3) {
        return "Medium priority";
    }

    return "Low priority";
}

/* Sort the Assignment's Priority Level Function */
function sortAssignments() {

    assignments.sort(function(a, b) {

        // Completed assignments go to the bottom
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }

        // Compare due dates
        const dateA = new Date(a.dueDate + "T00:00:00");
        const dateB = new Date(b.dueDate + "T00:00:00");
        return dateA - dateB;
    });

    // Clear current task list
    taskList.innerHTML = "";

    // Display assignments in sorted order
    assignments.forEach(function (assignment) {

        if (!isPastDue(assignment.dueDate)) {
            addAssignmentToListWithoutSorting(assignment);
        }

    });
}

/* Gentle Plan Function */
function updateGentlePlan() {

    planList.innerHTML = "";

    const weeklyAssignments = assignments.filter(function (assignment) {
        return !isPastDue(assignment.dueDate) && isThisWeek(assignment.dueDate);
    });

    if (weeklyAssignments.length === 0) {

        planList.innerHTML = `<p class="muted-text">No upcoming assignments. You're all caught up!</p>`;

        weeklyProgress.textContent = "0/0";
        sessionsPlanned.textContent = "0 assignments";

        return;
    }

    weeklyAssignments.forEach(function (assignment) {

        const planItem = document.createElement("div");

        planItem.classList.add("plan-item");

        if (assignment.completed) {
            planItem.classList.add("completed");
        }

        const dueDate = new Date(assignment.dueDate + "T00:00:00");

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);

        tomorrow.setDate(today.getDate() + 1);

        let day;
        let date;

        if (dueDate.getTime() === today.getTime()) {

            day = "TODAY";
            date = dueDate.getDate();

        } 
        
        else if (dueDate.getTime() === tomorrow.getTime()) {

            day = "TOMOR";
            date = dueDate.getDate();

        } 
        
        else {

            day = dueDate.toLocaleDateString("en-US", {
                weekday: "short"
            });

            date = dueDate.getDate();
        }

        planItem.innerHTML = `
            <div class="plan-day">
                <span>${day}</span>
                <strong>${date}</strong>
            </div>

            <div class="plan-info">
                <h3>${assignment.title}</h3>
                <p>${assignment.priority}</p>
            </div>

            <span class="plan-status">Planned</span>
        `;

        planList.appendChild(planItem);
    });

    const completedCount = weeklyAssignments.filter(function (assignment) {
        return assignment.completed;
    }).length;

    weeklyProgress.textContent = `${completedCount}/${weeklyAssignments.length}`;

    const progressPercentage = weeklyAssignments.length === 0 ? 0 : (completedCount / weeklyAssignments.length) * 100;

    weeklyProgress.style.setProperty(
        "--progress",
        `${progressPercentage}%`
    );

    sessionsPlanned.textContent = `${weeklyAssignments.length} assignments`;
}

/* Update the Next Task Function */
function updateNextTask() {
    const availableTasks = assignments.filter(function (assignment) {
        return !assignment.completed && !isPastDue(assignment.dueDate);
    });

    if (availableTasks.length === 0) {
        nextTaskQueue = [];

        nextTaskTitle.textContent = "You're all caught up!";
        nextTaskCourse.textContent = "";
        nextTaskDue.textContent = "";
        whyTaskText.textContent = "You have no upcoming assignments.";

        skipNextTask.disabled = true;

        return;
    }

    // Find the earliest due date among unfinished assignments
    const earliestDueDate = availableTasks.reduce(function (earliest, assignment) {
        if (!earliest) {
            return assignment.dueDate;
        }

        return assignment.dueDate < earliest ? assignment.dueDate : earliest;
    }, null);

    // Get all unfinished assignments for that due date 
    const sameDayTasks = availableTasks.filter(function (assignment) {
        return assignment.dueDate === earliestDueDate;
    });

    // If the current queue is empty or no longer matches the current due date, create a new queue
    const queueStillValid = nextTaskQueue.length > 0 &&
        nextTaskQueue.every(function (assignment) {
            return sameDayTasks.some(function (task) {
                return task.id === assignment.id;
            });
        });

    if (!queueStillValid) {
        nextTaskQueue = sameDayTasks.slice();
    }

    // Remove assignments that have already been completed
    nextTaskQueue = nextTaskQueue.filter(function (assignment) {
        return !assignment.completed && !isPastDue(assignment.dueDate);
    });

    // Make sure any new assignment for this due date is added to the queue
    sameDayTasks.forEach(function (assignment) {
        const alreadyInQueue = nextTaskQueue.some(function (task) {
            return task.id === assignment.id;
        });

        if (!alreadyInQueue) {
            nextTaskQueue.push(assignment);
        }
    });

    const nextTask = nextTaskQueue[0];

    if (!nextTask) {
        return;
    }

    // The user can only click "Not now" when there is another assignment on the same due date
    skipNextTask.disabled = nextTaskQueue.length <= 1;

    nextTaskTitle.textContent = nextTask.title;

    nextTaskCourse.textContent = nextTask.course || "No class";

    nextTaskDue.textContent = `Due ${formatDueDate(nextTask.dueDate)}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(
        nextTask.dueDate + "T00:00:00"
    );

    const daysUntilDue = Math.ceil(
        (dueDate - today) / (1000 * 60 * 60 * 24)
    );

    if (nextTask.aiReason) {
        whyTaskText.textContent = nextTask.aiReason;
    } 
    
    else {
        whyTaskText.textContent = "Analyzing this assignment...";
    }
}

/* Update Daily Progress Function */
function updateDailyProgress() {
    const activeAssignments = assignments.filter(function (assignment) {
        return !isPastDue(assignment.dueDate);
    });

    const totalAssignments = activeAssignments.length;

    const completedAssignments = activeAssignments.filter(function (assignment) {
        return assignment.completed;
    }).length;

    let progressPercentage = 0;

    if (totalAssignments > 0) {
        progressPercentage = (completedAssignments / totalAssignments) * 100;
    }

    dailyProgressText.textContent = `${completedAssignments} of ${totalAssignments} things done`;

    dailyProgressBar.value = progressPercentage;

    dailyProgressPercent.textContent = `${Math.round(progressPercentage)}%`;
}

/* Greeting the user base on the user's time Function */
function updateGreeting() {
    const greeting = document.getElementById("greeting");

    const currentHour = new Date().getHours();

    if (currentHour < 12) {
        greeting.textContent = "Good morning!";
    } 
    
    else if (currentHour < 18) {
        greeting.textContent = "Good afternoon!";
    } 
    
    else {
        greeting.textContent = "Good evening!";
    }
}

/* Update Streak Function */
function updateStreak() {
    const currentStreakElement = document.getElementById("currentStreak");
    const streakMessageElement = document.getElementById("streakMessage");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If the user has never completed an assignment, the streak has not started
    if (!streakStartDate) {
        currentStreakElement.textContent = "0 Days";
        streakMessageElement.textContent = "Start your streak!";
        return;
    }

    const startDate = new Date(
        streakStartDate + "T00:00:00"
    );

    let streak = 0;

    // Check each calendar day starting from the streak start date
    const currentDate = new Date(startDate);

    while (currentDate <= today) {
        const dateString = getDateString(currentDate);

        // Find assignments that were due on this day
        const daysAssignments = assignments.filter(function (assignment) {
            return assignment.dueDate === dateString;
        });

        // If there were no assignments on this day, the day counts as successful
        if (daysAssignments.length === 0) {
            streak++;
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        // Check whether every assignment due that day was completed on that same day
        const dayWasSuccessful = daysAssignments.every(function (assignment) {

            // The assignment is currently incomplete
            if (!assignment.completed) {
                return false;
            }

            // No completion date means we cannot count it
            if (!assignment.completedAt) {
                return false;
            }

            const completedDate = new Date(assignment.completedAt);
            completedDate.setHours(0, 0, 0, 0);

            // The assignment must have been completed on or before its due date.
            const dueDate = new Date(
                assignment.dueDate + "T00:00:00"
            );

            return completedDate <= dueDate;
        });

        if (dayWasSuccessful) {
            streak++;
        } 
        
        else {
            // This day failed, so the current streak ends here
            streak = 0;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    currentStreakElement.textContent = `${streak} ${streak === 1 ? "Day" : "Days"}`;

    if (streak === 0) {
        streakMessageElement.textContent = "You missed an assignment :(";
    } 

    else {
        streakMessageElement.textContent = "Keep it going!";
    }
}

// Get Date Function */
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/* Get Today Date Function */
function getTodayDateString() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/* Update the User's Current Date Function */
function updateCurrentDate() {
    const currentDate = document.getElementById("currentDate");

    const today = new Date();

    currentDate.textContent = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    });
}

//localStorage.clear();