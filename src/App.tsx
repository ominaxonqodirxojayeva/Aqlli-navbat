import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LoadingScreen } from '@/components/ui';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { UserDashboard } from '@/pages/UserDashboard';
import { GetQueuePage } from '@/pages/GetQueuePage';
import { QueueDetailPage } from '@/pages/QueueDetailPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminServicesPage } from '@/pages/AdminServicesPage';
import { AdminStatsPage } from '@/pages/AdminStatsPage';
import { AdminOrganizationsPage } from '@/pages/AdminOrganizationsPage';
import { DisplayPage } from '@/pages/LiveQueuePage';
import type { JSX } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element;
  roles: ('customer' | 'admin')[];
}) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
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

      {/* Public display (no login) */}
      <Route path="/display" element={<DisplayPage />} />
      <Route path="/display/:slug" element={<DisplayPage />} />

      {/* Customer routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['customer']}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/get-queue"
        element={
          <ProtectedRoute roles={['customer']}>
            <GetQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:slug"
        element={
          <ProtectedRoute roles={['customer']}>
            <GetQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-queue"
        element={
          <ProtectedRoute roles={['customer']}>
            <QueueDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/services"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/organizations"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminOrganizationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stats"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminStatsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
