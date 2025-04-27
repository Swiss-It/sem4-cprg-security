// app/profile/profile.tsx
import React, { useState, useEffect} from 'react'; // Import React hooks
import type { FormEvent } from 'react'; // Import type for FormEvent
import { useAuth } from '../lib/AuthContext'; // Adjust path to your AuthContext

export function ProfilePage() {
  // Get user data, update function, and loading status from context
  const { user, updateUser, isLoading: authLoading } = useAuth();

  // State for form fields - initialize empty, populate in useEffect
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // For changing password
  const [bio, setBio] = useState('');

  // State for feedback messages and submission status
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effect to populate form fields when user data loads or changes
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || ''); // Make sure 'bio' is in your FrontendUser interface if used
    }
  }, [user]); // Dependency array: re-run effect if 'user' object changes

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission
    setErrorMessage(''); // Clear previous messages
    setSuccessMessage('');
    setIsSubmitting(true); // Indicate loading

    try {
      // Basic validation
      if (!username || !email) {
        throw new Error('Username and email are required.');
      }

      // Prepare data object for the API call
      const updatedUserData: {
        username: string;
        email: string;
        bio: string;
        password?: string; // Password is optional
      } = {
        username: username,
        email: email,
        bio: bio,
      };
      // Only include the password field if the user entered something
      if (password) {
        updatedUserData.password = password;
      }

      // Call the updateUser function from AuthContext (defined in Step 6)
      await updateUser(updatedUserData);

      // If updateUser succeeds:
      setSuccessMessage('Profile updated successfully!');
      setPassword(''); // Clear password field after successful update

    } catch (error: any) {
      // If updateUser fails (throws an error):
      console.error('Profile update failed:', error);
      setErrorMessage(
        error.message || 'Failed to update profile. Please try again.',
      );
    } finally {
      // Always run this, whether success or failure
      setIsSubmitting(false); // Stop indicating loading
    }
  };

  // Show loading state while auth context is checking session
  if (authLoading) {
    return <div>Loading profile...</div>;
  }

  // Should be handled by ProtectedRoute, but good fallback
  if (!user) {
    return <div>User not found. Please log in.</div>;
  }

  // Render the form
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Profile</h1>

      {/* Success Message */}
      {successMessage && (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* New Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            New Password (optional)
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            autoComplete="new-password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Bio Field */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700"
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting} // Disable button while processing
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Export as default if your file structure requires it
// export default ProfilePage;
