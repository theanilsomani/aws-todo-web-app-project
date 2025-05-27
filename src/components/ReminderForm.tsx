// src/components/ReminderForm.tsx
import React, { useState, useEffect } from "react";
import { Task } from "../api/apiService"; // Assuming Task interface is exported
import "../styles/Form.css"; // You might want specific styles or reuse

interface ReminderFormProps {
  task: Task | null; // Pass the task being edited, or null if new
  userEmail?: string; // Pre-fill email
  onSetReminder: (details: {
    reminderTime?: string; // UTC ISO String
    reminderEmail?: string;
    reminderMessage?: string;
  }) => Promise<void>; // Called when user submits new reminder details
  onClearReminder: () => Promise<void>; // Called when user wants to clear
  onCancel: () => void;
  isReminderSet?: boolean; // From task.isReminderSet
  currentReminderTime?: string; // From task.reminderTime (UTC ISO String)
}

function ReminderForm({
  task,
  userEmail,
  onSetReminder,
  onClearReminder,
  onCancel,
  isReminderSet,
  currentReminderTime,
}: ReminderFormProps) {
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [time, setTime] = useState(""); // HH:MM (24-hour)
  const [email, setEmail] = useState(userEmail || "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReminderSet && currentReminderTime && task) {
      // Added 'task' to dependency and check
      try {
        // currentReminderTime is an ISO 8601 UTC string (e.g., "2025-05-11T10:00:00.000Z")
        const reminderDateTimeInUTC = new Date(currentReminderTime);

        if (isNaN(reminderDateTimeInUTC.getTime())) {
          console.error(
            "Invalid currentReminderTime format:",
            currentReminderTime
          );
          // Set to default if existing time is invalid
          setDefaultDateTime();
          return;
        }

        // The <input type="date"> expects "YYYY-MM-DD"
        // The <input type="time"> expects "HH:MM" (in local time of the browser)

        // To display correctly in user's local time in the input fields:
        const localYear = reminderDateTimeInUTC.getFullYear();
        const localMonth = (reminderDateTimeInUTC.getMonth() + 1)
          .toString()
          .padStart(2, "0"); // Month is 0-indexed
        const localDay = reminderDateTimeInUTC
          .getDate()
          .toString()
          .padStart(2, "0");
        const localHours = reminderDateTimeInUTC
          .getHours()
          .toString()
          .padStart(2, "0");
        const localMinutes = reminderDateTimeInUTC
          .getMinutes()
          .toString()
          .padStart(2, "0");

        const datePart = `${localYear}-${localMonth}-${localDay}`;
        const timePart = `${localHours}:${localMinutes}`;

        setDate(datePart);
        setTime(timePart);

        setEmail(task.reminderEmail || userEmail || ""); // Prioritize task's reminderEmail
        setMessage(task.reminderMessage || ""); // Prioritize task's reminderMessage
      } catch (e) {
        console.error(
          "Error parsing existing reminder time:",
          currentReminderTime,
          e
        );
        setDefaultDateTime(); // Fallback to default if parsing fails
      }
    } else {
      setDefaultDateTime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReminderSet, currentReminderTime, userEmail, task]); // Added task to dependency array

  const setDefaultDateTime = () => {
    const now = new Date();
    // Default to 1 hour from now, rounded to the nearest 15 minutes (or 00) for better UX
    now.setHours(now.getHours() + 1);
    const minutes = now.getMinutes();
    if (minutes > 0 && minutes < 15) now.setMinutes(15);
    else if (minutes > 15 && minutes < 30) now.setMinutes(30);
    else if (minutes > 30 && minutes < 45) now.setMinutes(45);
    else if (minutes > 45) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
      // minutes is 0, 15, 30, 45
      // do nothing
    }

    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const mins = now.getMinutes().toString().padStart(2, "0");

    setDate(`${year}-${month}-${day}`);
    setTime(`${hours}:${mins}`);
    setEmail(userEmail || "");
    setMessage(""); // Clear message for new reminder
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!date || !time) {
      setError("Please select both date and time.");
      setIsLoading(false);
      return;
    }
    if (!email) {
      setError("Email for reminder is required.");
      setIsLoading(false);
      return;
    }

    // Combine date and time into a local ISO-like string, then convert to UTC ISO string
    // The input type="date" and type="time" give values in the browser's local timezone.
    const localDateTimeString = `${date}T${time}:00`; // Add seconds
    const localDate = new Date(localDateTimeString);

    if (isNaN(localDate.getTime())) {
      setError("Invalid date or time selected.");
      setIsLoading(false);
      return;
    }

    // Convert local date to UTC ISO string for backend
    const reminderTimeUTC = localDate.toISOString();

    // Check if reminder time is in the past (relative to current UTC)
    const nowUTC = new Date();
    if (localDate <= nowUTC) {
      // Compare localDate (which is parsed in local TZ) to nowUTC
      setError("Reminder time must be in the future.");
      setIsLoading(false);
      return;
    }

    try {
      await onSetReminder({
        reminderTime: reminderTimeUTC,
        reminderEmail: email,
        reminderMessage:
          message.trim() || `Reminder for: ${task?.taskText || "your task"}`,
      });
      // Parent component will handle closing modal/form
    } catch (err: any) {
      setError(err.message || "Failed to set reminder.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setError("");
    setIsLoading(true);
    try {
      await onClearReminder();
      // Parent component will handle closing
    } catch (err: any) {
      setError(err.message || "Failed to clear reminder.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="reminder-form form-container"
      style={{
        backgroundColor: "#3a3a3a",
        padding: "20px",
        borderRadius: "8px",
        marginTop: "0",
      }}
    >
      <h4>
        {isReminderSet ? "Update Reminder" : "Set Reminder"} for "
        {task?.taskText}"
      </h4>
      <form onSubmit={handleSubmit}>
        <label htmlFor="reminder-date">Date:</label>
        <input
          type="date"
          id="reminder-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={isLoading}
        />

        <label htmlFor="reminder-time">Time (your local):</label>
        <input
          type="time"
          id="reminder-time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          disabled={isLoading}
        />

        <label htmlFor="reminder-email">Email:</label>
        <input
          type="email"
          id="reminder-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email for notification"
          disabled={isLoading}
        />

        <label htmlFor="reminder-message">Message (Optional):</label>
        <textarea
          id="reminder-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Custom reminder message"
          rows={3}
          disabled={isLoading}
          style={{
            width: "100%",
            maxWidth: "280px",
            padding: "10px",
            boxSizing: "border-box",
            backgroundColor: "#444",
            color: "white",
            border: "1px solid #555",
            borderRadius: "5px",
          }}
        />

        {error && (
          <p
            className="error-message"
            style={{ width: "100%", maxWidth: "280px" }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            width: "100%",
            maxWidth: "300px",
            marginTop: "15px",
          }}
        >
          <button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : isReminderSet
              ? "Update Reminder"
              : "Set Reminder"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{ backgroundColor: "#555" }}
          >
            Cancel
          </button>
        </div>
      </form>
      {isReminderSet && (
        <button
          onClick={handleClear}
          disabled={isLoading}
          style={{ marginTop: "10px", backgroundColor: "#c0392b" }}
        >
          {isLoading ? "Clearing..." : "Clear Reminder"}
        </button>
      )}
    </div>
  );
}
export default ReminderForm;
