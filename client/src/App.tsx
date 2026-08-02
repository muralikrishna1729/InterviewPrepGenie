import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import InterviewSetupPage from "./pages/InterviewSetupPage";
import InterviewResultsPage from "./pages/InterviewResultsPage";
import InterviewSession from "./appshell/pages/InterviewSession";
import { SignupPage } from "./pages/SignupPage";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import AppShellLayout from "./appshell/AppLayout";
import Dash from "./appshell/pages/Dashboard";
import Practice from "./appshell/pages/Practice";
import Mcq from "./appshell/pages/McqPage";
import Resume from "./appshell/pages/ResumePage";
import Settings from "./appshell/pages/Settings";
import LiveInterviewSession from "./pages/LiveInterviewSession";
import PublicLayout from "./layouts/PublicLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

/** Public-only route guard: an authenticated user is bounced to /dashboard
 *  instead of ever seeing the login/signup forms. */
function PublicOnlyRoute() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans bg-hero-mesh">
      <Router>
        <Routes>
          {/* Public routes */}
          {/* Landing page without the app-level navbar/sidebar */}
          <Route path="/" element={<HomePage />} />

          <Route element={<PublicOnlyRoute />}>
            <Route element={<PublicLayout />}>
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Route>

          {/* Protected app routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShellLayout />}>
              <Route path="/dashboard" element={<Dash />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/mcq" element={<Mcq />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/interview/:sessionId" element={<InterviewSession />} />
              {/* Keep existing interview flows accessible under the same shell */}
              <Route path="/practice/new" element={<InterviewSetupPage />} />
              <Route path="/practice/session/:sessionId" element={<LiveInterviewSession />} />
              <Route path="/practice/session/:sessionId/results" element={<InterviewResultsPage />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}
