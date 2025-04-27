import { ProtectedRoute } from "~/lib/ProtectedRoute";
import { DashboardPage } from "~/dashboard/dashboard";

export default function Dashboard() {
    return (
        <ProtectedRoute>
            <DashboardPage />
        </ProtectedRoute>
    )
}