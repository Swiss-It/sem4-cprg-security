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
import type { IUser } from 'server/models/User'; // Adjust path as needed

// --- Helper Functions for Token Storage ---
// Encapsulate localStorage access
// IMPORTANT: These functions should only be *called* on the client-side.
const storeToken = (token: string): void => {
    if (typeof window !== 'undefined') { // Check if running in browser
      localStorage.setItem('auth_token', token);
    }
};
const getToken = (): string | null => {
    if (typeof window !== 'undefined') { // Check if running in browser
      return localStorage.getItem('auth_token');
    }
    return null; // Return null if not in browser
};
const removeToken = (): void => {
     if (typeof window !== 'undefined') { // Check if running in browser
       localStorage.removeItem('auth_token');
     }
};

// --- Define the shape of the context value ---
interface AuthContextType {
  user: IUser | null; // Current user or null
  token: string | null; // Store the token itself in context (optional, but can be useful)
  login: (credentials: any) => Promise<void>; // Local login
  loginWithGithub: () => void; // Initiate GitHub OAuth flow
  handleOAuthCallback: (token: string) => Promise<void>; // Process token after OAuth redirect
  logout: () => Promise<void>; // Logout function
  isLoading: boolean; // Loading state indicator
}

// --- Create the context with a default value ---
const AuthContext: Context<AuthContextType> = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => { /* Default */ },
  loginWithGithub: () => { /* Default */ },
  handleOAuthCallback: async () => { /* Default */ },
  logout: async () => { /* Default */ },
  isLoading: true, // Start loading until initial check is done
});

// --- Define Props for the Provider ---
interface AuthProviderProps {
  children: ReactNode;
}

// --- Create the Provider Component ---
export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  // Initialize token state to null - it will be set in useEffect on the client
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading
  const navigate = useNavigate();

  // --- Fetch User Data based on Token ---
  // Helper function to get user data if a token exists
  const fetchUserFromToken = async (currentToken: string): Promise<void> => {
     console.log('Attempting to fetch user data with token...');
     // Don't set isLoading here, it's handled by the initial useEffect check
     // setIsLoading(true);
     try {
        const response = await fetch('/api/auth/session', { // Use the JWT-protected endpoint
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user); // Set user data from response
          console.log('User data fetched successfully:', data.user);
        } else {
          // Token is invalid or expired, or other server error
          console.error('Failed to fetch user data, status:', response.status);
          removeToken(); // Remove invalid token from storage
          setToken(null); // Clear token state
          setUser(null);  // Clear user state
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        removeToken(); // Remove token on error
        setToken(null); // Clear token state
        setUser(null);  // Clear user state
      } finally {
         // setIsLoading(false); // Loading is handled by the initial useEffect
      }
  };


  // --- Local Login Function ---
  // Assumes the backend /api/auth/login returns { user: ..., token: ... }
  const login = async (credentials: any): Promise<void> => {
    setIsLoading(true); // Set loading during login attempt
    console.log('Attempting local login...');
    try {
      const response = await fetch('/api/auth/login', { // ** This backend route needs to be updated for JWT **
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed with status: ${response.status}`);
      }

      const data = await response.json(); // Expect { user: IUser, token: string }

      if (!data.token || !data.user) {
           throw new Error('Login response missing token or user data.');
      }

      storeToken(data.token); // Store the JWT token in localStorage
      setToken(data.token);   // Update context state
      setUser(data.user);     // Update context state
      console.log('Local login successful.');
      navigate('/dashboard'); // Navigate after successful login

    } catch (error) {
      console.error("Local login error:", error);
      removeToken(); // Clear any potentially bad token
      setToken(null);
      setUser(null);
      throw error; // Re-throw error for the component to handle
    } finally {
      setIsLoading(false); // Finish loading after login attempt
    }
  };

  // --- GitHub Login Initiation ---
  const loginWithGithub = (): void => {
    console.log('Initiating GitHub login...');
    // Ensure this only runs client-side if there was any doubt
    if (typeof window !== 'undefined') {
        window.location.href = '/api/auth/github'; // Backend handles redirect to GitHub
    }
  };

  // --- Handle OAuth Callback ---
  const handleOAuthCallback = async (receivedToken: string): Promise<void> => {
        console.log('Handling OAuth callback with received token...');
        storeToken(receivedToken); // Store the token from callback
        setToken(receivedToken);   // Set token state
        // Fetch user data using the new token
        await fetchUserFromToken(receivedToken);
        // Navigate to the main application area
        navigate('/dashboard');
  };


  // --- Logout Function (JWT Approach) ---
  const logout = async (): Promise<void> => {
    setIsLoading(true); // Indicate loading state
    console.log('Attempting JWT logout...');
    try {
      // Optional: Call backend endpoint
      await fetch('/api/auth/logout', { method: 'GET' });
      console.log('Server logout endpoint acknowledged.');
    } catch (error) {
      console.error("Logout API call error:", error);
    } finally {
      // Essential client-side cleanup for JWT logout:
      removeToken(); // Remove token from storage
      setToken(null);  // Clear token state
      setUser(null);   // Clear user state
      setIsLoading(false); // Finish loading
      console.log('Client-side logout complete.');
      navigate('/login'); // Redirect to login page
    }
  };

  // --- Effect to check initial authentication status on mount ---
  // This runs only on the client-side after the component mounts
  useEffect(() => {
    console.log('AuthProvider mounted (Client-side). Checking initial auth status...');
    // Read token from localStorage *inside* useEffect
    const currentToken = getToken();

    if (currentToken) {
      console.log('Token found in storage. Validating...');
      setToken(currentToken); // Set token state first
      fetchUserFromToken(currentToken); // Validate token and fetch user data
    } else {
      // No token found, ensure user is null and finish loading
      console.log('No token found in storage.');
      setUser(null);
      setIsLoading(false); // Finish loading as there's no token to check
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on initial mount


  // --- Value provided by the context ---
  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithGithub,
    handleOAuthCallback,
    logout,
    isLoading,
  };

  // Render the provider with the context value
  return (
    <AuthContext.Provider value={value}>
      {/* Render children, potentially showing loading indicator based on isLoading */}
      {/* Example: {isLoading ? <p>Loading...</p> : children} */}
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook to use the Auth Context ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
