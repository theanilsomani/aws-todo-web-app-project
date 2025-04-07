// src/aws-exports.js
// IMPORTANT: Replace placeholders with your actual Cognito values

const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID, // Access the env variable
            userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID, // Access the env variable
            region: import.meta.env.VITE_AWS_REGION // Access the env variable
        }
    }
};
export default amplifyConfig;
