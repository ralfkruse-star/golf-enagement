import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import EventsPage from './pages/EventsPage';
import NotificationsPage from './pages/NotificationsPage';
import FeedPage from './pages/FeedPage';
import SegmentsPage from './pages/SegmentsPage';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="feed" element={<FeedPage />} />
        <Route path="segments" element={<SegmentsPage />} />
      </Route>
    </Routes>
  );
}
