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
import { Hub } from "aws-amplify/utils";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ConfirmSignUpPage from "./pages/ConfirmSignUpPage";
import HomePage from "./pages/HomePage"; // <-- Import HomePage
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
      // --- NEW: Redirect authenticated users trying to access public pages ---
      if (
        ["/home", "/login", "/signup", "/confirm-signup"].includes(
          location.pathname
        )
      ) {
        console.log("Redirecting authenticated user from public route to /app");
        navigate("/app", { replace: true }); // Redirect to the app page
      }
    } catch (error) {
      // fetchAuthSession throws if not authenticated
      console.log("User is not authenticated (v6 check).");
      setIsAuthenticated(false);
      setUser(null);
      // --- NEW: Redirect unauthenticated users trying to access protected page ---
      if (location.pathname.startsWith("/app")) {
        // If trying to access /app or subroutes
        navigate("/login", { replace: true, state: { from: location } }); // Redirect to login
      }
    } finally {
      setIsAuthLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.pathname]); // Add dependencies

  useEffect(() => {
    checkAuthState();

    // listener returns a function to unsubscribe
    const listener = Hub.listen("auth", ({ payload }) => {
      // payload structure depends on the event type
      console.log('Auth Hub Event:', payload.event); // Log just the event name initially

      switch (payload.event) {
        case "signedIn":
          // 'signedIn' can happen from manual sign-in or potentially auto sign-in flows
          console.log("Auth event: signedIn");
          checkAuthState();
          break;
        // Note: 'autoSignIn' event might not be explicitly emitted in v6,
        // successful session fetch often covers this. Check Amplify docs if needed.

        case "signedOut":
          console.log("Auth event: signedOut");
          setIsAuthenticated(false);
          setUser(null);
          navigate("/home");
          break;

        // Handling Sign-in Failures:
        // Often, errors are better caught in the specific signIn function call's catch block.
        // Hub might emit generic errors, but specific error handling in the component is usually preferred.
        // Let's comment out the specific failure cases for now, as they caused TS errors.
        // Check Amplify v6 Hub documentation for exact error event names/payloads if needed.
        /*
             case 'signIn_failure': // Might not exist or have different name/payload
                 console.error(`Auth event: ${payload.event}`, payload.data); // Log the data if it exists
                 setIsAuthenticated(false);
                 setUser(null);
                 break;
             */

        case "signInWithRedirect_failure": // Keep standard ones if needed
          console.error(`Auth event: ${payload.event}`, payload.data);
          // Handle redirect failures if using hosted UI
          break;

        // Add other relevant cases based on Amplify v6 docs or observed logs
        case "tokenRefresh":
          console.log("Auth event: tokenRefresh");
          // Session was refreshed, maybe update UI if needed, but checkAuthState likely covers it.
          break;
        case "tokenRefresh_failure":
          console.error("Auth event: tokenRefresh_failure", payload.data);
          // Token refresh failed, user might need to sign in again.
          checkAuthState(); // Re-check state, might lead to logout
          break;

        default:
          // console.log('Unhandled Auth Hub event:', payload.event);
          break;
      }
    });

    return () => {
      console.log("Removing auth listener (v6)");
      listener(); // Unsubscribe
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
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      console.log("ProtectedRoute: Not authenticated, redirecting to login");
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  };

  if (
    isAuthLoading &&
    !["/home", "/login", "/signup", "/confirm-signup"].includes(
      location.pathname
    )
  ) {
    // Show loading only for initial load on potentially protected routes
    // Allows public routes to render immediately even if auth check is pending
    return <div className="loading-container">Loading...</div>;
  }

  // Extract email differently if needed, check 'user' object structure
  // Extract email for display (remains the same)
  const userEmail = user
    ? user.signInDetails?.loginId || user.username
    : undefined;

  return (
    <div className="App">
      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/home" element={<HomePage />} />
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginPage onLoginSuccess={handleAuthSuccess} />
            ) : (
              <Navigate to="/app" replace />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !isAuthenticated ? <SignUpPage /> : <Navigate to="/app" replace />
          }
        />
        <Route
          path="/confirm-signup"
          element={
            !isAuthenticated ? (
              <ConfirmSignUpPage />
            ) : (
              <Navigate to="/app" replace />
            )
          }
        />

        {/* --- Protected Route --- */}
        <Route
          path="/app" // Changed path to /app
          element={
            <ProtectedRoute>
              <TodoListPage onSignOut={handleSignOut} userEmail={userEmail} />
            </ProtectedRoute>
          }
        />

        {/* --- Redirects and Catch-all --- */}
        {/* Redirect root path to /home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        {/* Catch-all: Redirect unknown paths to home or app based on auth */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/app" : "/home"} replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
