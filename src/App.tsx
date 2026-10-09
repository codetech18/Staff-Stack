import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'
import { isDemo } from '@/lib/demo'
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Signup = lazy(() => import('@/pages/auth/Signup'))
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Payroll = lazy(() => import('@/pages/Payroll'))
const Staff = lazy(() => import('@/pages/Staff'))
const Settings = lazy(() => import('@/pages/Settings'))
const Subjects = lazy(() => import('@/pages/Subjects'))
const Leave = lazy(() => import('@/pages/Leave'))
const Attendance = lazy(() => import('@/pages/Attendance'))
const Compliance = lazy(() => import('@/pages/Compliance'))
const EmployeePortal = lazy(() => import('@/pages/EmployeePortal'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const Invitation = lazy(() => import('@/pages/Invitation'))
const Audit = lazy(() => import('@/pages/Audit'))
const PayslipView = lazy(() => import('@/pages/PayslipView'))

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullSpinner />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function FullSpinner() {
  return (
    <div className="h-screen grid place-items-center">
      <div className="w-8 h-8 border-2 border-line2 border-t-accent rounded-full animate-spin" />
    </div>
  )
}

function Admin({ children, audit = false }: { children: React.ReactNode; audit?: boolean }) {
  const { role, orgLoading } = useAuth()
  if (orgLoading) return <FullSpinner />
  if (role === 'employee') return <Navigate to="/me" replace />
  if (audit && role !== 'owner' && role !== 'auditor') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<FullSpinner />}>
        <Routes>
          <Route path="/" element={isDemo ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<Login />} />
          <Route path="/invite/:token" element={<Invitation />} />
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
            <Route
              path="/dashboard"
              element={
                <Admin>
                  <Dashboard />
                </Admin>
              }
            />
            <Route
              path="/payroll"
              element={
                <Admin>
                  <Payroll />
                </Admin>
              }
            />
            <Route
              path="/staff"
              element={
                <Admin>
                  <Staff />
                </Admin>
              }
            />
            <Route path="/me" element={<EmployeePortal />} />
            <Route
              path="/audit"
              element={
                <Admin audit>
                  <Audit />
                </Admin>
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/subjects"
              element={
                <Admin>
                  <Subjects />
                </Admin>
              }
            />
            <Route
              path="/leave"
              element={
                <Admin>
                  <Leave />
                </Admin>
              }
            />
            <Route
              path="/attendance"
              element={
                <Admin>
                  <Attendance />
                </Admin>
              }
            />
            <Route
              path="/compliance"
              element={
                <Admin>
                  <Compliance />
                </Admin>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
