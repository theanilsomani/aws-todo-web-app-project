// src/aws-exports.js
// IMPORTANT: Replace placeholders with your actual Cognito values
import { Amplify } from "aws-amplify"

const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: 'ap-south-1_3OVcWWF6e', // e.g., ap-south-1_AbCdEfGhI
            userPoolClientId: '2ha3busqvod07k3m6cfcki4r9q', // e.g., 1a2b3c4d5e6f7g8h9i0j
            region: 'ap-south-1' // e.g., ap-south-1 (Optional if derivable)
        }
    }
};
export default amplifyConfig;