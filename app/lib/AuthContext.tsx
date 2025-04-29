import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
  type FC,
  // Remove unused Context import
} from 'react';
// Use react-router-dom's useNavigate for SPA navigation
import { useNavigate } from 'react-router'; // <-- Correct import

// const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'https://localhost:3000/api';
// console.log('Using Backend API URL:', BACKEND_API_URL);

// if (!BACKEND_API_URL) {
//   console.error('Error: BACKEND_API_URL environment variable not set.');
// }

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
  // --- MODIFIED: Add csrfToken parameter ---
  login: (credentials: any, csrfToken: string | null) => Promise<void>;
  loginWithGithub: () => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUser: (
    userData: Partial<FrontendUser & { password?: string }>,
  ) => Promise<void>;
  // --- ADDED: Expose csrfToken if needed elsewhere, though maybe not necessary ---
  // csrfToken: string | null;
}

// --- Create the context with a default value ---
const AuthContext = createContext<AuthContextType>({
  user: null,
  // --- MODIFIED: Update default implementation signature ---
  login: async () => {},
  loginWithGithub: () => {},
  logout: async () => {},
  isLoading: true,
  updateUser: async () => {},
  // csrfToken: null, // Add default if exposing token
});

// --- Define Props for the Provider ---
interface AuthProviderProps {
  children: ReactNode;
}

