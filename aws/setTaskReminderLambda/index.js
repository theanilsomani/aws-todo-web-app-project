const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const {
    SchedulerClient,
    CreateScheduleCommand,
    DeleteScheduleCommand,
    GetScheduleCommand: GetSchedulerScheduleCommand,
    FlexibleTimeWindowMode,
    UpdateScheduleCommand
} = require("@aws-sdk/client-scheduler");
const { validateToken } = require('./auth');

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const schedulerClient = new SchedulerClient({});

// --- Environment Variables ---
const TABLE_NAME = process.env.TABLE_NAME;
const NOTIFICATION_LAMBDA_ARN = process.env.NOTIFICATION_LAMBDA_ARN;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;
const SCHEDULE_GROUP_NAME = process.env.SCHEDULE_GROUP_NAME || 'default';

// --- Input Validation for Environment Variables ---
let criticalEnvVarsMissing = false;
if (!TABLE_NAME) {
    console.error("FATAL: Missing environment variable: TABLE_NAME");
    criticalEnvVarsMissing = true;
}
if (!NOTIFICATION_LAMBDA_ARN) {
    console.error("FATAL: Missing environment variable: NOTIFICATION_LAMBDA_ARN");
    criticalEnvVarsMissing = true;
}
if (!SCHEDULER_ROLE_ARN) {
    console.error("FATAL: Missing environment variable: SCHEDULER_ROLE_ARN");
    criticalEnvVarsMissing = true;
}

// Helper to create a unique and valid schedule name
const getScheduleName = (userId, taskId) => {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, '');
    const name = `task-reminder-${safeUserId.substring(0, 10)}-${safeTaskId.substring(0, 15)}`;
    return name.substring(0, 64);
};

