// --- REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS ---
const SUPABASE_URL = 'https://smbncetdovqxvwvlxbrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtYm5jZXRkb3ZxeHZ3dmx4YnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDc3NzAsImV4cCI6MjEwNjgyMzc3MH0.lhgAmFh9CzF17h--Tk5jOXgWUTUkIq2jYxSdFwukLdk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date-input');
const prioritySelect = document.getElementById('priority-select');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const sortPriorityBtn = document.getElementById('sort-priority-btn');

let currentTasksData = [];
let isSortedByPriority = false;
let countdownInterval = null;

// 1. Fetch tasks
async function fetchTasks() {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }
    currentTasksData = data || [];
    renderTasks(currentTasksData);
}

// 2. Add task
async function addTask() {
    const taskText = taskInput.value.trim();
    const priorityValue = prioritySelect.value;
    const dueDateValue = dueDateInput.value ? new Date(dueDateInput.value).toISOString() : null;
    const startedAtValue = new Date().toISOString();

    if (!taskText) return;

    const { error } = await supabaseClient
        .from('tasks')
        .insert([{ 
            task: taskText, 
            is_completed: false, 
            priority: priorityValue,
            started_at: startedAtValue,
            due_date: dueDateValue
        }]);

    if (error) {
        console.error('Error adding task:', error);
    } else {
        taskInput.value = '';
        dueDateInput.value = '';
    }
}

// 3. Toggle completion
async function toggleTask(event, id, currentStatus) {
    event.stopPropagation(); 
    
    const newStatus = !currentStatus;
    const finishedAtValue = newStatus ? new Date().toISOString() : null;

    const { error } = await supabaseClient
        .from('tasks')
        .update({ 
            is_completed: newStatus,
            finished_at: finishedAtValue
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating task:', error);
    }
}

// 4. Delete task
async function deleteTask(event, id) {
    event.stopPropagation();
    const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting task:', error);
    }
}

// Helper: Format ISO date nicely
function formatDate(isoString) {
    if (!isoString) return 'None';
    const date = new Date(isoString);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Helper: Calculate short badge countdown
function getCountdownText(dueDateISO) {
    if (!dueDateISO) return '';
    const diff = new Date(dueDateISO) - new Date();
    if (diff < 0) return `<span class="countdown-badge countdown-overdue">Overdue</span>`;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `<span class="countdown-badge">Due in ${days}d</span>`;
    if (hours > 0) return `<span class="countdown-badge">Due in ${hours}h</span>`;
    return `<span class="countdown-badge countdown-overdue">Due soon</span>`;
}

// Helper: Detailed live remaining time string for the drawer
function getLiveRemainingTime(dueDateISO) {
    if (!dueDateISO) return 'No due date set';
    const diff = new Date(dueDateISO) - new Date();
    if (diff < 0) return '<span style="color: #e74c3c; font-weight: bold;">Overdue</span>';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
        return `${days}d ${remHours}h ${minutes}m ${seconds}s remaining`;
    }
    return `${hours}h ${minutes}m ${seconds}s remaining`;
}

// 5. Render tasks
// 5. Render tasks
function renderTasks(tasks) {
    taskList.innerHTML = '';
    if (!tasks) return;

    let tasksToRender = [...tasks];

    // Sorting
    tasksToRender.sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        if (isSortedByPriority) {
            const weights = { high: 1, medium: 2, low: 3 };
            const pA = weights[a.priority || 'medium'] || 2;
            const pB = weights[b.priority || 'medium'] || 2;
            if (pA !== pB) return pA - pB;
        }
        return new Date(b.created_at) - new Date(a.created_at);
    });

    tasksToRender.forEach(item => {
        const li = document.createElement('li');
        
        // Ensure completed class is applied if database says it's done
        if (item.is_completed) {
            li.classList.add('completed');
        }

        const priority = item.priority || 'medium';
        const countdownHTML = !item.is_completed ? getCountdownText(item.due_date) : '';

        li.innerHTML = `
            <div class="task-main-row">
                <div class="task-click-target" style="display: flex; align-items: center; gap: 8px; flex: 1; cursor: pointer;">
                    <span class="task-text-span">${item.task}</span>
                    ${countdownHTML}
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="priority-badge priority-${priority}">${priority}</span>
                    <button class="slide-toggle-btn" style="background-color: #f1f2f6; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; padding: 4px 8px; color: #555;">See Details</button>
                    <button class="delete-btn" style="background: none; border: none; cursor: pointer; color: #e74c3c; font-weight: bold; font-size: 14px;">❌</button>
                </div>
            </div>
            <div class="task-details">
                <div><strong>Started:</strong> ${formatDate(item.started_at)}</div>
                <div><strong>Due Date:</strong> ${formatDate(item.due_date)}</div>
                ${!item.is_completed && item.due_date ? `<div class="live-countdown" data-due="${item.due_date}" style="color: #2980b9; font-weight: 500; margin-top: 2px;"><strong>Remaining:</strong> ${getLiveRemainingTime(item.due_date)}</div>` : ''}
                ${item.is_completed ? `<div><strong>Finished:</strong> ${formatDate(item.finished_at)}</div>` : ''}
            </div>
        `;

        // Click target for toggling completion
        const clickTarget = li.querySelector('.task-click-target');
        clickTarget.addEventListener('click', (e) => {
            toggleTask(e, item.id, item.is_completed);
        });

        // Delete button
        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            deleteTask(e, item.id);
        });

        // Slide Drawer Toggle Event with text change
        const slideBtn = li.querySelector('.slide-toggle-btn');
        slideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            li.classList.toggle('expanded');
            slideBtn.textContent = li.classList.contains('expanded') ? 'Hide Details' : 'See Details';
        });

        taskList.appendChild(li);
    });
}

// Setup live updating interval for timers every second
if (countdownInterval) clearInterval(countdownInterval);
countdownInterval = setInterval(() => {
    document.querySelectorAll('.live-countdown').forEach(el => {
        const dueDate = el.getAttribute('data-due');
        el.innerHTML = `<strong>Remaining:</strong> ${getLiveRemainingTime(dueDate)}`;
    });
}, 1000);

// Sort button toggle listener
if (sortPriorityBtn) {
    sortPriorityBtn.addEventListener('click', () => {
        isSortedByPriority = !isSortedByPriority;
        sortPriorityBtn.textContent = isSortedByPriority ? "Sort: Default 🔄" : "Sort: High to Low 🔽";
        renderTasks(currentTasksData);
    });
}

if (addBtn) addBtn.addEventListener('click', addTask);
if (taskInput) {
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
}

// Real-time synchronization subscription
supabaseClient
    .channel('public:tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
    })
    .subscribe();

fetchTasks();