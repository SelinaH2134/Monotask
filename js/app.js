let assignments = [];

let nextTaskQueue = [];

let streakStartDate = null;

let calendarDate = new Date();

const addAssignmentButton = document.getElementById("addAssignmentButton");

const assignmentModal = document.getElementById("assignmentModal");

const closeAssignmentModal = document.getElementById("closeAssignmentModal");

const cancelAssignment = document.getElementById("cancelAssignment");

const assignmentForm = document.getElementById("assignmentForm");

const taskList = document.getElementById("taskList");

const assignmentList = document.getElementById("assignmentList");

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

const nextTaskDescription = document.getElementById("nextTaskDescription");

const descriptionModal = document.getElementById("descriptionModal");

const closeDescriptionModal = document.getElementById("closeDescriptionModal");

const fullDescription = document.getElementById("fullDescription");

const addAssignmentSubmit = document.getElementById("addAssignmentSubmit");

const aiAnalyzingMessage = document.getElementById("aiAnalyzingMessage");

// Finish assignment
if (finishNextTask) {
    finishNextTask.addEventListener("click", function () {
        const nextTask = nextTaskQueue[0];

        if (!nextTask) {
            return;
        }

        nextTask.completed = true;
        nextTask.completedAt = new Date().toISOString();

        const today = getTodayDateString();

        if (!streakStartDate && nextTask.dueDate <= today) {
            streakStartDate = today;
            saveStreakStartDate();
        }
        

        /* Remove the completed assignment from the queue */
        nextTaskQueue = nextTaskQueue.filter(function (assignment) {
            return assignment.id !== nextTask.id;
        });

        saveAssignments();
        sortAssignments();
        updateGlance();
        updateGentlePlan();
        updateNextTask();
        updateDailyProgress();
        updateStreak();
        updateCalendar();

    });
}

// Skip next task
if (skipNextTask) {
    skipNextTask.addEventListener("click", function () {
        if (nextTaskQueue.length <= 1) {
            return;
        }

        const skippedTask = nextTaskQueue.shift();
        nextTaskQueue.push(skippedTask);
        updateNextTask();
    });
}

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

// Open Modal
if (addAssignmentButton && assignmentModal) {
    addAssignmentButton.addEventListener("click", function() {
        assignmentModal.classList.add("active");
    });
}


// Close Modal
if (closeAssignmentModal && assignmentModal) {
    closeAssignmentModal.addEventListener("click", function() {
        assignmentModal.classList.remove("active");
    });
}


// Cancel Button
if (cancelAssignment && assignmentModal) {
    cancelAssignment.addEventListener("click", function() {
        assignmentModal.classList.remove("active");
    });
}

// Add to the assignment
if (assignmentForm) {
    assignmentForm.addEventListener("submit", async function(event) {

        // Stop the page from refreshing
        event.preventDefault();

        addAssignmentSubmit.hidden = true;
        cancelAssignment.hidden = true;
        aiAnalyzingMessage.hidden = false;

        // Get information from the form
        const title = document.getElementById("assignmentTitle").value.trim();

        const course = document.getElementById("assignmentClass").value.trim();

        const dueDate = document.getElementById("assignmentDueDate").value;

        const description = document.getElementById("assignmentDescription").value.trim();

        const assignmentFile = document.getElementById("assignmentFile").files[0];


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
            const formData = new FormData();

            formData.append("title", assignment.title);
            formData.append("course", assignment.course);
            formData.append("dueDate", assignment.dueDate);
            formData.append("description", assignment.description);

            if (assignmentFile) {
                formData.append("file", assignmentFile);
            }

            const response = await fetch("http://localhost:3000/api/analyze-assignment", {
                method: "POST",
                body: formData
            });

            const aiResult = await response.json();

            assignment.priority = aiResult.priority;
            assignment.aiReason = aiResult.reason;
            assignment.recommendation = aiResult.recommendation;
            assignment.estimatedMinutes = aiResult.estimatedMinutes;

        } catch (error) {
            console.error("AI analysis failed:", error);

            assignment.priority = "AI unavailable";
            assignment.aiReason = "AI analysis could not be completed.";
            assignment.recommendation = "You can still work on this assignment manually.";
            assignment.estimatedMinutes = null;
        }

        // Add assignment to array
        assignments.push(assignment);

        saveAssignments();

        // Sort and display assignment
        sortAssignments();
        updateGlance();
        updateGentlePlan();
        updateNextTask();
        updateDailyProgress();
        updateStreak();
        updateCalendar();
        console.log("New assignment:", assignment);

        // Clear the form 
        assignmentForm.reset();

        addAssignmentSubmit.hidden = false;
        cancelAssignment.hidden = false;
        aiAnalyzingMessage.hidden = true;

        // Close modal
        assignmentForm.reset();
        assignmentModal.classList.remove("active");
    
    });
}

