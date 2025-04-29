import { ProtectedRoute } from '../lib/ProtectedRoute'; // Adjust path if needed

// Define or import your Admin Page component
// Example inline component:
function AdminPageComponent() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <p>This area is restricted to administrators.</p>
      {/* Add admin functionality here */}
    </div>
  );
}

export default function AdminRoute() {
  return (
    // Wrap the page component AND specify allowedRoles
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminPageComponent />
    </ProtectedRoute>
  );
}
