import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import Onboarding from "@/pages/onboarding/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Payroll from "@/pages/Payroll";
import Staff from "@/pages/Staff";
import Settings from "@/pages/Settings";
import Subjects from "@/pages/Subjects";
import Leave from "@/pages/Leave";
import Attendance from "@/pages/Attendance";
import Compliance from "@/pages/Compliance";
import PayslipView from "@/pages/PayslipView";

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function FullSpinner() {
  return (
    <div className="h-screen grid place-items-center">
      <div className="w-8 h-8 border-2 border-line2 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/payslip/:token" element={<PayslipView />} />
        <Route
          path="/onboarding"
          element={
            <Protected>
              <Onboarding />
            </Protected>
          }
        />
        <Route
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/compliance" element={<Compliance />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
