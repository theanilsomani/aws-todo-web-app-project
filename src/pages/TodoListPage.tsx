import React, { useState, useEffect, useCallback } from "react";
import { signOut } from "aws-amplify/auth";
import {
  listTasksAPI,
  createTaskAPI,
  updateTaskAPI,
  deleteTaskAPI,
  setTaskReminderAPI,
  Task,
  TaskUpdatePayload,
  ReminderPayload,
} from "../api/apiService";
import AddTaskForm from "../components/AddTaskForm";
import TaskList from "../components/TaskList";
import ReminderForm from "../components/ReminderForm"; 
import "../styles/Todo.css"; 

interface TodoListPageProps {
  onSignOut: () => void;
  userEmail?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };
  const modalContentStyle: React.CSSProperties = {
    background: "#2c2c2c", 
    color: "white",
    padding: "25px",
    borderRadius: "8px",
    minWidth: "300px",
    maxWidth: "90%",
    width: "500px", 
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
    zIndex: 1001,
    maxHeight: "80vh",
    overflowY: "auto", 
  };
  const modalTitleStyle: React.CSSProperties = {
    marginTop: 0,
    borderBottom: "1px solid #444",
    paddingBottom: "10px",
    marginBottom: "20px",
    fontSize: "1.5rem",
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      {" "}
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        {" "}
        {title && <h3 style={modalTitleStyle}>{title}</h3>}
        {children}
      </div>
    </div>
  );
};

