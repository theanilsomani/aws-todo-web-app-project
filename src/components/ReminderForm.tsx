import React, { useState, useEffect } from "react";
import { Task } from "../api/apiService";
import "../styles/Form.css";

interface ReminderFormProps {
  task: Task | null; 
  userEmail?: string; 
  onSetReminder: (details: {
    reminderTime?: string; 
    reminderEmail?: string;
    reminderMessage?: string;
  }) => Promise<void>; 
  onClearReminder: () => Promise<void>; 
  onCancel: () => void;
  isReminderSet?: boolean; 
  currentReminderTime?: string;
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
  const [date, setDate] = useState(""); 
  const [time, setTime] = useState(""); 
  const [email, setEmail] = useState(userEmail || "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReminderSet && currentReminderTime && task) {
      try {
        const reminderDateTimeInUTC = new Date(currentReminderTime);

        if (isNaN(reminderDateTimeInUTC.getTime())) {
          console.error(
            "Invalid currentReminderTime format:",
            currentReminderTime
          );
          setDefaultDateTime();
          return;
        }


        const localYear = reminderDateTimeInUTC.getFullYear();
        const localMonth = (reminderDateTimeInUTC.getMonth() + 1)
          .toString()
          .padStart(2, "0"); 
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

        setEmail(task.reminderEmail || userEmail || ""); 
        setMessage(task.reminderMessage || "");
      } catch (e) {
        console.error(
          "Error parsing existing reminder time:",
          currentReminderTime,
          e
        );
        setDefaultDateTime();
      }
    } else {
      setDefaultDateTime();
    }
  }, [isReminderSet, currentReminderTime, userEmail, task]); 

  const setDefaultDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const minutes = now.getMinutes();
    if (minutes > 0 && minutes < 15) now.setMinutes(15);
    else if (minutes > 15 && minutes < 30) now.setMinutes(30);
    else if (minutes > 30 && minutes < 45) now.setMinutes(45);
    else if (minutes > 45) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
    }

    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const mins = now.getMinutes().toString().padStart(2, "0");

    setDate(`${year}-${month}-${day}`);
    setTime(`${hours}:${mins}`);
    setEmail(userEmail || "");
    setMessage(""); 
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

    const localDateTimeString = `${date}T${time}:00`;
    const localDate = new Date(localDateTimeString);

    if (isNaN(localDate.getTime())) {
      setError("Invalid date or time selected.");
      setIsLoading(false);
      return;
    }

    const reminderTimeUTC = localDate.toISOString();

    const nowUTC = new Date();
    if (localDate <= nowUTC) {
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
