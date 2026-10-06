// --- REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS ---
const SUPABASE_URL = 'https://smbncetdovqxvwvlxbrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtYm5jZXRkb3ZxeHZ3dmx4YnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDc3NzAsImV4cCI6MjEwNjgyMzc3MH0.lhgAmFh9CzF17h--Tk5jOXgWUTUkIq2jYxSdFwukLdk';

// Initialize the Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Grab HTML elements
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');

// 1. Fetch tasks from Supabase database on load
async function fetchTasks() {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }
    renderTasks(data);
}

// 2. Add a new task to Supabase
async function addTask() {
    const text = taskInput.value.trim();
    if (text === '') return;

    const { error } = await supabaseClient
        .from('tasks')
        .insert([{ task: text, is_completed: false }]);

    if (error) {
        console.error('Error adding task:', error);
    } else {
        taskInput.value = '';
        // Note: Realtime will automatically refresh the list for us, 
        // but we can also call fetchTasks() right away just in case.
    }
}

// 3. Toggle task completion status in Supabase
async function toggleTask(id, currentStatus) {
    const { error } = await supabaseClient
        .from('tasks')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

    if (error) {
        console.error('Error updating task:', error);
    }
}

// 4. Delete a task from Supabase
async function deleteTask(id) {
    const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting task:', error);
    }
}

// 5. Render tasks to the screen
function renderTasks(tasks) {
    taskList.innerHTML = '';
    
    if (!tasks) return;

    tasks.forEach(item => {
        const li = document.createElement('li');
        
        if (item.is_completed) {
            li.classList.add('completed');
        }

        li.innerHTML = `
            <span onclick="toggleTask(${item.id}, ${item.is_completed})" style="cursor: pointer; flex: 1;">${item.task}</span>
            <button onclick="deleteTask(${item.id})" style="background: none; border: none; cursor: pointer; color: #e74c3c; font-weight: bold;">❌</button>
        `;
        
        taskList.appendChild(li);
    });
}

// Event Listeners for adding tasks
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// 6. REALTIME SUBSCRIPTION (The magic that listens for changes anywhere!)
supabaseClient
    .channel('public:tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Change detected! Refreshing tasks...', payload);
        fetchTasks();
    })
    .subscribe();

// Load tasks when the page first opens
fetchTasks();