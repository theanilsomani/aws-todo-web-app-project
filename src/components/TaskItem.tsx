import React from 'react';
import { Task, TaskUpdatePayload } from '../api/apiService';

interface TaskItemProps {
  task: Task;
  onUpdateTask: (taskId: string, updates: TaskUpdatePayload) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenReminderModal: (task: Task) => void; 
  onOpenEditModal: (task: Task) => void; 
}

function TaskItem({ task, onUpdateTask, onDeleteTask, onOpenReminderModal, onOpenEditModal }: TaskItemProps) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTask(task.taskId, { isCompleted: e.target.checked });
  };

  const handleDeleteClick = () => {
    onDeleteTask(task.taskId);
  };

  const handleSetReminderClick = () => {
    onOpenReminderModal(task);
  };

  const handleEditClick = () => {
    onOpenEditModal(task);
  };

  const formatReminderTime = (isoTime?: string) => {
    if (!isoTime) return '';
    try {
        const date = new Date(isoTime); 
        return date.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return "Invalid date";
    }
  };

  return (
    <li className={`task-item ${task.isCompleted ? 'completed' : ''}`}>
      <div className="task-content">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={handleCheckboxChange}
          aria-labelledby={`task-label-${task.taskId}`}
        />
        <span id={`task-label-${task.taskId}`} className="task-text">
          {task.taskText}
        </span>
      </div>
      <div className="task-actions" style={{ display: 'flex', alignItems: 'center' }}>
        {task.isReminderSet && task.reminderTime && (
            <span title={`Reminder at: ${formatReminderTime(task.reminderTime)}`} style={{ fontSize: '0.8em', color: '#7f8c8d', marginRight: '10px', cursor:'default' }}>
                🔔 {formatReminderTime(task.reminderTime).split(',')[0]}
            </span>
        )}
        <button onClick={handleSetReminderClick} title="Set/Edit Reminder" style={{fontSize:'0.8em', padding:'0.3em 0.6em', marginRight:'5px', backgroundColor: task.isReminderSet ? '#27ae60' : '#555'}}>
            {task.isReminderSet ? "Edit 🔔" : "Set 🔔"}
        </button>
        <button onClick={handleEditClick} title="Edit Task Text" style={{fontSize:'0.8em', padding:'0.3em 0.6em', marginRight:'5px', backgroundColor:'#3498db'}}>
            Edit
        </button>
        <button onClick={handleDeleteClick} className="delete-button" aria-label={`Delete task: ${task.taskText}`}>
          Delete
        </button>
      </div>
    </li>
  );
}

export default TaskItem;