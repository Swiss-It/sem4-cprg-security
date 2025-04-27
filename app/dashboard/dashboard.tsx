import { useAuth } from "~/lib/AuthContext";

export function DashboardPage() {
    const { user, logout } = useAuth(); // Access user and logout function from auth context

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                {user && (
                     <a href="/profile" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                        Go to Profile
                    </a>
                )}
            </div>
            <p className="text-gray-600 mb-6">Welcome to the dashboard {user?.username}!</p>

            {user ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="mb-3 text-gray-700">
                        Logged in as: <strong className="font-medium text-blue-600">{user.username}</strong>
                    </p>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    >
                        Logout
                    </button>
                </div>
            ) : (
                <p className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
                    Not logged in
                </p>
            )}
        </div>
    );
};