// Main Lambda Handler
exports.handler = async (event) => {
    console.log("setTaskReminderLambda received event:", JSON.stringify(event, null, 2));

    // Early exit if env vars are missing
    if (criticalEnvVarsMissing) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error due to missing environment variables." })};
    }

    // 1. --- Authentication ---
    const authHeader = event.headers?.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
        console.log("Authorization header missing or malformed");
        return { statusCode: 401, body: JSON.stringify({ error: 'Authorization token missing' }) };
    }
    const validatedPayload = await validateToken(token);
    if (!validatedPayload) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }
    const userId = validatedPayload.sub;
    // --- End Authentication ---


    // 2. --- Parse Request Body ---
    let requestBody;
    try {
        requestBody = JSON.parse(event.body || '{}');
    } catch (e) {
        console.error("Invalid JSON in request body:", e);
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body - must be JSON' }) };
    }
    const { taskId, reminderTime, reminderEmail, reminderMessage, clearReminder } = requestBody;
    // --- End Parse Request Body ---


    // 3. --- Basic Input Validation ---
    if (!taskId || typeof taskId !== 'string') {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid taskId' }) };
    }
    // --- End Basic Input Validation ---


    // 4. --- Fetch Existing Task Data (to get current scheduleName if any) ---
    let existingTaskData;
    let existingScheduleName;
    try {
        const getTaskParams = {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
            ProjectionExpression: "scheduleName, isReminderSet"
        };
        const taskResult = await ddbDocClient.send(new GetCommand(getTaskParams));
        existingTaskData = taskResult.Item;
        existingScheduleName = existingTaskData?.scheduleName;
        console.log("Existing task data for schedule check:", existingTaskData);
    } catch (dbError) {
        console.error(`Error fetching task ${taskId} for user ${userId}:`, dbError);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to retrieve task details' }) };
    }
    if (!existingTaskData) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Task not found' }) };
    }
    // --- End Fetch Existing Task Data ---


    // 5. --- Handle Clearing a Reminder ---
    if (clearReminder === true) {
        console.log(`Attempting to clear reminder for task ${taskId}`);
        if (existingScheduleName) {
            try {
                console.log(`Deleting existing schedule: ${existingScheduleName}`);
                await schedulerClient.send(new DeleteScheduleCommand({
                    Name: existingScheduleName,
                    GroupName: SCHEDULE_GROUP_NAME
                }));
                console.log(`Successfully deleted schedule: ${existingScheduleName}`);
            } catch (scheduleError) {
                if (scheduleError.name !== 'ResourceNotFoundException') {
                    console.warn(`Error deleting existing schedule ${existingScheduleName}, but proceeding to clear DB:`, scheduleError);
                } else {
                    console.log(`Schedule ${existingScheduleName} not found for deletion, likely already processed or removed.`);
                }
            }
        } else {
            console.log("No existing schedule name found to delete for clearReminder.");
        }

        // Update DynamoDB to clear reminder fields
        const updateClearParams = {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
            UpdateExpression: "SET isReminderSet = :isSet, updatedAt = :ua REMOVE reminderTime, reminderEmail, reminderMessage, scheduleName",
            ExpressionAttributeValues: { ":isSet": false, ":ua": new Date().toISOString() },
            ReturnValues: "UPDATED_NEW"
        };
        try {
            await ddbDocClient.send(new UpdateCommand(updateClearParams));
            console.log(`Reminder fields cleared in DynamoDB for task ${taskId}`);
            return { statusCode: 200, body: JSON.stringify({ message: 'Reminder cleared successfully' }) };
        } catch (dbError) {
            console.error(`Error clearing reminder fields in DB for task ${taskId}:`, dbError);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update task after clearing reminder schedule' }) };
        }
    }
    // --- End Handle Clearing a Reminder ---


    // 6. --- Validate New Reminder Inputs (if not clearing) ---
    if (!reminderTime || typeof reminderTime !== 'string' || !reminderEmail || typeof reminderEmail !== 'string') {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid reminderTime or reminderEmail for setting reminder' }) };
    }
    const reminderDate = new Date(reminderTime); // reminderTime should be ISO UTC string
    const now = new Date();
    // Adding a small buffer (e.g., 1 minute) to ensure schedule time is not too close to current time
    const minScheduleTime = new Date(now.getTime() + 60 * 1000);
    if (isNaN(reminderDate.getTime()) || reminderDate <= minScheduleTime) {
        console.error("Invalid reminderTime:", reminderTime, "ReminderDate:", reminderDate, "MinScheduleTime:", minScheduleTime);
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid reminderTime format, or time is in the past or too soon (must be at least 1 min in future)' }) };
    }
    // --- End Validate New Reminder Inputs ---


    // 7. --- Create/Update EventBridge Schedule ---
    const newScheduleName = getScheduleName(userId, taskId);
    const scheduleExpression = `at(${reminderTime.substring(0, 19)})`; // Format: at(yyyy-mm-ddThh:mm:ss) UTC

    const scheduleTarget = {
        Arn: NOTIFICATION_LAMBDA_ARN,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({
            userId: userId,
            taskId: taskId,
            reminderEmail: reminderEmail,
            reminderMessage: reminderMessage || `Reminder for your task: ${taskId}`
        }),
    };

    try {
        let scheduleExists = false;
        try {
            await schedulerClient.send(new GetSchedulerScheduleCommand({ Name: newScheduleName, GroupName: SCHEDULE_GROUP_NAME }));
            scheduleExists = true;
            console.log(`Schedule '${newScheduleName}' already exists. It will be updated.`);
        } catch (e) {
            if (e.name !== 'ResourceNotFoundException') {
                throw e;
            }
            console.log(`Schedule '${newScheduleName}' does not exist. It will be created.`);
        }

        if (scheduleExists) {
            if (existingScheduleName && existingScheduleName !== newScheduleName) {
                 console.log(`An old schedule '${existingScheduleName}' exists, deleting it first.`);
                 try {
                     await schedulerClient.send(new DeleteScheduleCommand({ Name: existingScheduleName, GroupName: SCHEDULE_GROUP_NAME }));
                 } catch (delErr) { if (delErr.name !== 'ResourceNotFoundException') console.warn("Could not delete old schedule", delErr); }
            }

            console.log(`Updating schedule '${newScheduleName}'`);
            await schedulerClient.send(new UpdateScheduleCommand({
                Name: newScheduleName,
                GroupName: SCHEDULE_GROUP_NAME,
                ScheduleExpression: scheduleExpression,
                ScheduleExpressionTimezone: "UTC",
                Target: scheduleTarget,
                FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
                ActionAfterCompletion: "DELETE",
            }));
        } else {
            // If there was an existing schedule with a *different name* (e.g., due to taskId/userId change if that happens), delete it
            if (existingScheduleName) {
                console.log(`An old schedule '${existingScheduleName}' exists from previous reminder, deleting it.`);
                 try {
                     await schedulerClient.send(new DeleteScheduleCommand({ Name: existingScheduleName, GroupName: SCHEDULE_GROUP_NAME }));
                 } catch (delErr) { if (delErr.name !== 'ResourceNotFoundException') console.warn("Could not delete old schedule", delErr); }
            }

            console.log(`Creating new schedule '${newScheduleName}'`);
            await schedulerClient.send(new CreateScheduleCommand({
                Name: newScheduleName,
                GroupName: SCHEDULE_GROUP_NAME,
                ScheduleExpression: scheduleExpression,
                ScheduleExpressionTimezone: "UTC",
                Target: scheduleTarget,
                FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
                ActionAfterCompletion: "DELETE",
            }));
        }
        console.log(`Successfully set/updated schedule '${newScheduleName}' for ${reminderTime}`);

        // 8. --- Update DynamoDB with new reminder info ---
        const updateDbParams = {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
            UpdateExpression: "SET reminderTime = :rt, reminderEmail = :re, reminderMessage = :rm, isReminderSet = :irs, scheduleName = :sn, updatedAt = :ua",
            ExpressionAttributeValues: {
                ":rt": reminderTime,
                ":re": reminderEmail,
                ":rm": reminderMessage || `Reminder for your task: ${taskId}`,
                ":irs": true,
                ":sn": newScheduleName,
                ":ua": new Date().toISOString()
            },
            ReturnValues: "UPDATED_NEW"
        };
        const updatedItem = await ddbDocClient.send(new UpdateCommand(updateDbParams));
        console.log(`DynamoDB updated for task ${taskId} with new reminder info.`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Reminder set successfully',
                scheduleName: newScheduleName,
                taskAttributes: updatedItem.Attributes
            })
        };

    } catch (error) {
        console.error("Error during schedule operation or DB update:", error);
        // Attempt to clean up schedule if an error occurred after it might have been created
        if (newScheduleName && error.name !== 'ResourceNotFoundException') {
            console.log(`Error occurred, attempting to cleanup schedule '${newScheduleName}'`);
            try {
                await schedulerClient.send(new DeleteScheduleCommand({ Name: newScheduleName, GroupName: SCHEDULE_GROUP_NAME }));
                console.log(`Cleaned up schedule '${newScheduleName}' due to error.`);
            } catch (cleanupError) {
                console.error(`Failed to cleanup schedule '${newScheduleName}' during error handling:`, cleanupError);
            }
        }
        return { statusCode: 500, body: JSON.stringify({ error: `Could not set reminder: ${error.message}` }) };
    }
};