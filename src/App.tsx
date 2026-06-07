import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Messages from '@/pages/Messages';
import Home from '@/pages/member/Home';
import Booking from '@/pages/member/Booking';
import MyBookings from '@/pages/member/MyBookings';
import CoachDashboard from '@/pages/coach/Dashboard';
import Reports from '@/pages/coach/Reports';
import Courses from '@/pages/manager/Courses';
import Refunds from '@/pages/manager/Refunds';
import OwnerDashboard from '@/pages/owner/Dashboard';
import RequireAuth from '@/components/RequireAuth';
import { Layout } from '@/components/layout/Layout';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/messages"
          element={
            <RequireAuth>
              <Layout>
                <Messages />
              </Layout>
            </RequireAuth>
          }
        />

        <Route
          path="/member"
          element={
            <RequireAuth allowedRoles={['member']}>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/member/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="booking" element={<Booking />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="*" element={<Navigate to="/member/home" replace />} />
        </Route>

        <Route
          path="/coach"
          element={
            <RequireAuth allowedRoles={['coach']}>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/coach/dashboard" replace />} />
          <Route path="dashboard" element={<CoachDashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/coach/dashboard" replace />} />
        </Route>

        <Route
          path="/manager"
          element={
            <RequireAuth allowedRoles={['manager']}>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/manager/courses" replace />} />
          <Route path="courses" element={<Courses />} />
          <Route path="refunds" element={<Refunds />} />
          <Route path="*" element={<Navigate to="/manager/courses" replace />} />
        </Route>

        <Route
          path="/owner"
          element={
            <RequireAuth allowedRoles={['owner']}>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="*" element={<Navigate to="/owner/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
