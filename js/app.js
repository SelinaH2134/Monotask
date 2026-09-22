/* Add Assignment */
let assignments = [];

const addAssignmentButton = document.getElementById("addAssignmentButton");

const assignmentModal = document.getElementById("assignmentModal");

const closeAssignmentModal = document.getElementById("closeAssignmentModal");

const cancelAssignment = document.getElementById("cancelAssignment");

const assignmentForm = document.getElementById("assignmentForm");

const taskList = document.getElementById("taskList");

// Load Saved Assignments
const savedAssignments = localStorage.getItem("monotaskAssignments");

if (savedAssignments) {

    assignments = JSON.parse(savedAssignments);
    sortAssignments();

}

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
assignmentForm.addEventListener("submit", function(event) {

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
        priority: calculatePriority(dueDate)

    };

    // Add assignment to array
    assignments.push(assignment);

    saveAssignments();

    // Sort and display assignment
    sortAssignments();
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

            <p>${assignment.course || "No class"} · Assignment</p>
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

        taskItem.classList.toggle(
            "completed",
            assignment.completed
        );

        saveAssignments();
        sortAssignments();

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