// Open Full Description Modal
if (nextTaskDescription && fullDescription && descriptionModal) {
    nextTaskDescription.addEventListener("click", function () {
        if (nextTaskDescription.dataset.truncated !== "true") {
        return;
    }

        fullDescription.textContent = nextTaskDescription.dataset.fullDescription || "";
        descriptionModal.classList.add("active");
    });
}

// Close Full Description Modal
if (closeDescriptionModal && descriptionModal) {
    closeDescriptionModal.addEventListener("click", function () {
        descriptionModal.classList.remove("active");
    });
}

/* Display Assignment Function */
function addAssignmentToListWithoutSorting(assignment) {

    const list = taskList || assignmentList;

    if (!list) {
        return;
    }

    const taskItem = document.createElement("div");

    taskItem.classList.add("task-list-item");

    taskItem.innerHTML = `
        <input type="checkbox" class="task-checkbox" aria-label="Mark assignment complete" ${assignment.completed ? "checked" : ""}>

        <div class="task-list-info">
            <h3>
                <button type="button" class="assignment-title-button">
                    ${assignment.title}
                </button>
            </h3>

            <p>${assignment.course || "No class"}</p>

            ${assignment.aiReason ? `<p class="ai-reason">${assignment.aiReason}</p>` : ""}
        </div>

        <div class="task-list-due">
            <p>Due ${formatDueDate(assignment.dueDate)}</p>

            <span class="priority ${
                assignment.priority === "High priority"
                    ? "high-priority"
                    : assignment.priority === "Medium priority"
                        ? "medium-priority"
                        : "low-priority"
            }">
                ${assignment.priority}
            </span>
        </div>
    `;

    /* View full description for each assignment by clicking the name of its */
    const assignmentTitleButton = taskItem.querySelector(".assignment-title-button");

    assignmentTitleButton.addEventListener("click", function () {
        if (!descriptionModal || !fullDescription) {
            return;
        }

        fullDescription.textContent =
            assignment.description || "No description provided.";

        descriptionModal.classList.add("active");
    });

    list.appendChild(taskItem);

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

            const today = getTodayDateString();

            // Only start a streak for an assignment due today or earlier.
            if (!streakStartDate && assignment.dueDate <= today) {
                streakStartDate = today;
                saveStreakStartDate();
            }
        } 

        else {
            assignment.completedAt = null;

            const today = getTodayDateString();

            // Only reset the streak if this assignment is due today
            // or is already past due.
            if (assignment.dueDate <= today) {
                streakStartDate = null;
                saveStreakStartDate();
            }
        }

        taskItem.classList.toggle(
            "completed",
            assignment.completed
        );

        saveAssignments();
        sortAssignments();
        updateGlance();
        updateGentlePlan();
        updateNextTask();
        updateDailyProgress();
        updateStreak();
        updateCalendar();

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
    const list = taskList || assignmentList;

    if (!list) {
        return;
    }

    list.innerHTML = "";

    // Display assignments in sorted order
    assignments.forEach(function (assignment) {
        // Show the assignment if it is not past due
        // OR if it is past due but has not been completed.
        if (!isPastDue(assignment.dueDate) || !assignment.completed) {
            addAssignmentToListWithoutSorting(assignment);
        }

    });
}

