const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID,
            region: import.meta.env.VITE_AWS_REGION
        }
    }
};
export default amplifyConfig;