// --- Create the Provider Component ---
export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FrontendUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null); // Keep this for updateUser and potentially session checks
  const navigate = useNavigate();

  // Function to fetch CSRF token
  const fetchCsrfToken = async () => {
    try {
      console.log('AuthContext: Fetching CSRF token...');
      const response = await fetch('/api/csrf-token'); // Use relative path
      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken); // Store token in context state
        console.log('AuthContext: CSRF token received and stored.');
        return data.csrfToken; // Return token for immediate use if needed
      } else {
        console.error(
          'AuthContext: Failed to fetch CSRF token, status:',
          response.status,
        );
        setCsrfToken(null); // Clear on failure
        return null;
      }
    } catch (error) {
      console.error('AuthContext: Error fetching CSRF token:', error);
      setCsrfToken(null); // Clear on error
      return null;
    }
  };

  // --- Fetch User Data based on Token ---
  const fetchUserSession = async (): Promise<void> => {
    console.log('AuthContext: Attempting to fetch user session...');
    setIsLoading(true);
    const apiUrl = '/api/auth/session'; // Use relative path
    try {
      const response = await fetch(apiUrl);
      console.log('AuthContext: fetchUserSession response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          console.log('AuthContext: User session found.');
          await fetchCsrfToken(); // Fetch CSRF token for subsequent actions
        } else {
          console.warn(
            'AuthContext: Session endpoint OK but no user data.',
          );
          setUser(null);
          setCsrfToken(null);
        }
      } else if (response.status === 401) {
        console.log(
          'AuthContext: No valid user session found (401 Unauthorized).',
        );
        setUser(null);
        setCsrfToken(null);
      } else {
        console.error(
          'AuthContext: Error fetching user session, status:',
          response.status,
        );
        setUser(null);
        setCsrfToken(null);
      }
    } catch (error) {
      console.error(
        'AuthContext: Network or other error during session fetch:',
        error,
      );
      setUser(null);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Local Login Function ---
  // --- MODIFIED: Accept csrfToken parameter ---
  const login = async (
    credentials: any,
    loginCsrfToken: string | null, // Use a different name to avoid confusion with context state
  ): Promise<void> => {
    setIsLoading(true);
    console.log('AuthContext: Attempting local login...');

    // --- ADDED: Check if CSRF token was provided ---
    if (!loginCsrfToken) {
      console.error('AuthContext: Login attempt missing CSRF token.');
      setIsLoading(false);
      throw new Error(
        'Login failed: CSRF token not available. Please refresh.',
      );
    }

    const apiUrl = '/api/auth/login'; // Use relative path
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // --- ADDED: Include CSRF token in the header ---
          'CSRF-Token': loginCsrfToken,
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        // Attempt to parse error message from backend
        let errorData = { message: `Login failed with status: ${response.status}` };
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if response is not JSON
          console.warn("Could not parse JSON error response from login endpoint.")
        }
        throw new Error(errorData.message);
      }

      const data = await response.json();

      if (!data.user) {
        throw new Error('Login response missing user data.');
      }

      setUser(data.user);
      console.log('AuthContext: Local login successful.');
      // Fetch a *new* CSRF token after login, as the session might have changed
      await fetchCsrfToken();
      navigate('/dashboard');
    } catch (error) {
      console.error('AuthContext: Local login error:', error);
      setUser(null);
      setCsrfToken(null); // Clear context token on failure
      throw error; // Re-throw for the component
    } finally {
      setIsLoading(false);
    }
  };

  // --- GitHub Login Initiation ---
  const loginWithGithub = (): void => {
    console.log('Initiating GitHub login...');
    // Use relative path for the redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/github';
    }
  };

  // Logout Function
  const logout = async (): Promise<void> => {
    console.log('[AuthContext:logout] Initiating logout...');
    // No need to set isLoading true here, can cause UI flashes

    // Store token before clearing state, if needed for logout request
    const currentCsrfToken = csrfToken;

    try {
      console.log('[AuthContext:logout] Calling backend /api/auth/logout...');
      const apiUrl = '/api/auth/logout'; // Use relative path
      const response = await fetch(apiUrl, {
        method: 'POST',
        // --- ADDED: Include CSRF token if your logout requires it ---
        // If your /logout endpoint is protected by csurf, you need this
        headers: {
           ...(currentCsrfToken && { 'CSRF-Token': currentCsrfToken }),
        },
      });

      if (!response.ok) {
        console.warn(
          `[AuthContext:logout] Backend logout endpoint returned status ${response.status}`,
        );
      } else {
        console.log(
          '[AuthContext:logout] Backend logout successful.',
        );
      }
    } catch (error) {
      console.error('[AuthContext:logout] Error calling backend logout:', error);
    } finally {
      console.log('[AuthContext:logout] Clearing client-side state.');
      setUser(null);
      setCsrfToken(null); // Clear token
      setIsLoading(false); // Ensure loading is false

      console.log('[AuthContext:logout] Navigating to /login...');
      navigate('/login', { replace: true });
      console.log('[AuthContext:logout] Navigation to /login requested.');
    }
  };

  // Update user function
  const updateUser = async (
    userData: Partial<FrontendUser & { password?: string }>,
  ): Promise<void> => {
    console.log('AuthContext: Attempting to update user profile...');

    // Use the token stored in the context's state
    if (!csrfToken) {
      console.error('AuthContext: CSRF token not available for updateUser.');
      throw new Error('CSRF token missing. Please refresh or log in again.');
    }

    // Remove the duplicate try block
    try {
      const apiUrl = '/api/auth/profile'; // Use relative path
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken, // Use token from context state
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        let errorData = { message: `Profile update failed: ${response.status}` };
         try {
          errorData = await response.json();
        } catch (e) {
           console.warn("Could not parse JSON error response from profile update endpoint.")
        }
        console.error('AuthContext: API Error updating profile:', errorData);
        throw new Error(errorData.message);
      }

      const data = await response.json();

      if (!data.user) {
        throw new Error('Profile update response missing user data.');
      }

      setUser(data.user); // Update context state
      console.log('AuthContext: User profile updated successfully.');
      // Fetch a new CSRF token in case the update invalidated the old one (optional but safer)
      await fetchCsrfToken();
    } catch (error) {
      console.error('AuthContext: updateUser error:', error);
      throw error; // Re-throw for the component
    }
    // Removed duplicate catch block
  };

  // --- Effect to check initial authentication status on mount ---
  useEffect(() => {
    console.log(
      'AuthProvider mounted. Checking initial session status...',
    );
    fetchUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Value provided by the context ---
  const value: AuthContextType = {
    user,
    login,
    loginWithGithub,
    logout,
    isLoading,
    updateUser,
    // csrfToken, // Expose token if needed
  };

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
