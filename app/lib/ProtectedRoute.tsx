// app/lib/ProtectedRoute.tsx
import React from 'react';
// Make sure you're using react-router-dom v6+ for these hooks
import { Navigate, useLocation } from 'react-router';
// Adjust the path './AuthContext' if AuthContext.tsx is elsewhere relative to this file
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement; // The component to render if authorized
  allowedRoles?: string[]; // Optional: Array of roles allowed (e.g., ['admin'])
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth(); // Get user and loading state from context
  const location = useLocation(); // Get current location to redirect back later

  // 1. Show loading indicator while checking authentication
  if (isLoading) {
    // You can replace this with a nicer spinner component
    return <div>Loading authentication status...</div>;
  }

  // 2. If not loading and no user, redirect to login
  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to login.');
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them back after they log in.
    return <Navigate to="/login"/>;
    // 'replace' prevents the protected route from ending up in the browser history
  }

  // 3. If user exists, check roles (if 'allowedRoles' were provided)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User is logged in, but their role is not in the allowed list
    console.warn(
      `ProtectedRoute: Access denied for role "${
        user.role
      }" to route requiring roles: ${allowedRoles.join(', ')}`,
    );
    // Redirect to a safe page (e.g., dashboard or a specific 'Unauthorized' page)
    // Avoid redirecting back to the forbidden page in a loop.
    return <Navigate to="/dashboard" replace />; // Or create an /unauthorized page
  }

  // 4. If user exists and has the required role (or no specific role was required)
  // Render the child component (the actual page)
  return children;
};
