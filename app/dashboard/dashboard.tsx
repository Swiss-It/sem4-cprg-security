import { useAuth } from "~/lib/AuthContext";
import { Link } from "react-router";

export function DashboardPage() {
    const { user, logout } = useAuth(); // Access user and logout function from auth context

    return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div>
          {/* --- CONDITIONAL ADMIN LINK --- */}
          {user?.role === 'admin' && (
            <Link // Use Link component
              to="/admin" // Link to the admin route
              className="inline-block mr-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Admin Panel
            </Link>
          )}

          {/* Profile Link (for all logged-in users) */}
          {user && (
            <Link // Use Link component
              to="/profile" // Link to the profile route
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Go to Profile
            </Link>
          )}
        </div>
      </div>

      {/* Welcome Message */}
      <p className="text-gray-600 mb-6">
        Welcome back, {user?.username}! Your role is: {user?.role}
      </p>

      {/* --- ROLE-DEPENDENT CONTENT SECTIONS --- */}
      {user?.role === 'admin' && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h2 className="text-xl font-semibold text-purple-800 mb-2">
            Admin Tools
          </h2>
          <p>You have access to administrative functions.</p>
          {/* Add links or components specific to admins */}
          {/* Example: <Link to="/admin/users">Manage Users</Link> */}
        </div>
      )}

      {user?.role === 'user' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            Your Activity
          </h2>
          <p>Here's your standard user dashboard view.</p>
          {/* Add components specific to regular users */}
        </div>
      )}

      {/* Common Elements (like Logout) */}
      {user ? (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="mb-3 text-gray-700">
            Logged in as:{' '}
            <strong className="font-medium text-blue-600">
              {user.username} ({user.email})
            </strong>
          </p>
          <button
            onClick={logout} // Call logout from context
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Logout
          </button>
        </div>
      ) : (
        // Should not be reachable if ProtectedRoute works, but good fallback
        <p className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
          You are not logged in.
        </p>
      )}
    </div>
  );
}

// Export as default if your file structure requires it
// export default DashboardPage;