/* Today at a Glance Function */
function updateGlance() {
    const dueTodayCount = document.getElementById("dueTodayCount");
    const weekAssignmentCount = document.getElementById("weekAssignmentCount");
    const nextDeadlineTitle = document.getElementById("nextDeadlineTitle");
    const nextDeadlineDate = document.getElementById("nextDeadlineDate");

    // This page does not have the glance card
    if (!dueTodayCount || !weekAssignmentCount || !nextDeadlineTitle || !nextDeadlineDate) {
        return;
    }

    const today = getTodayDateString();

    // Ignore past-due assignments
    const activeAssignments = assignments.filter(function (assignment) {
        return !isPastDue(assignment.dueDate);
    });

    // Assignments due today
    const dueToday = activeAssignments.filter(function (assignment) {
        return assignment.dueDate === today;
    });

    dueTodayCount.textContent = dueToday.length;

    // Assignments due this week
    const thisWeek = activeAssignments.filter(function (assignment) {
        return isThisWeek(assignment.dueDate);
    });

    weekAssignmentCount.textContent = thisWeek.length;

    // Find the next upcoming assignment
    const upcomingAssignments = activeAssignments
        .filter(function (assignment) {
            return assignment.dueDate >= today;
        })

        .sort(function (a, b) {
            return a.dueDate.localeCompare(b.dueDate);
        });

    if (upcomingAssignments.length === 0) {
        nextDeadlineTitle.textContent = "No upcoming assignments";
        nextDeadlineDate.textContent = "You're all caught up.";
        return;
    }

    const nextAssignment = upcomingAssignments[0];

    nextDeadlineTitle.textContent = nextAssignment.title;
    nextDeadlineDate.textContent = `Due ${formatDueDate(nextAssignment.dueDate)}`;
}

