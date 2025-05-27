// src/api/apiService.ts
import { fetchAuthSession } from "aws-amplify/auth";

// --- Interfaces ---
export interface Task {
  PK?: string; // Partition Key (e.g., USER#sub) - Optional in frontend data
  SK?: string; // Sort Key (e.g., TASK#uuid) - Optional in frontend data
  taskId: string;
  userId?: string; // Optional
  taskText: string;
  isCompleted: boolean;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  entityType?: string; // Optional
  isReminderSet?: boolean;  // <-- Optional property
  reminderTime?: string;
  reminderEmail?: string;
  reminderMessage?: string;
}

export interface TaskUpdatePayload {
  taskText?: string;
  isCompleted?: boolean;
}

// --- New Interface for Reminder Payload ---
export interface ReminderPayload {
    taskId: string;
    reminderTime?: string;      // ISO string e.g. 2025-12-01T09:00:00Z (UTC)
    reminderEmail?: string;
    reminderMessage?: string;
    clearReminder?: boolean;    // To explicitly clear a reminder
}


// IMPORTANT: Replace with your actual Function URLs
// Make sure they end with a '/' if that's how AWS provides them
const API_URLS = {
  create: import.meta.env.VITE_Function_URL_create,
  list: import.meta.env.VITE_Function_URL_list,
  update: import.meta.env.VITE_Function_URL_update,
  delete: import.meta.env.VITE_Function_URL_delete,
  setReminder: import.meta.env.VITE_SET_TASK_REMINDER_URL,
};


// Add console logs to verify IMMEDIATELY after definition
// console.log("API URLs Loaded:", API_URLS);
// if (
//   !API_URLS.list ||
//   !API_URLS.create ||
//   !API_URLS.update ||
//   !API_URLS.delete ||
//   !API_URLS.setReminder
// ) {
//   console.error(
//     "!!! One or more API URLs are missing from environment variables (check .env file and VITE_ prefix) !!!"
//   );
//   console.error("!!! One or more API URLs are missing (check .env and VITE_ prefix) !!!");
//   // You might want to throw an error here or handle it more gracefully
// }

// --- Helper Functions ---

// --- New API Function for Setting/Clearing Reminder ---
export const setTaskReminderAPI = async (
    payload: ReminderPayload
): Promise<{ message: string, scheduleName?: string, taskAttributes?: Partial<Task> }> => {
    if (!API_URLS.setReminder) throw new Error("Set Reminder API URL not configured");
    return makeRequest<{ message: string, scheduleName?: string, taskAttributes?: Partial<Task> }>(
        'POST',
        API_URLS.setReminder,
        payload
    );
};

async function getAuthToken(): Promise<string | null> {
  try {
    // Use fetchAuthSession from v6+
    const session = await fetchAuthSession({ forceRefresh: false }); // forceRefresh optional
    // Access the ID token via tokens property
    const idToken = session.tokens?.idToken;
    if (idToken) {
      // toString() gets the JWT string
      return idToken.toString();
    }
    console.warn("Auth session fetched, but no ID token found.");
    return null;
  } catch (error: any) {
    // Use 'any' or Error type
    // Check for specific error indicating no user signed in
    // The specific error message/code might vary, check Amplify docs or logs
    if (
      error.name === "UserUnAuthenticatedException" ||
      error.message?.includes("User is not authenticated")
    ) {
      console.log("Auth session error: User not authenticated.", error.name); // Logged out state
    } else {
      console.error("Unexpected error fetching auth session:", error); // Other errors
    }
    return null;
  }
}

async function makeRequest<T = unknown>( // Generic type T for expected response data
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  body: Record<string, any> | null = null // Body can be any object
): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("User not authenticated"); // Specific error for auth failure
  }

  const options: RequestInit = {
    // Use RequestInit type from lib.dom.d.ts
    method: method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    options.headers = {
      ...options.headers,
      "Content-Type": "application/json",
    };
    options.body = JSON.stringify(body);
  }

  let response: Response; // Declare response variable
  try {
    response = await fetch(url, options);
  } catch (networkError: any) {
    // Catch network errors specifically
    console.error("Network error during fetch:", networkError);
    throw new Error(
      `Network error: ${networkError.message || "Failed to connect to API"}`
    );
  }

  let responseData: any; // Use 'any' here as we branch based on content-type
  const contentType = response.headers.get("content-type");

  try {
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text(); // Get text for non-json responses
    }
  } catch (parsingError: any) {
    console.error("Error parsing response:", parsingError);
    // Even if parsing fails, check if the original status was OK
    if (!response.ok) {
      throw new Error(
        `HTTP error ${response.status} - Failed to parse response`
      );
    }
    // If status was OK but parsing failed, maybe return empty object or throw specific error?
    // For now, let's assume this shouldn't happen for our API if status is OK
    throw new Error("Received OK status but failed to parse response body.");
  }

  if (!response.ok) {
    // Try to get a meaningful error message from JSON or fall back to status text
    const errorMessage =
      responseData?.error ||
      responseData ||
      `HTTP error! status: ${response.status}`;
    console.error(`API Error (${response.status}):`, errorMessage);
    throw new Error(
      typeof errorMessage === "string"
        ? errorMessage
        : JSON.stringify(errorMessage)
    );
  }

  return responseData as T; // Cast the final data to the expected type T
}

// --- Exported API Functions ---

// Returns an array of Task objects
export const listTasksAPI = async (): Promise<Task[]> => {
  return makeRequest<Task[]>("GET", API_URLS.list);
};

// Takes task text, returns the newly created Task object (or confirmation)
export const createTaskAPI = async (taskText: string): Promise<Task> => {
  // The backend returns { message, taskId, taskText, isCompleted, createdAt }
  // Let's adjust the return type slightly based on expected backend response
  interface CreateResponse {
    message: string;
    taskId: string;
    taskText: string;
    isCompleted: boolean;
    createdAt: string;
  }
  // We only need the Task data part for consistency, maybe backend should return full Task?
  // For now, cast the response and return a Task-like object
  const response = await makeRequest<CreateResponse>("POST", API_URLS.create, {
    taskText,
  });
  return {
    // Construct a Task object from the response
    taskId: response.taskId,
    taskText: response.taskText,
    isCompleted: response.isCompleted,
    createdAt: response.createdAt,
    updatedAt: response.createdAt, // Assume updatedAt is same initially
  };
};

// Takes taskId and updates (partial Task), returns the updated Task object
export const updateTaskAPI = async (
  taskId: string,
  updates: TaskUpdatePayload
): Promise<Task> => {
  return makeRequest<Task>("PUT", API_URLS.update, { taskId, ...updates });
};

// Takes taskId, returns a confirmation message object
export const deleteTaskAPI = async (
  taskId: string
): Promise<{ message: string }> => {
  return makeRequest<{ message: string }>("DELETE", API_URLS.delete, {
    taskId,
  });
};

export * from "./apiService";
