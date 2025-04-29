// In your LoginPage.tsx file

import React, { useState, useEffect } from 'react';
// --- Correct import for Link and useNavigate ---
import { Link, useNavigate } from 'react-router';
import { useAuth } from '~/lib/AuthContext'; // Assuming this path is correct

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Keep controlled inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // For displaying errors
  const [csrfToken, setCsrfToken] = useState<string | null>(null); // Store the token for this page
  const [isCsrfLoading, setIsCsrfLoading] = useState(true); // Loading state for token fetch

  // Fetch CSRF token specifically for the login form when the page loads
  useEffect(() => {
    let isMounted = true;
    const fetchToken = async () => {
      setIsCsrfLoading(true);
      setError(null); // Clear previous errors
      try {
        console.log('LoginPage: Fetching CSRF token for login form...');
        const response = await fetch('/api/csrf-token'); // Use relative path
        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
          console.log('LoginPage: CSRF token received.');
        } else {
          const errorText = `Failed to fetch CSRF token (Status: ${response.status}). Please refresh the page.`;
          console.error('LoginPage:', errorText);
          setError(errorText);
          setCsrfToken(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('LoginPage: Error fetching CSRF token:', err);
        setError(
          `Could not prepare login form (${err.message || 'Network error'}). Please refresh the page.`,
        );
        setCsrfToken(null);
      } finally {
        if (isMounted) {
          setIsCsrfLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, []); // Fetch only once on mount

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Clear previous login errors

    // --- ADDED: Check if CSRF token is available before attempting login ---
    if (!csrfToken) {
      setError('Cannot log in: CSRF token is missing. Please refresh.');
      console.error('Login attempt failed: CSRF token not available in state.');
      return; // Stop the login attempt
    }

    // Get credentials from controlled state
    // const formData = new FormData(event.currentTarget); // No longer needed if using controlled inputs
    // const email = formData.get('email') as string;
    // const password = formData.get('password') as string;

    try {
      console.log('LoginPage: Calling auth.login with credentials and CSRF token...');
      // --- MODIFIED: Pass the csrfToken from state to auth.login ---
      await auth.login({ email, password }, csrfToken);
      console.log('LoginPage: Login initiated via context successfully.');
      // Navigation is handled within auth.login on success
    } catch (err: any) {
      console.error('LoginPage: Login failed via context:', err);
      // Display the error message thrown by auth.login
      setError(err.message || 'An unknown login error occurred.');
      // Fetch a new CSRF token in case the previous one was consumed or invalidated by the failed attempt
      // This might be necessary depending on your csurf setup
      const fetchToken = async () => {
         try {
            const response = await fetch('/api/csrf-token');
            if (response.ok) {
               const data = await response.json();
               setCsrfToken(data.csrfToken);
               console.log("LoginPage: Refetched CSRF token after failed login.")
            } else {
               setCsrfToken(null);
            }
         } catch {
            setCsrfToken(null);
         }
      }
      fetchToken();
    }
    // No finally block needed here as isLoading is handled by context
  };

  // Determine if the form should be disabled
  const isFormDisabled = auth.isLoading || isCsrfLoading || !csrfToken;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        {/* Display Loading States */}
        {isCsrfLoading && (
          <div className="text-center py-3 text-gray-500">
            <p>Preparing login form...</p>
          </div>
        )}
        {auth.isLoading && !isCsrfLoading && ( // Show login loading only after CSRF is loaded
          <div className="text-center py-3 text-indigo-600">
            <p>Signing in...</p>
          </div>
        )}

        {/* Display Errors */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {/* Hidden CSRF field - Not strictly necessary if sending via header, but good practice */}
          {/* <input type="hidden" name="_csrf" value={csrfToken || ''} /> */}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email} // Controlled input
                onChange={(e) => setEmail(e.target.value)} // Controlled input
                disabled={isFormDisabled} // Disable input while loading/error
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password} // Controlled input
                onChange={(e) => setPassword(e.target.value)} // Controlled input
                disabled={isFormDisabled} // Disable input while loading/error
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder="Password"
              />
            </div>
          </div>

          {/* Forgot password link etc. */}

          <div>
            <button
              type="submit"
              // --- MODIFIED: Disable based on auth loading OR csrf loading/missing ---
              disabled={isFormDisabled}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign in
            </button>
          </div>

           {/* GitHub Login Button - No CSRF needed for GET redirect */}
           <div className="mt-4">
             <button
               type="button"
               onClick={auth.loginWithGithub} // Use context function directly
               disabled={auth.isLoading} // Disable if any auth process is running
               className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {/* Simplified SVG */}
               <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                 <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.341-3.369-1.341-.454-1.157-1.11-1.465-1.11-1.465-.908-.62.069-.608.069-.608 1.004.074 1.532 1.03 1.532 1.03.891 1.529 2.341 1.089 2.91.833.091-.647.349-1.086.635-1.337-2.22-.253-4.555-1.111-4.555-4.943 0-1.091.39-1.984 1.029-2.685-.103-.253-.446-1.27.098-2.649 0 0 .84-.269 2.75 1.025A9.549 9.549 0 0110 4.817c.85 0 1.7.114 2.5.336 1.91-1.294 2.748-1.025 2.748-1.025.546 1.379.202 2.396.1 2.649.64.701 1.028 1.594 1.028 2.685 0 3.841-2.337 4.687-4.565 4.935.359.309.678.921.678 1.856 0 1.337-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.001 10.001 0 0020 10c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
               </svg>
               Sign in with GitHub
             </button>
           </div>

          <p className="mt-2 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