/* Gentle Plan Function */
function updateGentlePlan() {

    /* Assignment page doesn't have gentle plan */
    if (!planList) {
        return;
    }

    planList.innerHTML = "";

    const weeklyAssignments = assignments.filter(function (assignment) {
        return isThisWeek(assignment.dueDate);
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

            day = "TMR";
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
                <p class="priority ${
                    assignment.priority === "High priority"
                        ? "high-priority"
                        : assignment.priority === "Medium priority"
                            ? "medium-priority"
                            : "low-priority"
                }">
                    ${assignment.priority}
                </p>
            </div>
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

    if (
        !nextTaskTitle ||
        !nextTaskCourse ||
        !nextTaskDue ||
        !whyTaskText ||
        !nextTaskDescription ||
        !skipNextTask
    ) {
        return;
    }

    const availableTasks = assignments.filter(function (assignment) {
        return !assignment.completed && !isPastDue(assignment.dueDate);
    });

    if (availableTasks.length === 0) {
        nextTaskQueue = [];

        nextTaskTitle.textContent = "You're all caught up!";
        nextTaskCourse.textContent = "";
        nextTaskDue.textContent = "";

        // Hide the AI explanation
        whyTaskText.textContent = "";
        whyTaskText.closest(".why-task").style.display = "none";

        // Hide the description
        nextTaskDescription.textContent = "";
        nextTaskDescription.style.display = "none";

        // Hide the action buttons
        finishNextTask.style.display = "none";
        skipNextTask.style.display = "none";

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

    // Show the description and buttons when there is an active task
    whyTaskText.closest(".why-task").style.display = "";
    nextTaskDescription.style.display = "";
    finishNextTask.style.display = "";
    skipNextTask.style.display = "";

    // The user can only click "Not now" when there is another assignment on the same due date
    skipNextTask.disabled = nextTaskQueue.length <= 1;

    nextTaskTitle.textContent = nextTask.title;
    nextTaskCourse.textContent = nextTask.course || "No class";
    nextTaskDue.textContent = `Due ${formatDueDate(nextTask.dueDate)}`;

    const description = getShortDescription(nextTask.description);

    nextTaskDescription.textContent = description.text;
    nextTaskDescription.dataset.truncated = description.truncated;
    nextTaskDescription.dataset.fullDescription = nextTask.description || "";

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

    if (!dailyProgressText || !dailyProgressBar || !dailyProgressPercent) {
        return;
    }

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

    if (!greeting) {
        return;
    }

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
        currentStreakElement.textContent = "0 Day";
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

        // Find assignments that were due on this day.
        // Past-due assignments are still kept in the assignments array,
        // so they can be used for streak history.
        const daysAssignments = assignments.filter(function (assignment) {
            return assignment.dueDate === dateString;
        });

        // Future due dates should not affect the current streak yet.
        if (currentDate > today) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        // If there were no assignments on this day,
        // the day counts as successful once the streak has started.
        if (daysAssignments.length === 0) {
            streak++;
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        // Every assignment due that day must have been completed
        // on or before its due date.
        const dayWasSuccessful = daysAssignments.every(function (assignment) {

            if (!assignment.completed) {
                return false;
            }

            if (!assignment.completedAt) {
                return false;
            }

            const completedDate = new Date(assignment.completedAt);
            completedDate.setHours(0, 0, 0, 0);

            const dueDate = new Date(
                assignment.dueDate + "T00:00:00"
            );

            return completedDate <= dueDate;
        });

        if (dayWasSuccessful) {
            streak++;
        } 
        
        else {
            // This day failed, so the streak ends here.
            streak = 0;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    currentStreakElement.textContent =
        `${streak} ${streak === 1 ? "Day" : "Days"}`;

    if (streak === 0) {
        streakMessageElement.textContent = "You missed an assignment :(";
    } 
    
    else {
        streakMessageElement.textContent = "Keep it going!";
    }
}

/* Get Date String Function */
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

    if (!currentDate) {
        return;
    }

    const today = new Date();

    currentDate.textContent = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    });
}

/* Get a Short Description */
function getShortDescription(description) {
    if (!description) {
        return {
            text: "No description provided.",
            truncated: false
        };
    }

    const cleanDescription = description.trim();

    if (cleanDescription.length <= 180) {
        return {
            text: cleanDescription,
            truncated: false
        };
    }

    return {
        text: cleanDescription.slice(0, 180).trim() + "...",
        truncated: true
    };
}

/* Update My Plan Function */
function updateMyPlan() {
    const thisWeekContainer = document.getElementById("thisWeekPlan");
    const nextWeekContainer = document.getElementById("nextWeekPlan");

    if (!thisWeekContainer || !nextWeekContainer) {
        return;
    }

    thisWeekContainer.innerHTML = "";
    nextWeekContainer.innerHTML = "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();

    // Sunday = 0
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - dayOfWeek);

    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);

    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

    function getDateFromString(dateString) {
        const parts = dateString.split("-");

        return new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );
    }

    function isBetween(date, start, end) {
        return date >= start && date <= end;
    }

    function renderWeek(container, startDate, endDate) {

        const weekAssignments = assignments.filter(function (assignment) {

            if (!assignment.dueDate) {
                return false;
            }

            const dueDate = getDateFromString(assignment.dueDate);

            return isBetween(dueDate, startDate, endDate);

        });

        if (weekAssignments.length === 0) {

            container.innerHTML = `
                <p class="empty-plan">
                    No assignments scheduled for this week.
                </p>
            `;

            return;
        }

        const assignmentsByDay = {};

        weekAssignments.forEach(function (assignment) {

            if (!assignmentsByDay[assignment.dueDate]) {
                assignmentsByDay[assignment.dueDate] = [];
            }

            assignmentsByDay[assignment.dueDate].push(assignment);

        });

        const sortedDates = Object.keys(assignmentsByDay).sort();

        sortedDates.forEach(function (dateString) {

            const date = getDateFromString(dateString);

            const day = document.createElement("div");
            day.className = "my-plan-item";

            const allCompleted = assignmentsByDay[dateString].every(function (assignment) {
                return assignment.completed;
            });

            if (allCompleted) {
                day.classList.add("completed");
            }

            const dayName = date.toLocaleDateString("en-US", {
                weekday: "short"
            }).toUpperCase();

            const dayNumber = date.getDate();

            const assignmentsHTML = assignmentsByDay[dateString]
            .map(function (assignment) {
                const priorityClass =
                    assignment.priority === "High priority"
                        ? "high-priority"
                        : assignment.priority === "Medium priority"
                            ? "medium-priority"
                            : "low-priority";

                return `
                    <div class="my-plan-assignment ${assignment.completed ? "completed" : ""}">
                        <div class="my-plan-info">
                            <h3>${assignment.title}</h3>
                            <p>${assignment.course || "Assignment"}</p>
                        </div>

                        <span class="my-plan-status priority ${priorityClass}">
                            ${assignment.priority || "Priority not available"}
                        </span>
                    </div>
                `;
            })
            .join("");

            day.innerHTML = `
                <div class="my-plan-day">
                    <span>${dayName}</span>
                    <strong>${dayNumber}</strong>
                </div>

                <div class="my-plan-assignment-list">
                    ${assignmentsHTML}
                </div>
            `;

            container.appendChild(day);

        });
    }

    renderWeek(thisWeekContainer, startOfThisWeek, endOfThisWeek);

    renderWeek(nextWeekContainer, startOfNextWeek, endOfNextWeek);
}

