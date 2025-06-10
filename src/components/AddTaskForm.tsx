import React, { useState } from 'react';

interface AddTaskFormProps {
  onAddTask: (taskText: string) => Promise<boolean>; 
}

function AddTaskForm({ onAddTask }: AddTaskFormProps) {
  const [taskText, setTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = taskText.trim();
    if (!trimmedText) return; 

    setIsAdding(true);
    const success = await onAddTask(trimmedText);
    setIsAdding(false);

    if (success) {
      setTaskText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-task-form">
      <input
        type="text"
        value={taskText}
        onChange={(e) => setTaskText(e.target.value)}
        placeholder="What needs to be done?"
        disabled={isAdding}
        aria-label="New task description"
      />
      <button type="submit" disabled={isAdding || !taskText.trim()}>
        {isAdding ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  );
}

export default AddTaskForm;