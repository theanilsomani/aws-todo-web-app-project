const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand: DDBDeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { SchedulerClient, DeleteScheduleCommand: SchedulerDeleteCommand } = require("@aws-sdk/client-scheduler");
const { validateToken } = require('./auth'); 

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const schedulerClientInstance = new SchedulerClient({});

const TABLE_NAME = process.env.TABLE_NAME;
const SCHEDULE_GROUP_NAME = process.env.SCHEDULE_GROUP_NAME || 'default';

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  // Ensure TABLE_NAME is checked early
  if (!TABLE_NAME) {
    console.error("FATAL: TABLE_NAME environment variable not set!");
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
  }

  // --- Authentication ---
  const authHeader = event.headers?.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    console.log("Authorization header missing or malformed");
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authorization token missing" })
    };
  }

  const validatedPayload = await validateToken(token);
  if (!validatedPayload) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Invalid or expired token" })
    };
  }
  const userId = validatedPayload.sub;
  // --- End Authentication ---

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid request body - must be JSON" })
    };
  }

  const { taskId } = requestBody;

  if (!taskId || typeof taskId !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing or invalid taskId in request body or query string"
      })
    };
  }

  try {
    // 1. Get the task to find its scheduleName (if any)
    const getParams = {
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
      ProjectionExpression: "scheduleName"
    };
    const taskData = await ddbDocClient.send(new GetCommand(getParams));
    const scheduleNameToDelete = taskData.Item?.scheduleName;

    // 2. If a schedule exists, delete it from EventBridge Scheduler
    if (scheduleNameToDelete) {
      console.log(`Task ${taskId} has schedule '${scheduleNameToDelete}'. Attempting deletion.`);
      try {
        await schedulerClientInstance.send(new SchedulerDeleteCommand({
          Name: scheduleNameToDelete,
          GroupName: SCHEDULE_GROUP_NAME
        }));
        console.log(`Successfully deleted schedule: ${scheduleNameToDelete}`);
      } catch (scheduleError) {
        if (scheduleError.name !== 'ResourceNotFoundException') {
          console.warn(`Error deleting schedule '${scheduleNameToDelete}', but proceeding with task deletion:`, scheduleError);
        } else {
          console.log(`Schedule '${scheduleNameToDelete}' not found, likely already processed/deleted.`);
        }
      }
    }

    // 3. Delete the task from DynamoDB
    const deleteDbParams = {
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
      ConditionExpression: "attribute_exists(PK)"
    };
    await ddbDocClient.send(new DDBDeleteCommand(deleteDbParams));
    console.log(`Task ${taskId} deleted successfully from DB for user ${userId}`);
    return { statusCode: 200, body: JSON.stringify({ message: 'Task and associated reminder (if any) deleted successfully' }) };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      console.error(
        `Delete failed for user ${userId}, taskId ${taskId}: Task not found.`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Task not found or already deleted"
        })
      };
    }

    console.error("Error during task/schedule deletion:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Could not delete task or schedule: ${error.message}`
      })
    };
  }
};
