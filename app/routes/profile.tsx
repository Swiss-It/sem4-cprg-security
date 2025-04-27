import { ProtectedRoute } from "~/lib/ProtectedRoute";
import { ProfilePage } from '~/profile/profile';

export default function Profile() {
    return (
        <ProtectedRoute>
            <ProfilePage />
        </ProtectedRoute>
    );
}