interface EditTaskTextModalProps {
  isOpen: boolean;
  task: Task | null;
  onSave: (taskId: string, newText: string) => Promise<void>;
  onClose: () => void;
}
const EditTaskTextModal: React.FC<EditTaskTextModalProps> = ({
  isOpen,
  task,
  onSave,
  onClose,
}) => {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setText(task.taskText);
      setError("");
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError("Task text cannot be empty.");
      return;
    }
    if (trimmedText === task.taskText) {
      // No actual change
      onClose();
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onSave(task.taskId, trimmedText);
    } catch (err: any) {
      setError(err.message || "Failed to save task text.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Task`}>
      <form
        onSubmit={handleSubmit}
        className="form-container"
        style={{
          marginTop: 0,
          border: 0,
          background: "transparent",
          padding: 0,
        }}
      >
        <label
          htmlFor="edit-task-text"
          style={{ textAlign: "left", width: "100%", marginBottom: "5px" }}
        >
          Task Description:
        </label>
        <textarea
          id="edit-task-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: "10px",
            boxSizing: "border-box",
            backgroundColor: "#444",
            color: "white",
            border: "1px solid #555",
            borderRadius: "5px",
            marginBottom: "15px",
          }}
          autoFocus
          disabled={isSaving}
        />
        {error && (
          <p
            className="error-message"
            style={{ width: "100%", textAlign: "left", marginBottom: "10px" }}
          >
            {error}
          </p>
        )}
        <div
          style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{ marginRight: "10px", backgroundColor: "#555" }}
          >
            Cancel
          </button>
          <button type="submit" disabled={isSaving || !text.trim()}>
            {isSaving ? "Saving..." : "Save Text"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

function TodoListPage({ onSignOut, userEmail }: TodoListPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); 
  const [error, setError] = useState<string>("");

  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  const [taskForReminder, setTaskForReminder] = useState<Task | null>(null);

  const [showEditTextModal, setShowEditTextModal] = useState<boolean>(false);
  const [taskForEditText, setTaskForEditText] = useState<Task | null>(null);

  const fetchTasks = useCallback(async (showFullLoadingSpinner = true) => {
    if (showFullLoadingSpinner) setIsLoading(true);
    setError(""); 
    try {
      console.log("Fetching tasks...");
      const fetchedTasks = await listTasksAPI();
      fetchedTasks.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTasks(fetchedTasks);
      console.log("Tasks fetched:", fetchedTasks.length);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Failed to fetch tasks. Please try again.");
      if (err.message === "User not authenticated") {
        handleForceSignOut(); 
      }
    } finally {
      if (showFullLoadingSpinner) setIsLoading(false);
    }
  }, []);

  const handleForceSignOut = useCallback(async () => {
    console.log("Forcing sign out due to API auth error...");
    try {
      await signOut();
    } catch (e) {
      console.error("Error during forced signout from API error:", e);
    }
    onSignOut();
  }, [onSignOut]);

  useEffect(() => {
    fetchTasks(); 
  }, [fetchTasks]); 

  const handleAddTask = async (taskText: string): Promise<boolean> => {
    setError("");
    setIsSubmitting(true);
    console.log("Adding task:", taskText);
    try {
      await createTaskAPI(taskText);
      console.log("Task added via API, re-fetching list...");
      await fetchTasks(false);
      return true;
    } catch (err: any) {
      console.error("Error adding task:", err);
      setError(err.message || "Failed to add task.");
      if (err.message === "User not authenticated") handleForceSignOut();
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: TaskUpdatePayload
  ) => {
    setError("");
    setIsSubmitting(true);
    console.log(`Updating task ${taskId}:`, updates);

    const originalTasks = [...tasks];
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.taskId === taskId
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      )
    );

    try {
      await updateTaskAPI(taskId, updates);
      console.log("Task updated successfully via API.");
      if (
        showEditTextModal &&
        taskForEditText?.taskId === taskId &&
        "taskText" in updates
      ) {
        handleCloseEditModal();
      }
    } catch (err: any) {
      console.error("Error updating task:", err);
      setError(err.message || "Failed to update task.");
      setTasks(originalTasks);
      if (err.message === "User not authenticated") handleForceSignOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setError("");
    setIsSubmitting(true);
    console.log("Deleting task:", taskId);

    const originalTasks = [...tasks];
    // Optimistic UI Update
    setTasks((prevTasks) => prevTasks.filter((task) => task.taskId !== taskId));

    try {
      await deleteTaskAPI(taskId);
      console.log("Task deleted successfully via API.");
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setError(err.message || "Failed to delete task.");
      setTasks(originalTasks);
      if (err.message === "User not authenticated") handleForceSignOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOutClick = async () => {
    setError(""); 
    setIsSubmitting(true);
    console.log("Signing out (v6)...");
    try {
      await signOut();
    } catch (error: any) {
      console.error("Error signing out (v6): ", error);
      setError("Failed to sign out.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReminderModal = (task: Task) => {
    console.log("Opening reminder modal for task:", task); // DEBUG
    setTaskForReminder(task);
    setShowReminderModal(true);
  };
  const handleCloseReminderModal = () => {
    setShowReminderModal(false);
    setTaskForReminder(null);
  };
  const handleSetReminder = async (details: {
    reminderTime?: string;
    reminderEmail?: string;
    reminderMessage?: string;
  }) => {
    if (!taskForReminder) return;
    setError("");
    setIsSubmitting(true);
    try {
      const payload: ReminderPayload = {
        taskId: taskForReminder.taskId,
        ...details,
      };
      await setTaskReminderAPI(payload);
      console.log("Reminder set/updated, re-fetching tasks for updated info.");
      await fetchTasks(false);
      handleCloseReminderModal();
    } catch (err: any) {
      console.error("Error setting reminder:", err);
      if (err.message === "User not authenticated") handleForceSignOut();
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleClearReminder = async () => {
    if (!taskForReminder) return;
    setError("");
    setIsSubmitting(true);
    try {
      await setTaskReminderAPI({
        taskId: taskForReminder.taskId,
        clearReminder: true,
      });
      console.log("Reminder cleared, re-fetching tasks.");
      await fetchTasks(false); 
      handleCloseReminderModal();
    } catch (err: any) {
      console.error("Error clearing reminder:", err);
      if (err.message === "User not authenticated") handleForceSignOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Edit Task Text Modal Handlers ---
  const handleOpenEditModal = (task: Task) => {
    console.log("Opening edit text modal for task:", task);
    setTaskForEditText(task);
    setShowEditTextModal(true);
  };
  const handleCloseEditModal = () => {
    setShowEditTextModal(false);
    setTaskForEditText(null);
  };
  const handleSaveTaskText = async (taskId: string, newText: string) => {
    await handleUpdateTask(taskId, { taskText: newText });
  };

  if (isLoading) {
    return (
      <div
        className="loading-container"
        style={{ textAlign: "center", marginTop: "50px" }}
      >
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="todo-list-container">
      <div className="todo-header">
        <h1>My Tasks</h1>
        {userEmail && (
          <span
            style={{
              fontSize: "0.9em",
              color: "#aaa",
              marginLeft: "auto",
              marginRight: "15px",
            }}
          >
            ({userEmail})
          </span>
        )}
        <button onClick={handleSignOutClick} disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : "Sign Out"}
        </button>
      </div>

      {error && (
        <p
          className="error-message"
          style={{ textAlign: "center", width: "100%", margin: "10px auto" }}
        >
          {error}
        </p>
      )}

      <AddTaskForm onAddTask={handleAddTask} />

      {tasks.length === 0 && !isLoading ? (
        <p style={{ marginTop: "20px" }}>No tasks yet. Add one above!</p>
      ) : (
        <TaskList
          tasks={tasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onOpenReminderModal={handleOpenReminderModal}
          onOpenEditModal={handleOpenEditModal}
        />
      )}

      {taskForReminder && (
        <Modal
          isOpen={showReminderModal}
          onClose={handleCloseReminderModal}
          title="Manage Reminder"
        >
          <ReminderForm
            task={taskForReminder}
            userEmail={userEmail}
            onSetReminder={handleSetReminder}
            onClearReminder={handleClearReminder}
            onCancel={handleCloseReminderModal}
            isReminderSet={taskForReminder.isReminderSet}
            currentReminderTime={taskForReminder.reminderTime}
          />
        </Modal>
      )}

      {taskForEditText && (
        <EditTaskTextModal
          isOpen={showEditTextModal}
          task={taskForEditText}
          onSave={handleSaveTaskText}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  );
}
export default TodoListPage;
