const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand: DDBUpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { SchedulerClient, DeleteScheduleCommand: SchedulerDeleteCommand } = require("@aws-sdk/client-scheduler");
const { validateToken } = require('./auth');

// --- Instantiating clients (only once at the top level) ---
const ddbClientInstance = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClientInstance); 
const schedulerClientInstance = new SchedulerClient({});

const TABLE_NAME = process.env.TABLE_NAME;
const SCHEDULE_GROUP_NAME = process.env.SCHEDULE_GROUP_NAME || 'default';

exports.handler = async (event) => {
    console.log("Received event for updateTaskLambda:", JSON.stringify(event, null, 2));

    if (!TABLE_NAME) {
        console.error("FATAL: TABLE_NAME environment variable not set for updateTaskLambda!");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
    }

    // --- Authentication ---
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

    let requestBody;
    try {
        requestBody = JSON.parse(event.body || '{}');
    } catch (e) {
        console.error("Invalid JSON in request body:", e);
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body - must be JSON' }) };
    }

    const { taskId, taskText, isCompleted } = requestBody;

    if (!taskId || typeof taskId !== 'string') {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid taskId' }) };
    }
    if (typeof taskText === 'undefined' && typeof isCompleted === 'undefined') {
        return { statusCode: 400, body: JSON.stringify({ error: 'No fields to update (taskText or isCompleted)' }) };
    }

    // --- Logic to handle task update and potential schedule deletion ---
    let existingScheduleName;
    let wasAlreadyCompleted = false;

    try {
        // 1. Fetch current task state to check scheduleName and current completion status
        const getTaskParams = {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
            ProjectionExpression: "scheduleName, isCompleted" // Fetch only necessary attributes
        };
        const taskData = await ddbDocClient.send(new GetCommand(getTaskParams));

        if (!taskData.Item) {
            console.log(`Task not found for update: PK=USER#${userId}, SK=TASK#${taskId}`);
            return { statusCode: 404, body: JSON.stringify({ error: 'Task not found' }) };
        }
        existingScheduleName = taskData.Item.scheduleName;
        wasAlreadyCompleted = taskData.Item.isCompleted === true;
        console.log(`Fetched task for update. Existing schedule: ${existingScheduleName}, Was completed: ${wasAlreadyCompleted}`);

        // 2. Determine DDB Update Expression and if reminder should be cleared
        let updateExpression = 'SET updatedAt = :updatedAtVal';
        const expressionAttributeValues = { ':updatedAtVal': new Date().toISOString() };
        let shouldClearReminderSchedule = false;

        if (typeof taskText === 'string') {
            updateExpression += ', taskText = :taskTextVal';
            expressionAttributeValues[':taskTextVal'] = taskText;
        }

        if (typeof isCompleted === 'boolean') {
            updateExpression += ', isCompleted = :isCompletedVal';
            expressionAttributeValues[':isCompletedVal'] = isCompleted;
            if (isCompleted === true && !wasAlreadyCompleted && existingScheduleName) {
                console.log(`Task ${taskId} is being marked complete and had a schedule.`);
                shouldClearReminderSchedule = true;
                updateExpression += ", isReminderSet = :isReminderSetFalseVal REMOVE reminderTime, reminderEmail, reminderMessage, scheduleName";
                expressionAttributeValues[":isReminderSetFalseVal"] = false;
            }
        }

        // 3. If reminder needs to be cleared, delete the EventBridge Schedule
        if (shouldClearReminderSchedule && existingScheduleName) {
            console.log(`Attempting to delete schedule: ${existingScheduleName}`);
            try {
                await schedulerClientInstance.send(new SchedulerDeleteCommand({
                    Name: existingScheduleName,
                    GroupName: SCHEDULE_GROUP_NAME
                }));
                console.log(`Successfully deleted schedule: ${existingScheduleName}`);
            } catch (scheduleError) {
                if (scheduleError.name !== 'ResourceNotFoundException') {
                    console.warn(`Error deleting schedule '${existingScheduleName}' for completed task, but proceeding with DB update:`, scheduleError);
                } else {
                    console.log(`Schedule '${existingScheduleName}' not found for deletion (completed task), likely already processed.`);
                }
            }
        }

        // 4. Update DynamoDB item
        const ddbUpdateParams = {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: "attribute_exists(PK)",
            ReturnValues: "ALL_NEW"
        };
        console.log("Attempting DDB update with params:", JSON.stringify(ddbUpdateParams, null, 2));
        const updatedData = await ddbDocClient.send(new DDBUpdateCommand(ddbUpdateParams));
        console.log(`Task ${taskId} updated successfully in DB for user ${userId}.`);
        return { statusCode: 200, body: JSON.stringify(updatedData.Attributes) };

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.error(`ConditionalCheckFailedException for task ${taskId}:`, error);
            return { statusCode: 404, body: JSON.stringify({ error: 'Task not found or condition check failed during update' }) };
        }
        console.error("Error updating task or its schedule:", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Could not update task: ${error.message}` }) };
    }
};