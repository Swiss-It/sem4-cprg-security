// app/profile/profile.tsx
import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Link } from 'react-router'; // <-- Ensure using react-router-dom

export function ProfilePage() {
  const { user, updateUser, isLoading: authLoading, requestPasswordReset } =
    useAuth(); // Add requestPasswordReset

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  // const [password, setPassword] = useState(''); // --- REMOVE ---
  const [bio, setBio] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // --- NEW: State for password reset request ---
  const [resetRequestLoading, setResetRequestLoading] = useState(false);
  const [resetRequestMessage, setResetRequestMessage] = useState('');
  const [resetRequestError, setResetRequestError] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
    }
  }, [user]);

  // Handle profile update submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (!username || !email) {
        throw new Error('Username and email are required.');
      }

      // Prepare data object - NO password included
      const updatedUserData: {
        username: string;
        email: string;
        bio: string;
      } = {
        username: username,
        email: email,
        bio: bio,
      };

      await updateUser(updatedUserData); // Call context function

      setSuccessMessage('Profile updated successfully!');
      // setPassword(''); // --- REMOVE ---
    } catch (error: any) {
      console.error('Profile update failed:', error);
      setErrorMessage(
        error.message || 'Failed to update profile. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW: Handle Password Reset Request ---
  const handleRequestReset = async () => {
    if (!user?.email) {
      setResetRequestError('User email not found.');
      return;
    }
    setResetRequestLoading(true);
    setResetRequestMessage('');
    setResetRequestError('');
    try {
      const message = await requestPasswordReset(user.email);
      setResetRequestMessage(message); // Display the generic success message
    } catch (error: any) {
      console.error('Password reset request failed:', error);
      setResetRequestError(
        error.message || 'Failed to send reset instructions.',
      );
    } finally {
      setResetRequestLoading(false);
    }
  };

  if (authLoading && !user) { // Show loading only if user isn't loaded yet
    return <div>Loading profile...</div>;
  }

  if (!user) {
    return <div>User not found. Please log in.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10 dark:bg-gray-800">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Your Profile
      </h1>

      {/* Profile Update Messages */}
      {successMessage && (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Profile Update Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isSubmitting || authLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 disabled:opacity-50"
          />
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting || authLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 disabled:opacity-50"
          />
        </div>

        {/* --- REMOVED: New Password Field --- */}

        {/* Bio Field */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            disabled={isSubmitting || authLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 disabled:opacity-50"
          />
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || authLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>

      {/* --- NEW: Password Reset Section --- */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Password Settings
        </h2>
        {/* Password Reset Messages */}
        {resetRequestMessage && (
          <div
            className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            {resetRequestMessage}
          </div>
        )}
        {resetRequestError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            {resetRequestError}
          </div>
        )}
        <button
          type="button"
          onClick={handleRequestReset}
          disabled={resetRequestLoading || authLoading}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500 disabled:opacity-50"
        >
          {resetRequestLoading
            ? 'Sending Request...'
            : 'Request Password Reset Email'}
        </button>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          If you need to change your password, request a reset link to be sent
          to your email address ({user.email}).
        </p>
      </div>

      {/* Back to Dashboard Button */}
      <div className="mt-6">
        <Link
          to="/dashboard"
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}


// Export as default if your file structure requires it
// export default ProfilePage;
