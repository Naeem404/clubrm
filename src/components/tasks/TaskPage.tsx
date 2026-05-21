import React, { useState } from 'react';

const INITIAL_STUB_DATA = [
  { id: '1', title: 'Setup ITR1 Log', description: 'Mandatory for grade. Ensure meeting minutes are updated.', priority: 'High', dueDate: '2026-02-13', status: 'Pending' }
];

export function TasksPage() {
  const [tasks, setTasks] = useState(INITIAL_STUB_DATA);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // New Task Formatting
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newDate, setNewDate] = useState('');

  const handleCreateTask = () => {
    if (!newTitle) return alert("Title is required!");
    const newTask = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      dueDate: newDate,
      status: 'Pending'
    };
    setTasks([...tasks, newTask]);
    setIsCreateModalOpen(false);
    
    setNewTitle(''); setNewDesc(''); setNewPriority('Medium'); setNewDate('');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 p-4 text-foreground">
      {/* Configuring the header */}
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Tasks ({tasks.length})</h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#FF8A8A] text-white px-4 py-2 rounded-md font-bold hover:opacity-90"
        >
          + New Task
        </button>
      </div>

      {/* Configuring the toolbar */}
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/10">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">View:</span>
            <select className="border rounded px-2 py-1 bg-background"><option>List</option><option>Kanban</option></select>
            <button className="border rounded px-3 py-1">Calendar</button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Filter:</span>
            <select className="border rounded px-2 py-1 bg-background"><option>Status</option></select>
            <select className="border rounded px-2 py-1 bg-background"><option>Priority</option></select>
          </div>
        </div>
        <div className="flex justify-between items-center gap-4">
          <input className="flex-1 border rounded px-3 py-1 bg-background" placeholder="Search tasks..." />
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Sort:</span>
            <select className="border rounded px-2 py-1 bg-background"><option>Due Date</option></select>
          </div>
        </div>
      </div>

      {/* Configuring the task list */}
      <div className="grid gap-3">
        {tasks.map(task => (
          <div 
            key={task.id} 
            onClick={() => setSelectedTask(task)}
            className="p-4 border rounded-lg bg-card hover:border-primary cursor-pointer flex justify-between items-center group"
          >
            <div className="flex flex-col">
              <h3 className="font-bold">{task.title}</h3>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">📅 {task.dueDate || 'No date'}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                  {task.priority}
                </span>
              </div>
            </div>
            <button 
              onClick={(e) => handleDelete(e, task.id)}
              className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity font-medium px-2 py-1 hover:bg-destructive/10 rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Creating the tasks */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background border p-6 rounded-lg max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <div className="flex flex-col gap-4">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title *" className="border p-2 rounded bg-background" />
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="border p-2 rounded bg-background h-24" />
              <div className="flex gap-2">
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="border p-2 rounded bg-background flex-1">
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="border p-2 rounded bg-background flex-1" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 hover:underline">Cancel</button>
                <button onClick={handleCreateTask} className="bg-primary text-primary-foreground px-4 py-2 rounded font-bold">Create Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Task Details*/}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background border p-6 rounded-lg max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-2">{selectedTask.title}</h2>
            <p className="text-muted-foreground mb-4">{selectedTask.description}</p>
            <div className="text-sm border-t pt-4 space-y-2">
              <p><strong>Priority:</strong> {selectedTask.priority}</p>
              <p><strong>Due:</strong> {selectedTask.dueDate}</p>
            </div>
            <button onClick={() => setSelectedTask(null)} className="mt-6 w-full bg-primary text-primary-foreground py-2 rounded font-bold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}