// src/pages/SignUpPage.tsx
import React, { useState } from 'react';
// Import v6+ specific function
import { signUp } from 'aws-amplify/auth';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Form.css';

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      console.log("Attempting sign up (v6)...");
      // Use imported signUp function
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email, // Use email as the username
        password: password,
        options: {
          userAttributes: {
            email: email, // Pass email attribute
          },
          // Enable auto sign in after confirmation (handled by confirm step usually)
          // autoSignIn: true // Let's rely on confirm step then login
        }
      });

      console.log("Sign up result:", { isSignUpComplete, userId, nextStep });

      if (nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
         console.log("Sign up requires confirmation.");
         // Pass username (email) to confirmation page
         navigate('/confirm-signup', { state: { username: email } });
      } else if (isSignUpComplete) {
          // Should generally not happen if confirmation is required
           console.log("Sign up complete without confirmation? Unexpected.");
           alert("Sign up complete! Please login.");
           navigate('/login');
      } else {
          // Handle other potential next steps?
           console.warn("Unhandled signUp next step:", nextStep?.signUpStep);
           setError(`Sign up requires additional step: ${nextStep?.signUpStep}`);
           setIsLoading(false);
      }

    } catch (err: any) {
      console.error("Error signing up (v6):", err);
       if (err.name === 'UsernameExistsException') {
          setError('An account with this email already exists.');
       } else {
          setError(err.message || 'An error occurred during sign up.');
       }
      setIsLoading(false);
    }
  };

  // ... (rest of the JSX form remains the same) ...
   return (
        <div className="form-container">
          <h2>Sign Up</h2>
          <form onSubmit={handleSignUp}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Choose a password"
            />
             <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </form>
          <p className="form-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
    );
}

export default SignUpPage;