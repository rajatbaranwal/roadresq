import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import { CardSkeleton } from "./components/ui/Feedback";
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';
import GuestRoute from './routes/GuestRoute';
import { homePathFor } from './utils/routes';

// Route-level code splitting: maps, chat and dashboards load on demand
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const HelpRequest = lazy(() => import("./pages/HelpRequest"));
const MechanicList = lazy(() => import("./pages/MechanicList"));
const MechanicDashboard = lazy(() => import("./pages/MechanicDashboard"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const MyRequests = lazy(() => import("./pages/MyRequests"));

const PageFallback = () => (
  <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
    <CardSkeleton rows={4} />
    <CardSkeleton rows={2} />
  </div>
);

// Scroll to top on page change, or to #section for in-page links
const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

const customerOnly = (page) => (
  <PrivateRoute>
    <RoleRoute role="user">{page}</RoleRoute>
  </PrivateRoute>
);

const App = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    // Re-created per user so session notifications never leak across accounts
    <NotificationProvider key={user?.id || user?._id || 'guest'}>
      <ScrollManager />
      <Navbar />
      <main key={location.pathname} className="animate-page-in">
        <Suspense fallback={<PageFallback />}>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

          {/* Customer routes */}
          <Route path="/dashboard" element={customerOnly(<CustomerDashboard />)} />
          <Route path="/help" element={customerOnly(<HelpRequest />)} />
          <Route path="/my-requests" element={customerOnly(<MyRequests />)} />

          {/* Protected routes for all logged-in users */}
          <Route
            path="/mechanics"
            element={
              <PrivateRoute>
                <MechanicList />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            }
          />

          {/* Protected route for mechanics only */}
          <Route
            path="/dashboard/mechanic"
            element={
              <PrivateRoute>
                <RoleRoute role="mechanic">
                  <MechanicDashboard />
                </RoleRoute>
              </PrivateRoute>
            }
          />

          {/* Fallback route */}
          <Route
            path="*"
            element={<Navigate to={user ? homePathFor(user) : "/login"} replace />}
          />
        </Routes>
        </Suspense>
      </main>
    </NotificationProvider>
  );
};

export default App;
