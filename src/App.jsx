import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import CalculatorPage from './pages/CalculatorPage';
import ContactPage from './pages/ContactPage';
import Openfreedemat from './pages/openfreedemat';
import PartnerPage from './pages/PartnerPage';
import AdminPortal from './pages/AdminPortal';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
};

const PublicRoute = ({ children, allowAuthenticated = false }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (isAuthenticated && !allowAuthenticated) return <Navigate to="/dashboard" replace />;

  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Toaster position="top-right" />

      <Routes>
        <Route path="/tradexadmin2025" element={<AdminPortal />} />

        <Route
          path="/"
          element={
            <>
              <Navbar />
              <LandingPage />
              <Footer />
            </>
          }
        />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute allowAuthenticated>
              <SignupPage />
            </PublicRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        <Route
          path="/markets"
          element={
            <>
              <Navbar />
              <Markets />
              <Footer />
            </>
          }
        />

        <Route
          path="/calculator"
          element={
            <>
              <Navbar />
              <CalculatorPage />
              <Footer />
            </>
          }
        />

        <Route
          path="/contact"
          element={
            <>
              <Navbar />
              <ContactPage />
              <Footer />
            </>
          }
        />
     
        <Route
          path="/openfreedemat"
          element={
            <>
              <Navbar />
              <Openfreedemat />
              <Footer />
            </>
          }
        />


        <Route
          path="/partner"
          element={
            <>
              <Navbar />
              <PartnerPage />
              <Footer />
            </>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
