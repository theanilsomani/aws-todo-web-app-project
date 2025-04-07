// src/pages/TodoListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
// Import v6+ signOut
import { signOut } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import {
  listTasksAPI,
  createTaskAPI,
  updateTaskAPI,
  deleteTaskAPI,
  Task,
  TaskUpdatePayload,
} from "../api/apiService";
import AddTaskForm from "../components/AddTaskForm";
import TaskList from "../components/TaskList";
import "../styles/Todo.css";

interface TodoListPageProps {
  onSignOut: () => void;
  userEmail?: string;
}

function TodoListPage({ onSignOut, userEmail }: TodoListPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  // useNavigate is not strictly needed here if App handles navigation on signout
  // const navigate = useNavigate();

  // Use useCallback to memoize fetchTasks
  const fetchTasks = useCallback(async () => {
    // ... (fetchTasks implementation remains the same) ...
    console.log("Fetching tasks...");
    setIsLoading(true);
    setError("");
    try {
      const fetchedTasks = await listTasksAPI();

      if (!Array.isArray(fetchedTasks)) {
        console.error("API did not return an array for tasks:", fetchedTasks);
        setError("Received invalid data format for tasks.");
        setTasks([]); // Set to empty array to prevent further errors
        setIsLoading(false);
        return; // Stop processing
      }
      fetchedTasks.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTasks(fetchedTasks);
      console.log("Tasks fetched:", fetchedTasks.length);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Failed to fetch tasks.");
      if (err.message === "User not authenticated") {
        handleSignOut(true); // Pass flag to indicate forced sign out
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep dependencies empty if it should only run once (or add handleSignOut if it changes)

  useEffect(() => {
    fetchTasks(); // Call the memoized function
  }, [fetchTasks]); // Include fetchTasks in dependency array

  // --- Handlers ---

  const handleAddTask = async (taskText: string): Promise<boolean> => {
    // Return boolean for success/failure
    setError("");
    console.log("Adding task:", taskText);
    try {
      // The API returns the created task object (or a simplified version)
      // We don't strictly need the return value if we re-fetch, but it's good practice
      await createTaskAPI(taskText);
      console.log("Task added via API, re-fetching list...");
      fetchTasks(); // Simple re-fetch to update the list
      return true; // Indicate success
    } catch (err: any) {
      console.error("Error adding task:", err);
      setError(err.message || "Failed to add task.");
      if (err.message === "User not authenticated") handleSignOut(true);
      return false; // Indicate failure
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: TaskUpdatePayload
  ) => {
    setError("");
    console.log(`Updating task ${taskId}:`, updates);

    // --- Optimistic UI Update ---
    // Store the original tasks in case we need to revert
    const originalTasks = [...tasks];
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.taskId === taskId
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      )
    );
    // --- End Optimistic Update ---

    try {
      await updateTaskAPI(taskId, updates);
      console.log("Task updated successfully via API.");
      // No need to re-fetch if optimistic update is sufficient
      // fetchTasks(); // Uncomment if you prefer re-fetching
    } catch (err: any) {
      console.error("Error updating task:", err);
      setError(err.message || "Failed to update task.");
      // --- Revert Optimistic Update on Error ---
      setTasks(originalTasks);
      // --- End Revert ---
      if (err.message === "User not authenticated") handleSignOut(true);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setError("");
    console.log("Deleting task:", taskId);

    // --- Optimistic UI Update ---
    const originalTasks = [...tasks];
    setTasks((prevTasks) => prevTasks.filter((task) => task.taskId !== taskId));
    // --- End Optimistic Update ---

    try {
      await deleteTaskAPI(taskId);
      console.log("Task deleted successfully via API.");
      // No need to re-fetch
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setError(err.message || "Failed to delete task.");
      // --- Revert Optimistic Update ---
      setTasks(originalTasks);
      // --- End Revert ---
      if (err.message === "User not authenticated") handleSignOut(true);
    }
  };

  // Sign out handler - optionally force sign out if called due to API auth error
  const handleSignOut = async (isForced: boolean = false) => {
    if (!isForced) setError(""); // Clear UI errors only on intentional sign out
    console.log("Signing out (v6)...");
    try {
      // Use imported signOut
      await signOut(/* { global: true } */); // global option signs out from all devices
      // Let the Hub listener in App.tsx handle the state update and navigation
      // onSignOut(); // No longer strictly needed if Hub listener works
    } catch (error: any) {
      console.error("Error signing out (v6): ", error);
      setError("Failed to sign out.");
    }
  };

  // --- Render ---
  return (
    <div className="todo-list-container">
      <div className="todo-header">
        <h1>My Tasks</h1>
        {userEmail && (
          <span style={{ fontSize: "0.9em", color: "#aaa" }}>
            ({userEmail})
          </span>
        )}
        <button onClick={() => handleSignOut()}>Sign Out</button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <AddTaskForm onAddTask={handleAddTask} />
      {isLoading ? (
        <p className="loading-container">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p>No tasks yet. Add one above!</p>
      ) : (
        <TaskList
          tasks={tasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}
    </div>
  );
}

export default TodoListPage;
