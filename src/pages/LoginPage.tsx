// src/pages/LoginPage.tsx
import React, { useState } from 'react';
// Import v6+ specific function
import { signIn } from 'aws-amplify/auth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/Form.css';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState(''); // Still use 'username' for the input field
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting sign in (v6)...");
       // Use the imported signIn function
      const { isSignedIn, nextStep } = await signIn({
          username: username, // Pass email/username here
          password: password,
      });

      console.log("Sign in result:", { isSignedIn, nextStep });

      if (isSignedIn) {
         console.log("Sign in successful (v6)");
         onLoginSuccess(); // Notify App component
      } else if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
         // Handle case where user needs to confirm account first
          console.log("Sign in needs confirmation step");
          setError('User not confirmed. Redirecting to confirmation.');
          // Pass username (email) to confirmation page
          navigate('/confirm-signup', { state: { username: username } });
          setIsLoading(false); // Stop loading as we are navigating
          return; // Stop further execution
      } else {
          // Handle other next steps if applicable (e.g., MFA, new password required)
          console.warn("Unhandled signIn next step:", nextStep?.signInStep);
          setError(`Login requires additional step: ${nextStep?.signInStep}`);
          setIsLoading(false);
      }
      // Loading state is handled by App component's checkAuthState on success
    } catch (err: any) {
      console.error("Error signing in (v6):", err);
      // Check specific error codes/names from Amplify v6
      if (err.name === 'UserNotFoundException' || err.name === 'NotAuthorizedException') {
          setError('Incorrect username or password.');
      } else if (err.name === 'UserNotConfirmedException') { // Catch explicit confirmation error
           setError('User not confirmed. Redirecting to confirmation.');
           navigate('/confirm-signup', { state: { username: username } });
           setIsLoading(false);
           return;
      } else {
           setError(err.message || 'An error occurred during login.');
      }
      setIsLoading(false); // Set loading false only on error
    }
  };

  // ... (rest of the JSX form remains the same) ...
   return (
        <div className="form-container">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <label htmlFor="username">Email or Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your email or username"
            />
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="form-link">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </div>
    );
}

export default LoginPage;