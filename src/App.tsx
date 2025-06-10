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
import HomePage from "./pages/HomePage";
import TodoListPage from "./pages/TodoListPage";
import "./styles/App.css";

// Define a type for user info based on v6 getCurrentUser
interface UserInfo {
  userId: string; 
  username: string;
  signInDetails?: {
    loginId?: string; 
  };
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuthState = useCallback(async () => {
    console.log("Checking auth state (v6)...");
    try {
      await fetchAuthSession({ forceRefresh: false }); 
      const currentUser = await getCurrentUser();
      setIsAuthenticated(true);
      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
      });
      console.log("User is authenticated:", currentUser.username);

      // Redirect check
      if (
        ["/home", "/login", "/signup", "/confirm-signup"].includes(
          location.pathname
        )
      ) {
        console.log("Redirecting authenticated user from public route to /app");
        navigate("/app", { replace: true });
      }
    } catch (error) {
      console.log("User is not authenticated (v6 check).");
      setIsAuthenticated(false);
      setUser(null);
      if (location.pathname.startsWith("/app")) {
        navigate("/login", { replace: true, state: { from: location } });
      }
    } finally {
      setIsAuthLoading(false);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    checkAuthState();

    // listener returns a function to unsubscribe
    const listener = Hub.listen("auth", ({ payload }) => {
      console.log('Auth Hub Event:', payload.event);

      switch (payload.event) {
        case "signedIn":
          console.log("Auth event: signedIn");
          checkAuthState();
          break;

        case "signedOut":
          console.log("Auth event: signedOut");
          setIsAuthenticated(false);
          setUser(null);
          navigate("/home");
          break;

        case "signInWithRedirect_failure": 
          console.error(`Auth event: ${payload.event}`, payload.data);
          break;

        case "tokenRefresh":
          console.log("Auth event: tokenRefresh");
          break;
        case "tokenRefresh_failure":
          console.error("Auth event: tokenRefresh_failure", payload.data);
          checkAuthState();
          break;

        default:
          // console.log('Unhandled Auth Hub event:', payload.event);
          break;
      }
    });

    return () => {
      console.log("Removing auth listener (v6)");
      listener(); 
    };
  }, [checkAuthState, navigate]);

  const handleAuthSuccess = () => {
    console.log("handleAuthSuccess called (v6)");

    checkAuthState();
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  // --- Protected Route Component ---
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
    return <div className="loading-container">Loading...</div>;
  }

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
          path="/app" 
          element={
            <ProtectedRoute>
              <TodoListPage onSignOut={handleSignOut} userEmail={userEmail} />
            </ProtectedRoute>
          }
        />

        {/* Redirect root path to /home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/app" : "/home"} replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
