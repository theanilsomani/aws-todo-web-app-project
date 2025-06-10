const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

// Instantiate SNS client once, outside the handler
const snsClient = new SNSClient({});
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

// Initial check for environment variable (good practice)
if (!SNS_TOPIC_ARN) {
    console.error("FATAL: Missing environment variable: SNS_TOPIC_ARN. Notification will fail.");
}

exports.handler = async (event) => {
    console.log("sendReminderNotificationLambda received event (from scheduler):", JSON.stringify(event, null, 2));

    // checking env var inside handler for safety, in case init check was bypassed or Lambda reused an old env
    if (!SNS_TOPIC_ARN) {
        console.error("SNS_TOPIC_ARN is not set in the environment. Cannot send notification.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error: SNS Topic not configured." }) };
    }

    // The 'event' here IS the 'Input' payload from the EventBridge Scheduler
    const { userId, taskId, reminderEmail, reminderMessage } = event;

    if (!reminderEmail || !taskId) { // userId is also good to have for logging/context
        console.error("Missing reminderEmail or taskId in the event payload from scheduler.");
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid payload from scheduler' }) };
    }

    const subject = `Reminder: Your To-Do Task!`; // Keep subject concise
    const messageBody = reminderMessage || `This is a friendly reminder for your task (ID: ${taskId}). Don't forget to check it out!`;

    const topicPublishParams = {
        TopicArn: SNS_TOPIC_ARN,
        Subject: subject,
        // The message that gets sent to ALL subscribers of the topic
        Message: `Hello,\n\nA reminder was scheduled for task ID: ${taskId}.\n\nYour custom message: ${messageBody}\n\n(This reminder was intended for user associated with email: ${reminderEmail})\n\nThanks,\nYour To-Do App`,
    };

    try {
        await snsClient.send(new PublishCommand(topicPublishParams));
        console.log(`Published reminder to SNS Topic ${SNS_TOPIC_ARN} for task ${taskId}, originally intended for ${reminderEmail}.`);
        return { statusCode: 200, body: JSON.stringify({ message: 'Reminder processed and published to SNS successfully' }) };
    } catch (error /*: any*/) {
        console.error("Error sending SNS notification:", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Failed to send notification: ${error.message}` }) };
    }
};