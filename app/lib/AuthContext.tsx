import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
  type FC,
  type Context
} from 'react';
// Use react-router-dom's useNavigate for SPA navigation
import { useNavigate } from 'react-router';

// Define a local type for the user data the frontend expects.
interface FrontendUser {
  _id: string; // Assuming the user ID is always present
  username: string;
  email: string;
  // Add other properties you expect the user object to have, excluding password
}

// --- Define the shape of the context value ---
interface AuthContextType {
  user: FrontendUser | null; // Current user or null
  login: (credentials: any) => Promise<void>; // Local login
  loginWithGithub: () => void; // Initiate GitHub OAuth flow
  // Removed handleOAuthCallback as the backend handles the cookie
  logout: () => Promise<void>; // Logout function
  isLoading: boolean; // Loading state indicator
}

// --- Create the context with a default value ---
// Provide a sensible default that matches AuthContextType
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {
    /* Default */
  },
  loginWithGithub: () => {
    /* Default */
  },
  logout: async () => {
    /* Default */
  },
  isLoading: true, // Start loading until initial check is done
});

// --- Define Props for the Provider ---
interface AuthProviderProps {
  children: ReactNode;
}

// --- Create the Provider Component ---
export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FrontendUser | null>(null);
  // Initialize token state to null - it will be set in useEffect on the client
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading
  const navigate = useNavigate();

  // --- Fetch User Data based on Token ---
  // Helper function to get user data if a token exists
  const fetchUserSession = async (): Promise<void> => {
     console.log('Attempting to fetch user data with token...');
     setIsLoading(true);
     // Don't set isLoading here, it's handled by the initial useEffect check
     // setIsLoading(true);
     try {
      // The browser automatically includes the HttpOnly cookie in this request
      const response = await fetch('/api/auth/session');

      if (response.ok) {
        const data = await response.json();
        // We expect the backend to return the user data if the cookie is valid
        if (data.user) {
          setUser(data.user); // Set user data from response
          console.log('User session found and data fetched successfully.');
        } else {
          // This case might indicate a backend issue, but handle it
          console.warn('Session endpoint returned OK but no user data.');
          setUser(null);
        }
      } else if (response.status === 401) {
        // 401 means the cookie was missing or invalid/expired
        console.log('No valid user session found (401 Unauthorized).');
        setUser(null); // Ensure user is null if unauthorized
        // The backend should handle clearing the cookie on its end if it's expired
      } else {
        // Handle other potential errors during the session check
        console.error('Error fetching user session, status:', response.status);
        setUser(null);
      }
    } catch (error) {
      console.error('Network or other error during session fetch:', error);
      setUser(null);
    } finally {
      setIsLoading(false); // Finish loading after the session check
    }
  };


  // --- Local Login Function ---
  // Now, the backend sets the HttpOnly cookie directly
  const login = async (credentials: any): Promise<void> => {
    setIsLoading(true); // Set loading during login attempt
    console.log('Attempting local login...');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Login failed with status: ${response.status}`,
        );
      }

      const data = await response.json(); // Expect { user: IUser, message: string }

      if (!data.user) {
        throw new Error('Login response missing user data.');
      }

      // The backend has set the HttpOnly cookie. We don't handle the token here.
      setUser(data.user); // Update context state with user data
      console.log('Local login successful. Cookie set by backend.');
      navigate('/dashboard'); // Navigate after successful login

    } catch (error) {
      console.error('Local login error:', error);
      setUser(null); // Clear user state on login failure
      throw error; // Re-throw error for the component to handle
    } finally {
      setIsLoading(false); // Finish loading after login attempt
    }
  };

  // --- GitHub Login Initiation ---
  const loginWithGithub = (): void => {
    console.log('Initiating GitHub login...');
    // The backend /api/auth/github route will handle the OAuth flow and cookie setting
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/github';
    }
  };

  // --- Logout Function ---
  // The backend now clears the HttpOnly cookie
  const logout = async (): Promise<void> => {
    setIsLoading(true); // Indicate loading state
    console.log('Attempting logout...');
    try {
      // Call the backend logout endpoint to clear the HttpOnly cookie
      const response = await fetch('/api/auth/logout', { method: 'POST' }); // Use POST

      if (!response.ok) {
           console.warn('Logout endpoint returned non-OK status:', response.status);
           // Continue client-side cleanup even if backend call fails
      }
      console.log('Backend logout endpoint called. Clearing client state...');

    } catch (error) {
      console.error('Logout API call error:', error);
      // Continue client-side cleanup even if network error occurs
    } finally {
      // Essential client-side cleanup:
      setUser(null); // Clear user state
      setIsLoading(false); // Finish loading
      console.log('Client-side logout complete. Cookie cleared by backend.');
      navigate('/login'); // Redirect to login page
    }
  };

  // --- Effect to check initial authentication status on mount ---
  // This runs only on the client-side after the component mounts
  useEffect(() => {
    console.log(
      'AuthProvider mounted (Client-side). Checking initial session status...',
    );
    // On mount, check for an existing session by calling the /api/auth/session endpoint
    fetchUserSession();

    // We no longer need to manage token state or localStorage here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on initial mount

  // --- Value provided by the context ---
  const value: AuthContextType = {
    user,
    login,
    loginWithGithub,
    logout,
    isLoading,
  };

  // Render the provider with the context value
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook to use the Auth Context ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};