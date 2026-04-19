// src/App.tsx - FIXED VERSION
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Import your pages
import Login from './pages/auth/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import PatientManagement from './pages/admin/PatientManagement'
import StaffApproval from './pages/admin/StaffManagement'
import Analytics from './pages/admin/Analytics'
import KitchenDashboard from './pages/kitchen/KitchenDashboard'
import MenuManagement from './pages/kitchen/MenuManagement'
import OrderView from './pages/kitchen/OrderView'
import KitchenAnalytics from './pages/kitchen/KitchenAnalytics'
import PatientMenu from './pages/patient/PatientMenu'
import OrderHistory from './pages/patient/OrderHistory'
import PatientProfile from './pages/patient/PatientProfile'
import AdminLayout from './components/layout/AdminLayout'
import KitchenLayout from './components/layout/KitchenLayout'
import PatientLayout from './components/layout/PatientLayout'

//  Helper: Get dashboard path by role
const getDashboardPath = (role: string): string => {
    if (role === 'ADMIN') return '/admin'
    if (role === 'STAFF' || role === 'KITCHEN_STAFF') return '/kitchen' // Include KITCHEN_STAFF
    return '/patient'
}

// Wrapper component for protected routes
function ProtectedRoute({
                            children,
                            allowedRoles
                        }: {
    children: React.ReactNode,
    allowedRoles: string[]
}) {
    const { user, isLoading } = useAuth()
    const location = useLocation()

    console.log(' ProtectedRoute:', {
        isLoading,
        user: user?.username,
        role: user?.role,
        path: location.pathname,
        allowedRoles
    })

    //  Wait for auth check
    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#92400e', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    ⏳ Loading...
                </div>
            </div>
        )
    }

    //  Redirect to login if not authenticated
    if (!user) {
        console.log(' No user - redirecting to login')
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    //  Redirect if user role not allowed
    if (!allowedRoles.includes(user.role)) {
        console.log(' Role not allowed:', user.role, 'Allowed:', allowedRoles)
        const redirectPath = getDashboardPath(user.role)

        //  Prevent redirect loop: only redirect if not already at target
        if (location.pathname === redirectPath) {
            return <>{children}</>
        }

        return <Navigate to={redirectPath} replace />
    }

    return <>{children}</>
}

//  Wrapper for public routes
function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth()

    console.log('PublicRoute:', { isLoading, user: user?.username, role: user?.role })

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#92400e', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    ⏳ Loading...
                </div>
            </div>
        )
    }

    if (user) {
        console.log(' User authenticated - redirecting to dashboard')
        const redirectPath = getDashboardPath(user.role)

        // Prevent redirect loop
        if (location.pathname === redirectPath) {
            return <>{children}</>
        }

        return <Navigate to={redirectPath} replace />
    }

    return <>{children}</>
}

//  Root redirect handler
function RootRedirect() {
    const { user, isLoading } = useAuth()
    const location = useLocation()

    console.log(' RootRedirect:', { isLoading, user: user?.username, role: user?.role, currentPath: location.pathname })

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#92400e', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                     Loading...
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    const redirectPath = getDashboardPath(user.role)

    //  CRITICAL: Only redirect if not already at target path
    if (location.pathname === redirectPath || location.pathname.startsWith(`${redirectPath}/`)) {
        return null // Already at correct destination
    }

    return <Navigate to={redirectPath} replace />
}

//  Main app routes
function AppRoutes() {
    console.log(' AppRoutes rendering')

    return (
        <Routes>
            {/*  Public Routes */}
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />

            {/*  Admin Routes */}
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                </ProtectedRoute>
            }>
                <Route index element={<AdminDashboard />} />
                <Route path="patients" element={<PatientManagement />} />
                <Route path="staff" element={<StaffApproval />} />
                <Route path="analytics" element={<Analytics />} />
            </Route>

            {/*  Kitchen Staff Routes - Accept both STAFF and KITCHEN_STAFF roles */}
            <Route path="/kitchen" element={
                <ProtectedRoute allowedRoles={['STAFF', 'KITCHEN_STAFF']}> {/*  Fixed: Include KITCHEN_STAFF */}
                    <KitchenLayout />
                </ProtectedRoute>
            }>
                <Route index element={<KitchenDashboard />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="orders" element={<OrderView />} />
                <Route path="analytics" element={<KitchenAnalytics />} />
            </Route>

            {/*  Patient Routes */}
            <Route path="/patient" element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout />
                </ProtectedRoute>
            }>
                <Route index element={<PatientMenu />} />
                <Route path="orders" element={<OrderHistory />} />
                <Route path="profile" element={<PatientProfile />} />
            </Route>

            {/*  Root Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

// Main App component
function App() {
    console.log(' App component mounting')

    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App