// app/routes/admin.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ProtectedRoute } from '../lib/ProtectedRoute'; // Adjust path if needed
import { useAuth } from '../lib/AuthContext'; // To potentially get CSRF token if needed directly

// --- Define the actual content of your Admin Panel ---
export function AdminPageComponent() {
  const [users, setUsers] = useState<any[]>([]); // State to hold user data
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const { csrfToken } = useAuth(); // Get CSRF token if needed for API calls from here

  // Function to fetch users (Example)
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    console.log('AdminPageComponent: Fetching users...');

    // Fetch CSRF token *just before* the request if not using context one
    // This is often safer as tokens can expire or change
    let currentCsrfToken: string | null = null;
    try {
      const csrfResponse = await fetch('/api/csrf-token');
      if (!csrfResponse.ok) throw new Error('Failed to get CSRF token');
      const csrfData = await csrfResponse.json();
      currentCsrfToken = csrfData.csrfToken;
      console.log('AdminPageComponent: Got fresh CSRF token for fetchUsers.');
    } catch (err: any) {
      console.error('AdminPageComponent: Error fetching CSRF token:', err);
      setError(`Failed to get security token: ${err.message}`);
      setIsLoading(false);
      return;
    }

    if (!currentCsrfToken) {
       setError('Security token is missing. Cannot fetch users.');
       setIsLoading(false);
       return;
    }


    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET', // GET requests typically don't *need* CSRF, but including it doesn't hurt and is good practice if the middleware is applied universally
        headers: {
          'Content-Type': 'application/json',
          // Include credentials (cookies)
          // 'Authorization': `Bearer ${token}`, // Not needed if using httpOnly cookies
          'CSRF-Token': currentCsrfToken, // Send the CSRF token
        },
      });

      console.log('AdminPageComponent: Fetch users response status:', response.status);


      if (!response.ok) {
        // Try to get error message from backend
        let errorData = { message: `Error fetching users: ${response.status}` };
        try {
            errorData = await response.json();
        } catch(e) {
            console.warn("Could not parse JSON error from /api/admin/users")
        }
        throw new Error(errorData.message);
      }

      const data = await response.json();
      setUsers(data.users || []); // Assuming the backend returns { users: [...] }
      console.log('AdminPageComponent: Users fetched successfully.');

    } catch (err: any) {
      console.error('AdminPageComponent: Error fetching users:', err);
      setError(err.message || 'An unknown error occurred while fetching users.');
      setUsers([]); // Clear users on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users when the component mounts
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means run once on mount

  return (
    <div className="p-6 max-w-6xl mx-auto">
        <Link
        to="/dashboard" // Assuming your dashboard route is /dashboard
        className="inline-block mb-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 mr-4" // Added mr-4 for spacing
      >
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Panel</h1>
      <p className="text-gray-600 mb-4">
        This area is restricted to administrators.
      </p>

      {/* Button to refresh users */}
      <button
        onClick={fetchUsers}
        disabled={isLoading}
        className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
      >
        {isLoading ? 'Loading...' : 'Refresh User List'}
      </button>

      {/* Display Loading State */}
      {isLoading && <p className="text-blue-600">Loading users...</p>}

      {/* Display Error Message */}
      {error && <p className="text-red-600 bg-red-100 p-3 rounded border border-red-300">Error: {error}</p>}

      {/* Display User List */}
      {!isLoading && !error && (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GitHub ID</th>
                {/* Add more columns as needed */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.githubId || 'N/A'}</td>
                    {/* Add more cells corresponding to the headers */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add more admin functionality here (e.g., forms to edit/delete users) */}
      {/* Remember to include the CSRF token in headers for POST/PUT/DELETE requests */}

    </div>
  );
}

// --- Export the route component, wrapped in ProtectedRoute ---
export default function AdminRoute() {
  return (
    // Wrap the page component AND specify allowedRoles
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminPageComponent />
    </ProtectedRoute>
  );
}
