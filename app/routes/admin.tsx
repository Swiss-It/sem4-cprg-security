import { ProtectedRoute } from '../lib/ProtectedRoute'; // Adjust path if needed
import { AdminPageComponent } from '~/admin/admin';

export default function AdminRoute() {
  return (
    // Wrap the page component AND specify allowedRoles
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminPageComponent />
    </ProtectedRoute>
  );
}
