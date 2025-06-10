import React, { useState } from 'react';
import { signIn } from 'aws-amplify/auth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/Form.css';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
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
      const { isSignedIn, nextStep } = await signIn({
          username: username, 
          password: password,
      });

      console.log("Sign in result:", { isSignedIn, nextStep });

      if (isSignedIn) {
         console.log("Sign in successful (v6)");
         onLoginSuccess(); 
      } else if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
         // Handling case where user needs to confirm account first
          console.log("Sign in needs confirmation step");
          setError('User not confirmed. Redirecting to confirmation.');
          // Passing username (email) to confirmation page
          navigate('/confirm-signup', { state: { username: username } });
          setIsLoading(false);
          return; 
      } else {
          console.warn("Unhandled signIn next step:", nextStep?.signInStep);
          setError(`Login requires additional step: ${nextStep?.signInStep}`);
          setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Error signing in (v6):", err);
      // Checking specific error codes/names from Amplify v6
      if (err.name === 'UserNotFoundException' || err.name === 'NotAuthorizedException') {
          setError('Incorrect username or password.');
      } else if (err.name === 'UserNotConfirmedException') {
           setError('User not confirmed. Redirecting to confirmation.');
           navigate('/confirm-signup', { state: { username: username } });
           setIsLoading(false);
           return;
      } else {
           setError(err.message || 'An error occurred during login.');
      }
      setIsLoading(false); 
    }
  };

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