import React from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from './firebase';

// Components
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import NewConsultationPage from './components/NewConsultationPage';
import PatientListPage from './components/PatientListPage';
import ProfilePage from './components/ProfilePage';
import PatientDetailView from './components/PatientDetailView';
import AllMedicalReportsPage from './components/AllMedicalReportsPage'; // Import the new general reports page

// Protected Route component (remains the same)
const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const auth = getAuth(app);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const [, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (!currentUser && location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: location } });
      }
    });
    return () => unsubscribe();
  }, [auth, navigate, location]);

  if (isAuthLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Verificando sesión...</p></div>;
  }

  return children;
};

// App content including routes
const AppContent: React.FC = () => {
  return (
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/nueva-consulta" element={<ProtectedRoute><NewConsultationPage /></ProtectedRoute>} />
        <Route path="/expedientes" element={<ProtectedRoute><PatientListPage /></ProtectedRoute>} />
        
        {/* Individual Patient Record Page */}
        <Route path="/expedientes/:patientId" element={<ProtectedRoute><PatientDetailView /></ProtectedRoute>} />
        
        {/* General Medical Reports Page */}
        <Route path="/reportes-medicos" element={<ProtectedRoute><AllMedicalReportsPage /></ProtectedRoute>} />

        {/* Patient Specific Medical Reports Page (Optional - remove if not needed) */}
        {/* <Route path="/reportes-medicos/:patientId" element={<ProtectedRoute><PatientMedicalReportsPage /></ProtectedRoute>} /> */}
        
        <Route path="/configuracion" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Root path now redirects to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  );
};

// Main App component
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
