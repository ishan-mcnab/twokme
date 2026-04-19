import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import FullScreenLoader from './components/ui/FullScreenLoader'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { AuthCallback } from './pages/AuthCallback'
import { OnboardingFlow } from './pages/onboarding/OnboardingFlow'
import { PathSelection } from './pages/onboarding/PathSelection'
import { GeneratingPlan } from './pages/onboarding/GeneratingPlan'
import { Dashboard } from './pages/Dashboard'
import { Workout } from './pages/Workout'
import { Profile } from './pages/Profile'

const PlayerCard = lazy(() =>
  import('./pages/PlayerCard').then((m) => ({ default: m.PlayerCard })),
)
const Evolution = lazy(() => import('./pages/Evolution').then((m) => ({ default: m.Evolution })))
const ArchetypeReveal = lazy(() =>
  import('./pages/onboarding/ArchetypeReveal').then((m) => ({ default: m.ArchetypeReveal })),
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<OnboardingFlow />} />
              <Route path="archetype-reveal" element={<ArchetypeReveal />} />
              <Route path="path-selection" element={<PathSelection />} />
              <Route path="generating-plan" element={<GeneratingPlan />} />
            </Route>

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/player-card" element={<PlayerCard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route
              path="/evolution"
              element={
                <ProtectedRoute>
                  <Evolution />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
