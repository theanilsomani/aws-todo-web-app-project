const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');

// --- Configuration ---
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_REGION = process.env.COGNITO_REGION;

if (!COGNITO_USER_POOL_ID || !COGNITO_REGION) {
    throw new Error("Cognito User Pool ID and Region must be set in environment variables");
}

const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
const JWKS_URL = `${COGNITO_ISSUER}/.well-known/jwks.json`;

let cachedPems = null;

const getPublicPems = async () => {
    if (cachedPems) {
        console.log("Using cached PEMs");
        return cachedPems;
    }

    console.log("Fetching JWKS from:", JWKS_URL);
    try {
        const response = await fetch(JWKS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
        }
        const jwks = await response.json();

        if (!jwks || !Array.isArray(jwks.keys)) {
             throw new Error('Invalid JWKS format received');
        }


        cachedPems = {};
        for (const key of jwks.keys) {
            cachedPems[key.kid] = jwkToPem(key);
        }
        console.log("Successfully fetched and converted PEMs. Caching.");
        return cachedPems;
    } catch (error) {
        console.error("Error fetching or processing JWKS:", error);
        cachedPems = null;
        throw error;
    }
};

const validateToken = async (token) => {
    try {
        const pems = await getPublicPems();
        const decodedJwt = jwt.decode(token, { complete: true });

        if (!decodedJwt) {
            console.error("Invalid token - unable to decode");
            return null;
        }

        // 1. Check if KID exists
        const kid = decodedJwt.header.kid;
        const pem = pems[kid];
        if (!pem) {
            console.error(`Invalid token - KID "${kid}" not found in JWKS`);
            return null;
        }

        // 2. Verify the signature using the corresponding PEM
        const payload = jwt.verify(token, pem, { issuer: COGNITO_ISSUER });

        console.log("Token validated successfully for user:", payload.sub);
        return payload;

    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.error("Invalid token - expired:", error.message);
        } else if (error instanceof jwt.JsonWebTokenError) {
            console.error("Invalid token - verification failed:", error.message);
        } else {
            console.error("Error validating token:", error);
        }
        return null;
    }
};

module.exports = { validateToken };