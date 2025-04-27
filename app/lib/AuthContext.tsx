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

// Define the user type the frontend expects (should match backend minus password)
interface FrontendUser {
  _id: string;
  username: string;
  email: string;
  role: string; // Make sure role is included
  bio?: string;
  githubId?: string; // Include other fields returned by API
  // Add other fields you expect from the /api/auth/session or /api/auth/profile endpoints
}

// --- Define the shape of the context value ---
interface AuthContextType {
  user: FrontendUser | null;
  login: (credentials: any) => Promise<void>;
  loginWithGithub: () => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUser: ( // <-- ADD THIS LINE
    userData: Partial<FrontendUser & { password?: string }>,
  ) => Promise<void>;
}

// --- Create the context with a default value ---
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  loginWithGithub: () => {},
  logout: async () => {},
  isLoading: true,
  updateUser: async () => {}, // <-- ADD DEFAULT IMPLEMENTATION
});

// --- Define Props for the Provider ---
interface AuthProviderProps {
  children: ReactNode;
}

// --- Create the Provider Component ---
export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FrontendUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  const logout = async (): Promise<void> => {
    console.log('[AuthContext:logout] Initiating logout...');
    // Setting isLoading here might be unnecessary and could contribute to issues
    // setIsLoading(true);

    try {
      // 1. Call backend to clear the HttpOnly cookie
      console.log('[AuthContext:logout] Calling backend /api/auth/logout...');
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (!response.ok) {
        // Log warning but proceed with client-side cleanup anyway
        console.warn(
          `[AuthContext:logout] Backend logout endpoint returned status ${response.status}`,
        );
      } else {
        console.log(
          '[AuthContext:logout] Backend logout successful (cookie should be cleared).',
        );
      }
    } catch (error) {
      console.error('[AuthContext:logout] Error calling backend logout:', error);
      // Proceed with client-side cleanup even if backend call fails
    } finally {
      // 2. Clear the user state on the client *after* backend attempt
      console.log('[AuthContext:logout] Clearing client-side user state.');
      setUser(null);

      // 3. Ensure isLoading is false *before* navigating
      // If isLoading is true, ProtectedRoute might show "Loading..." instead of letting navigation happen
      setIsLoading(false);

      // 4. Navigate to the login page
      console.log('[AuthContext:logout] Navigating to /login...');
      // Use replace: true so the logged-out page isn't in the browser history
      navigate('/login', { replace: true });
      console.log('[AuthContext:logout] Navigation to /login requested.');
    }
  };

  // Update user function
  const updateUser = async (
    userData: Partial<FrontendUser & { password?: string }>,
  ): Promise<void> => {
    console.log('Attempting to update user profile via context...');
    try {
      // Call the backend API endpoint you created in Step 3
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // The HttpOnly cookie is sent automatically by the browser
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error updating profile:', errorData);
        throw new Error(
          errorData.message || `Profile update failed: ${response.status}`,
        );
      }

      const data = await response.json(); // Expect { message: string, user: FrontendUser }

      if (!data.user) {
        throw new Error('Profile update response missing user data.');
      }

      // IMPORTANT: Update the user state in the context with the fresh data from the API
      setUser(data.user);
      console.log('User profile updated successfully in context.');
      // You might want to show a success notification here using a state management library or prop drilling

    } catch (error) {
      console.error('Context updateUser error:', error);
      // Re-throw the error so the calling component (ProfilePage) can catch it and display a message
      throw error;
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
    updateUser,
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