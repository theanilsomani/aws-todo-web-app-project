// src/components/TaskItem.tsx
import React from 'react';
import { Task, TaskUpdatePayload } from '../api/apiService';

interface TaskItemProps {
  task: Task;
  onUpdateTask: (taskId: string, updates: TaskUpdatePayload) => void;
  onDeleteTask: (taskId: string) => void;
}

function TaskItem({ task, onUpdateTask, onDeleteTask }: TaskItemProps) {

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTask(task.taskId, { isCompleted: e.target.checked });
  };

  const handleDeleteClick = () => {
     // Optional: Add a confirmation dialog
     // if (window.confirm(`Are you sure you want to delete "${task.taskText}"?`)) {
         onDeleteTask(task.taskId);
     // }
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
          {/* Optionally display timestamps */}
          {/* <span style={{ fontSize: '0.7em', color: '#888', marginLeft: '10px' }}>
             ({new Date(task.createdAt).toLocaleDateString()})
          </span> */}
      </div>
      <button onClick={handleDeleteClick} className="delete-button" aria-label={`Delete task: ${task.taskText}`}>
        Delete
      </button>
    </li>
  );
}

export default TaskItem;