const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { validateToken } = require('./auth');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'TodoAppTable';

exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // --- Authentication ---
    // Check for lowercase 'authorization' header key
    const authHeader = event.headers?.authorization; // Use lowercase 'a'
    const token = authHeader?.split(' ')[1]; // Extractinf token from "Bearer <token>"

    if (!token) {
        console.log("Authorization header missing or malformed"); // Add log for debugging
        return { statusCode: 401, body: JSON.stringify({ error: 'Authorization token missing' }) };
    }
    
    const validatedPayload = await validateToken(token);
    if (!validatedPayload) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }
    const userId = validatedPayload.sub;
    // --- End Authentication ---

    const params = {
        TableName: TABLE_NAME,
        // Select all items where the Partition Key IS the user's ID
        // And the Sort Key STARTS WITH 'TASK#' to only get tasks
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
        ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk_prefix': 'TASK#'
        },
    };

    try {
        const command = new QueryCommand(params);
        const data = await docClient.send(command);
        const tasks = data.Items || []; // Default to empty array if no tasks found

        const frontendTasks = tasks.map(task => ({
            taskId: task.taskId,
            taskText: task.taskText,
            isCompleted: task.isCompleted,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));

        console.log(`Found ${tasks.length} tasks for user ${userId}`);

        return {
            statusCode: 200,
            body: JSON.stringify(frontendTasks) // Send back the mapped array
        };
    } catch (error) {
        console.error("DynamoDB Error listing tasks:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Could not list tasks: ${error.message}` })
        };
    }
};