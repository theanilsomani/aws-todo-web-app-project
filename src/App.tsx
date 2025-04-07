// src/App.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { getCurrentUser, fetchAuthSession, signOut } from "aws-amplify/auth";
import { Hub } from 'aws-amplify/utils';
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ConfirmSignUpPage from "./pages/ConfirmSignUpPage";
import TodoListPage from "./pages/TodoListPage";
import "./styles/App.css"; // Import App styles

// Define a type for user info based on v6 getCurrentUser
interface UserInfo {
  userId: string; // Typically the 'sub' claim
  username: string; // The Cognito username
  signInDetails?: {
    // Structure might vary slightly
    loginId?: string; // e.g., the email used to sign in
    // ... other details
  };
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const navigate = useNavigate();
  const location = useLocation(); // Get current location

  const checkAuthState = useCallback(async () => {
    console.log("Checking auth state (v6)...");
    try {
      // 1. Check if a session exists (and is valid)
      await fetchAuthSession({ forceRefresh: false }); // Throws if no valid session
      // 2. If session exists, get user details
      const currentUser = await getCurrentUser();
      setIsAuthenticated(true);
      setUser({
        // Adapt based on actual structure of getCurrentUser result
        userId: currentUser.userId,
        username: currentUser.username,
        // Potentially map signInDetails if needed
      });
      console.log("User is authenticated:", currentUser.username);

      // Redirect check
      if (
        ["/login", "/signup", "/confirm-signup"].includes(location.pathname)
      ) {
        console.log("Redirecting authenticated user from public route to /");
        navigate("/", { replace: true });
      }
    } catch (error) {
      // fetchAuthSession throws if not authenticated
      console.log("User is not authenticated (v6 check).");
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.pathname]); // Add dependencies

  useEffect(() => {
    checkAuthState(); // Initial check

    // Hub listener (structure remains similar, but access Hub differently)
    const listener = Hub.listen("auth", ({ payload }) => {
      // Destructure payload
      const { event, data } = payload; // Get event type and data
      switch (event) {
        case "signedIn":
        case "autoSignIn": // Handle auto sign-in as well
          console.log(`Auth event: ${event}`);
          checkAuthState();
          break;
        case "signedOut":
          console.log("Auth event: signedOut");
          setIsAuthenticated(false);
          setUser(null);
          navigate("/login");
          break;
        // v6 events might differ slightly, check documentation
        case "signInWithRedirect":
          console.log("Auth event: signInWithRedirect");
          // Handle redirect scenarios if using hosted UI (not applicable here)
          break;
        case "signInWithRedirect_failure":
        case "signIn_failure": // Handle sign-in errors passed via Hub
          console.error(`Auth event: ${event}`, data);
          setIsAuthenticated(false);
          setUser(null);
          break;
        // Add other cases if needed
        default:
          // console.log('Unhandled Auth Hub event:', event);
          break;
      }
    });

    // Cleanup listener
    return () => {
      console.log("Removing auth listener (v6)");
      // Hub listener returns a function to unsubscribe
      listener();
    };
  }, [checkAuthState, navigate]);

  // Handler passed to LoginPage to trigger state update/redirect after login
  const handleAuthSuccess = () => {
    console.log("handleAuthSuccess called (v6)");

    checkAuthState();
    // Navigation is now handled by checkAuthState based on location
    // navigate('/', { replace: true }); // Avoid duplicate navigation
  };

  // Handler passed to TodoListPage to update App state on sign out
  const handleSignOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    // Navigation is handled by the Hub listener or App's checkAuthState now
  };

  // --- Protected Route Component ---
  // Renders child component if authenticated, otherwise redirects to login
  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    if (!isAuthenticated) {
      console.log("ProtectedRoute: Not authenticated, redirecting to login");
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  };

  if (isAuthLoading) {
    return <div className="loading-container">Authenticating...</div>;
  }

  // Extract email differently if needed, check 'user' object structure
  const userEmail = user
    ? user.signInDetails?.loginId || user.username
    : undefined;

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginPage onLoginSuccess={handleAuthSuccess} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !isAuthenticated ? <SignUpPage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/confirm-signup"
          element={
            !isAuthenticated ? (
              <ConfirmSignUpPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Protected Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TodoListPage onSignOut={handleSignOut} userEmail={userEmail} />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Route */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
