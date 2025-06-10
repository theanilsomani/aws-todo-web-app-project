const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { validateToken } = require('./auth');
const { randomUUID } = require('crypto'); // For generating task IDs

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'TodoAppTable';

exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // --- Authentication ---
    // Check for lowercase 'authorization' header key
    const authHeader = event.headers?.authorization; // Use lowercase 'a'
    const token = authHeader?.split(' ')[1]; // Extracting token from "Bearer <token>"

    if (!token) {
        console.log("Authorization header missing or malformed");
        return { statusCode: 401, body: JSON.stringify({ error: 'Authorization token missing' }) };
    }

    const validatedPayload = await validateToken(token);
    if (!validatedPayload) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }
    const userId = validatedPayload.sub; // The user's unique Cognito ID
    // --- End Authentication ---

    let requestBody;
    try {
        requestBody = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body - must be JSON' }) };
    }

    const { taskText } = requestBody;
    if (!taskText || typeof taskText !== 'string' || taskText.trim() === '') {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid taskText in request body' }) };
    }

    const taskId = randomUUID(); // Generate a unique ID for the task
    const timestamp = new Date().toISOString();

    const params = {
        TableName: TABLE_NAME,
        Item: {
            PK: `USER#${userId}`,        // User ID as Partition Key
            SK: `TASK#${taskId}`,        // Task ID as Sort Key
            userId: userId,              // Store userId attribute too (optional, redundant but can be useful)
            taskId: taskId,              // Store taskId attribute too
            taskText: taskText.trim(),
            isCompleted: false,          // Default to not completed
            createdAt: timestamp,
            updatedAt: timestamp,
            entityType: "TASK"           // To distinguish from profile items etc.
        },
    };

    try {
        await docClient.send(new PutCommand(params));
        console.log(`Task created successfully for user ${userId}, taskId ${taskId}`);
        // Return only essential info, not the whole DynamoDB item structure
        return {
            statusCode: 201, // 201 Created
            body: JSON.stringify({
                message: 'Task created successfully',
                taskId: taskId,
                taskText: params.Item.taskText,
                isCompleted: params.Item.isCompleted,
                createdAt: params.Item.createdAt
            })
        };
    } catch (error) {
        console.error("DynamoDB Error creating task:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Could not create task: ${error.message}` })
        };
    }
};