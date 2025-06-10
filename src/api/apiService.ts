import { fetchAuthSession } from "aws-amplify/auth";

// --- Interfaces ---
export interface Task {
  PK?: string; 
  SK?: string; 
  taskId: string;
  userId?: string;
  taskText: string;
  isCompleted: boolean;
  createdAt: string; 
  updatedAt: string;
  entityType?: string; 
  isReminderSet?: boolean; 
  reminderTime?: string;
  reminderEmail?: string;
  reminderMessage?: string;
}

export interface TaskUpdatePayload {
  taskText?: string;
  isCompleted?: boolean;
}

export interface ReminderPayload {
    taskId: string;
    reminderTime?: string;      
    reminderEmail?: string;
    reminderMessage?: string;
    clearReminder?: boolean;    
}


const API_URLS = {
  create: import.meta.env.VITE_Function_URL_create,
  list: import.meta.env.VITE_Function_URL_list,
  update: import.meta.env.VITE_Function_URL_update,
  delete: import.meta.env.VITE_Function_URL_delete,
  setReminder: import.meta.env.VITE_SET_TASK_REMINDER_URL,
};


// Adding console logs to verify IMMEDIATELY after definition
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
    const session = await fetchAuthSession({ forceRefresh: false });
    const idToken = session.tokens?.idToken;
    if (idToken) {
      return idToken.toString();
    }
    console.warn("Auth session fetched, but no ID token found.");
    return null;
  } catch (error: any) {
    if (
      error.name === "UserUnAuthenticatedException" ||
      error.message?.includes("User is not authenticated")
    ) {
      console.log("Auth session error: User not authenticated.", error.name);
    } else {
      console.error("Unexpected error fetching auth session:", error);
    }
    return null;
  }
}

async function makeRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  body: Record<string, any> | null = null 
): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("User not authenticated");
  }

  const options: RequestInit = {
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

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkError: any) {
    console.error("Network error during fetch:", networkError);
    throw new Error(
      `Network error: ${networkError.message || "Failed to connect to API"}`
    );
  }

  let responseData: any;
  const contentType = response.headers.get("content-type");

  try {
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
  } catch (parsingError: any) {
    console.error("Error parsing response:", parsingError);
    if (!response.ok) {
      throw new Error(
        `HTTP error ${response.status} - Failed to parse response`
      );
    }
    throw new Error("Received OK status but failed to parse response body.");
  }

  if (!response.ok) {
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

  return responseData as T; 
}


export const listTasksAPI = async (): Promise<Task[]> => {
  return makeRequest<Task[]>("GET", API_URLS.list);
};

export const createTaskAPI = async (taskText: string): Promise<Task> => {
  interface CreateResponse {
    message: string;
    taskId: string;
    taskText: string;
    isCompleted: boolean;
    createdAt: string;
  }
  const response = await makeRequest<CreateResponse>("POST", API_URLS.create, {
    taskText,
  });
  return {
    taskId: response.taskId,
    taskText: response.taskText,
    isCompleted: response.isCompleted,
    createdAt: response.createdAt,
    updatedAt: response.createdAt,
  };
};

export const updateTaskAPI = async (
  taskId: string,
  updates: TaskUpdatePayload
): Promise<Task> => {
  return makeRequest<Task>("PUT", API_URLS.update, { taskId, ...updates });
};

export const deleteTaskAPI = async (
  taskId: string
): Promise<{ message: string }> => {
  return makeRequest<{ message: string }>("DELETE", API_URLS.delete, {
    taskId,
  });
};

export * from "./apiService";
