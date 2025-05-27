// src/components/TaskList.tsx
import React from 'react';
import { Task, TaskUpdatePayload } from '../api/apiService'; // Import Task type
import TaskItem from './TaskItem'; // Import TaskItem component

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: TaskUpdatePayload) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenReminderModal: (task: Task) => void; // <-- DEFINE PROP TYPE
  onOpenEditModal: (task: Task) => void;   // <-- DEFINE PROP TYPE
}


function TaskList({
    tasks,
    onUpdateTask,
    onDeleteTask,
    onOpenReminderModal, // <-- DESTRUCTURE
    onOpenEditModal    // <-- DESTRUCTURE
}: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.taskId}
          task={task}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onOpenReminderModal={onOpenReminderModal} // <-- PASS DOWN
          onOpenEditModal={onOpenEditModal}       // <-- PASS DOWN
        />
      ))}
    </ul>
  );
}


export default TaskList;