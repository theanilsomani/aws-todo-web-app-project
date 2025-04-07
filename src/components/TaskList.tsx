// src/components/TaskList.tsx
import React from 'react';
import { Task, TaskUpdatePayload } from '../api/apiService'; // Import Task type
import TaskItem from './TaskItem'; // Import TaskItem component

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: TaskUpdatePayload) => void;
  onDeleteTask: (taskId: string) => void;
}

function TaskList({ tasks, onUpdateTask, onDeleteTask }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.taskId} // Use taskId as the key
          task={task}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </ul>
  );
}

export default TaskList;