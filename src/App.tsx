import { lazy, Suspense, type JSX } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { LoadingScreen } from '@/components/ui';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

// Og'ir sahifalar alohida chunk'ga ajratiladi — bosh sahifa uchun recharts,
// qrcode va admin panel kodini yuklashning hojati yo'q.
const UserDashboard = lazy(() =>
  import('@/pages/UserDashboard').then((m) => ({ default: m.UserDashboard }))
);
const GetQueuePage = lazy(() =>
  import('@/pages/GetQueuePage').then((m) => ({ default: m.GetQueuePage }))
);
const QueueDetailPage = lazy(() =>
  import('@/pages/QueueDetailPage').then((m) => ({ default: m.QueueDetailPage }))
);
const QueueHistoryPage = lazy(() =>
  import('@/pages/QueueHistoryPage').then((m) => ({ default: m.QueueHistoryPage }))
);
const AdminDashboard = lazy(() =>
  import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AdminServicesPage = lazy(() =>
  import('@/pages/AdminServicesPage').then((m) => ({ default: m.AdminServicesPage }))
);
const AdminStatsPage = lazy(() =>
  import('@/pages/AdminStatsPage').then((m) => ({ default: m.AdminStatsPage }))
);
const AdminOrganizationsPage = lazy(() =>
  import('@/pages/AdminOrganizationsPage').then((m) => ({ default: m.AdminOrganizationsPage }))
);
const AdminStaffPage = lazy(() =>
  import('@/pages/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage }))
);
const DisplayPage = lazy(() =>
  import('@/pages/LiveQueuePage').then((m) => ({ default: m.DisplayPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 },
  },
});

/** Xodim uchun boshlang'ich sahifa admin panel, mijoz uchun dashboard. */
function homeFor(isStaff: boolean): string {
  return isStaff ? '/admin' : '/dashboard';
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  return children;
}

function RequireStaff({
  children,
  superAdminOnly = false,
}: {
  children: JSX.Element;
  superAdminOnly?: boolean;
}) {
  const { profile, loading, isStaff, isSuperAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  if (superAdminOnly ? !isSuperAdmin : !isStaff) {
    return <Navigate to={homeFor(isStaff)} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { profile, loading, isStaff } = useAuth();
  if (loading) return <LoadingScreen />;
  if (profile) return <Navigate to={homeFor(isStaff)} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        {/* Ochiq display — login talab qilinmaydi */}
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/display/:slug" element={<DisplayPage />} />

        {/* Mijoz sahifalari (xodimlar ham foydalana oladi) */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <UserDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/get-queue"
          element={
            <RequireAuth>
              <GetQueuePage />
            </RequireAuth>
          }
        />
        <Route
          path="/join/:slug"
          element={
            <RequireAuth>
              <GetQueuePage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-queue"
          element={
            <RequireAuth>
              <QueueDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <QueueHistoryPage />
            </RequireAuth>
          }
        />

        {/* Xodim / admin sahifalari */}
        <Route
          path="/admin"
          element={
            <RequireStaff>
              <AdminDashboard />
            </RequireStaff>
          }
        />
        <Route
          path="/admin/services"
          element={
            <RequireStaff>
              <AdminServicesPage />
            </RequireStaff>
          }
        />
        <Route
          path="/admin/organizations"
          element={
            <RequireStaff>
              <AdminOrganizationsPage />
            </RequireStaff>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <RequireStaff>
              <AdminStatsPage />
            </RequireStaff>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <RequireStaff superAdminOnly>
              <AdminStaffPage />
            </RequireStaff>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
