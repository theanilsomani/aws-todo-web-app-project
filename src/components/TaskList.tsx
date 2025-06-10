import React from 'react';
import { Task, TaskUpdatePayload } from '../api/apiService';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: TaskUpdatePayload) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenReminderModal: (task: Task) => void; 
  onOpenEditModal: (task: Task) => void;
}


function TaskList({
    tasks,
    onUpdateTask,
    onDeleteTask,
    onOpenReminderModal, 
    onOpenEditModal    
}: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.taskId}
          task={task}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onOpenReminderModal={onOpenReminderModal} 
          onOpenEditModal={onOpenEditModal}   
        />
      ))}
    </ul>
  );
}


export default TaskList;