/* Mark Streak Label on the Calendar Function */
function isStreakDay(dateString) {
    const targetDate = new Date(dateString + "T00:00:00");
    const today = new Date();

    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // Future dates cannot be streak days.
    if (targetDate > today) {
        return false;
    }

    let checkDate = new Date(today);
    let streakStart = null;

    while (checkDate >= targetDate) {
        const checkDateString =
            checkDate.getFullYear() +
            "-" +
            String(checkDate.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(checkDate.getDate()).padStart(2, "0");

        const dayAssignments = assignments.filter(function (assignment) {
            return assignment.dueDate === checkDateString;
        });

        // Days with no assignments only count AFTER the streak has started.
        if (dayAssignments.length === 0) {
            if (streakStart !== null) {
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
            }

            checkDate.setDate(checkDate.getDate() - 1);
            continue;
        }

        const successfulDay = dayAssignments.every(function (assignment) {
            return assignment.completed === true;
        });

        if (!successfulDay) {
            break;
        }

        // This is a successful assignment day.
        streakStart = new Date(checkDate);

        checkDate.setDate(checkDate.getDate() - 1);
    }

    // No successful day means the streak has not started.
    if (streakStart === null) {
        return false;
    }

    return targetDate >= streakStart && targetDate <= today;
}

/* My Plan Calendar */
function updateCalendar() {
    const calendarGrid = document.getElementById("calendarGrid");
    const calendarMonth = document.getElementById("calendarMonth");

    if (!calendarGrid || !calendarMonth) {
        return;
    }

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    calendarMonth.textContent = firstDay.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    calendarGrid.innerHTML = "";

    // Add empty spaces before the first day
    const startingDay = firstDay.getDay();

    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "calendar-day empty";
        calendarGrid.appendChild(emptyDay);
    }

    // Add the days of the month
    for (let dayNumber = 1; dayNumber <= lastDay.getDate(); dayNumber++) {
        const day = document.createElement("div");
        day.className = "calendar-day";

        const number = document.createElement("span");
        number.className = "calendar-day-number";
        number.textContent = dayNumber;
        day.appendChild(number);

        const dateString =
            year +
            "-" +
            String(month + 1).padStart(2, "0") +
            "-" +
            String(dayNumber).padStart(2, "0");

        // Show TODAY and fire on the calendar
        const today = new Date();

        if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNumber) {
            const todayRow = document.createElement("div");
            todayRow.className = "calendar-today-row";

            const todayLabel = document.createElement("span");
            todayLabel.className = "calendar-today-label";
            todayLabel.textContent = "TODAY";

            todayRow.appendChild(todayLabel);

            if (isStreakDay(dateString)) {
                const fire = document.createElement("span");
                fire.className = "calendar-streak-fire";
                fire.textContent = "🔥";
                fire.setAttribute("aria-label", "Streak day");

                todayRow.appendChild(fire);
            }

            day.appendChild(todayRow);
        }

        // Find assignments due on this date
        const dayAssignments = assignments.filter(function (assignment) {
            return assignment.dueDate === dateString;
        });

        // Add assignments to the calendar day
        dayAssignments.slice(0, 3).forEach(function (assignment) {
            const assignmentElement = document.createElement("div");

            const priorityClass =
                assignment.priority === "High priority"
                    ? "high-priority"
                    : assignment.priority === "Medium priority"
                        ? "medium-priority"
                        : "low-priority";

            assignmentElement.className = "calendar-assignment " + priorityClass + (assignment.completed ? " completed" : "");
            assignmentElement.textContent = assignment.title;

            assignmentElement.addEventListener("click", function () {
                const descriptionModal = document.getElementById("descriptionModal");
                const fullDescription = document.getElementById("fullDescription");

                if (descriptionModal && fullDescription) {
                    fullDescription.textContent =
                        assignment.description || "No description provided.";

                    descriptionModal.classList.add("active");
                }
            });

            day.appendChild(assignmentElement);
        });

        /* See More Assignments */
        if (dayAssignments.length > 3) {
            const moreButton = document.createElement("button");

            moreButton.type = "button";
            moreButton.className = "calendar-more-button";
            moreButton.textContent = `+${dayAssignments.length - 3} more`;

            moreButton.addEventListener("click", function () {
                const descriptionModal = document.getElementById("descriptionModal");
                const fullDescription = document.getElementById("fullDescription");
                const modalBack = document.getElementById("modalBack");
                const modalLabel = document.getElementById("descriptionModalLabel");

                if (!descriptionModal || !fullDescription) {
                    return;
                }

                function showAllAssignments() {
                    fullDescription.innerHTML = "";

                    if (modalLabel) {
                        modalLabel.textContent = "All assignments";
                    }

                    if (modalBack) {
                        modalBack.style.display = "none";
                    }

                    if (closeDescriptionModal) {
                        closeDescriptionModal.style.display = "block";
                    }

                    dayAssignments.forEach(function (assignment) {
                        const assignmentItem = document.createElement("div");

                        assignmentItem.className = "more-assignment-item" + (assignment.completed ? " completed" : "");

                        assignmentItem.innerHTML = `
                            <strong>${assignment.title}</strong>
                            <p>${assignment.course || "Assignment"}</p>
                        `;

                        assignmentItem.addEventListener("click", function () {
                            fullDescription.innerHTML = `
                                <p>${assignment.description || "No description provided."}</p>
                            `;

                            if (modalLabel) {
                                modalLabel.textContent = "Assignment description";
                            }

                            if (modalBack) {
                                modalBack.style.display = "block";
                            }

                            if (closeDescriptionModal) {
                                closeDescriptionModal.style.display = "none";
                            }
                        });

                        fullDescription.appendChild(assignmentItem);
                    });
                }

                // Show all assignments
                showAllAssignments();

                // Back to all assignments
                if (modalBack) {
                    modalBack.onclick = showAllAssignments;
                }

                descriptionModal.classList.add("active");
            });

            day.appendChild(moreButton);
        }

        calendarGrid.appendChild(day);
    }

    // Make even columns
    const totalCells = startingDay + lastDay.getDate();
    const remainingCells = (7 - (totalCells % 7)) % 7;

    for (let i = 0; i < remainingCells; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "calendar-day empty";
        calendarGrid.appendChild(emptyDay);
    }
}

const previousMonth = document.getElementById("previousMonth");
const nextMonth = document.getElementById("nextMonth");

if (previousMonth) {
    previousMonth.addEventListener("click", function () {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        updateCalendar();
    });
}

if (nextMonth) {
    nextMonth.addEventListener("click", function () {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        updateCalendar();
    });
}

// Call the function
updateGlance();
updateGentlePlan();
updateNextTask();
updateDailyProgress();
// 60,000 milliseconds = 1 minute. Check the time every minute
updateGreeting(); setInterval(updateGreeting, 60000);
updateStreak();
updateCurrentDate();
updateGentlePlan();
updateMyPlan();
updateCalendar();

//localStorage.clear();