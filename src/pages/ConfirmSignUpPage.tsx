// src/pages/ConfirmSignUpPage.tsx
import React, { useState, useEffect } from 'react';
// Import v6+ specific functions
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import '../styles/Form.css';

function ConfirmSignUpPage() {
  const [username, setUsername] = useState(''); // This IS the email used for signup
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
      if (location.state?.username) {
          setUsername(location.state.username);
      } else {
          setError("Username (email) not provided. Please go back to Sign Up or Login.");
      }
  }, [location.state]);

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
        setError("Username (email) is required to confirm sign up.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setResendStatus(null);

    try {
      console.log(`Attempting to confirm sign up for ${username} (v6)...`);
      // Use imported confirmSignUp
      const { isSignUpComplete, nextStep } = await confirmSignUp({
          username: username,
          confirmationCode: code,
      });

      console.log("Confirm sign up result:", { isSignUpComplete, nextStep });

      if (isSignUpComplete) {
         console.log("Sign up confirmed successfully (v6)!");
         alert("Account confirmed successfully! Please login.");
         navigate('/login');
      } else {
           // Handle other next steps? Should generally be complete here.
           console.warn("Confirmation might require additional step?", nextStep?.signUpStep);
           setError(`Confirmation requires step: ${nextStep?.signUpStep}`);
           setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Error confirming sign up (v6):", err);
       if (err.name === 'CodeMismatchException') {
           setError('Invalid confirmation code.');
       } else if (err.name === 'ExpiredCodeException') {
           setError('Confirmation code has expired. Please request a new one.');
       } else if (err.name === 'UserNotFoundException') {
            setError('User not found. Please sign up again or contact support.'); // Less likely here
       } else {
           setError(err.message || 'An error occurred during confirmation.');
       }
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
        if (!username) {
             setError("Username (email) is required to resend code.");
             return;
        }
        setIsLoading(true);
        setError(null);
        setResendStatus('Sending...');
        try {
            // Use imported resendSignUpCode
            await resendSignUpCode({ username: username });
            setResendStatus('Confirmation code resent successfully. Check your email.');
        } catch (err: any) {
             console.error("Error resending code (v6):", err);
             setError(err.message || 'Failed to resend code.');
             setResendStatus(null);
        } finally {
             setIsLoading(false);
        }
    };

  // ... (rest of the JSX form remains the same) ...
    return (
        <div className="form-container">
          <h2>Confirm Sign Up</h2>
           <p>A confirmation code has been sent to {username || 'your email'}.</p>
          <form onSubmit={handleConfirmSignUp}>
            <label htmlFor="username-confirm">Email / Username</label>
             <input
              type="text"
              id="username-confirm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Your email/username"
              disabled={!!location.state?.username}
            />
            <label htmlFor="code">Confirmation Code</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="Enter the code"
            />
            {error && <p className="error-message">{error}</p>}
            {resendStatus && <p style={{ color: 'lightgreen' }}>{resendStatus}</p>}
            <button type="submit" disabled={isLoading || !username}>
              {isLoading ? 'Confirming...' : 'Confirm Account'}
            </button>
          </form>
           <button onClick={handleResendCode} disabled={isLoading || !username} style={{ marginTop: '10px', backgroundColor: '#444' }}>
               Resend Code
           </button>
            <p className="form-link">
                Remembered your password? <Link to="/login">Login</Link>
            </p>
        </div>
      );
}

export default ConfirmSignUpPage;