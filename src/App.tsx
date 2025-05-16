import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import User type
import { app } from './firebase'; // Assuming firebase.ts is in the parent directory

// API and Type Imports (assuming these are correctly set up)
import { searchMedicalRecords, fetchAllPatients, getCategoryLabel } from './api';
import type { ApiResponse, PatientInfo, ChatMessage, PatientListItem } from './types';

// Components
import PatientSidebar from './components/PatientSidebar';
import ChatSidebar from './components/ChatSidebar';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import MedicalRecords from './components/MedicalRecords';
import PatientSelector from './components/PatientSelector';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import NewConsultationPage from './components/NewConsultationPage';
import PatientListPage from './components/PatientListPage';
import ProfilePage from './components/ProfilePage';

// This component will wrap routes that need authentication
const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const auth = getAuth(app);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
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
    // You can show a global loading spinner here if desired
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Verificando sesión...</p></div>;
  }

  return children;
};

// Main App component content (excluding imports and ProtectedRoute)
const AppContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This useEffect now assumes authentication is handled by ProtectedRoute
  // for pages that require it. Data fetching can proceed if user is present.
  useEffect(() => {
    const auth = getAuth(app);
    if (auth.currentUser) { // Only load if user is authenticated
        loadPatients();
    }
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    if (selectedPatientId && auth.currentUser) {
      setPatientInfo(null);
      setResults(null);
      setChatMessages([]);
      setSearchQuery('');
      setSelectedCategory(null);
      setError(null);
      loadPatientInfo(selectedPatientId);
    } else if (!selectedPatientId) {
      setPatientInfo(null);
      setResults(null);
      setChatMessages([]);
      setSearchQuery('');
      setSelectedCategory(null);
      setError(null);
    }
  }, [selectedPatientId]);

  const loadPatients = async () => {
    setIsLoadingPatients(true);
    setError(null);
    try {
      const data = await fetchAllPatients(); // This might need to be aware of the doctor's UID
      setPatients(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error fetching patients:', errorMessage);
      setError(errorMessage);
      setPatients([]);
    }
    setIsLoadingPatients(false);
  };

  const loadPatientInfo = async (patientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchMedicalRecords(patientId);
      setResults(data);
      if (data.results && data.results.length > 0) {
        const patientRecord = data.results.find((record: any) => record.document.structData?.Patient)?.document.structData?.Patient;
        if (patientRecord) {
             setPatientInfo({
                 name: `${patientRecord.name[0].given.join(' ')} ${patientRecord.name[0].family}`,
                 id: patientRecord.id,
                 birthDate: patientRecord.birthDate,
                 gender: patientRecord.gender,
                 identifier: patientRecord.identifier[0].value,
             });
        } else { setPatientInfo(null); setError("Patient information not found."); }
      } else { setPatientInfo(null); setResults(null); setError("No medical records found.");}
    } catch (err) {
      console.error('Error fetching patient info or records:', err);
      setPatientInfo(null); setResults(null); setError('Failed to load medical records.');
    } finally { setIsLoading(false); }
  };

  const loadData = async (query: string = '') => {
      if (!selectedPatientId) return;
      if (query === '' && results) { return; }
      setIsLoading(true); setError(null);
      try {
        const data = await searchMedicalRecords(selectedPatientId, query);
        setResults(data);
      } catch (err) { console.error('Error fetching data:', err); setError('Failed to perform search.');
      } finally { setIsLoading(false); }
    };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); loadData(searchQuery); };
  const resetSearch = () => { setSearchQuery(''); setSelectedCategory(null); if (selectedPatientId) { loadPatientInfo(selectedPatientId); } else { setResults(null); setError(null); }};
  const handlePatientSelect = (patientId: string) => { setSelectedPatientId(patientId); };

  const getCategories = () => {
    if (!results?.results) return [];
    const categoriesWithContent = new Map<string, boolean>();
    results.results.forEach(record => {
      const data = record.document.structData;
      if (data.DiagnosticReport?.category) {
        data.DiagnosticReport.category.forEach((cat: any) => {
          if (cat.text) categoriesWithContent.set(getCategoryLabel(cat.text), true);
          if (cat.coding) cat.coding.forEach((code: any) => { if (code.code) categoriesWithContent.set(getCategoryLabel(code.code), true); });
        });
      }
      if (data.Observation?.category) {
        data.Observation.category.forEach((cat: any) => {
          if (cat.coding) cat.coding.forEach((code: any) => { if (code.code) categoriesWithContent.set(getCategoryLabel(code.code), true); });
        });
      }
      if (data.Condition?.category) {
        data.Condition.category.forEach((cat: any) => { if (cat.text) categoriesWithContent.set(getCategoryLabel(cat.text), true); });
      }
    });
    return Array.from(categoriesWithContent.keys()).sort();
  };

  const fhirDataString = results ? JSON.stringify(results, null, 2) : null;

  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/nueva-consulta" element={<ProtectedRoute><NewConsultationPage /></ProtectedRoute>} />
        <Route path="/expedientes" element={<ProtectedRoute><PatientListPage /></ProtectedRoute>} />
        <Route path="/configuracion" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute> (
          <div className="min-h-screen bg-gray-50 flex">
            <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
              <PatientSelector patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={handlePatientSelect} isLoading={isLoadingPatients} error={error} />
            </div>
            <PatientSidebar patientInfo={patientInfo} categories={getCategories()} selectedCategory={selectedCategory ? getCategoryLabel(selectedCategory) : null} setSelectedCategory={setSelectedCategory} fhirData={fhirDataString} />
            <div className="flex-1 mx-auto max-w-8xl px-4 py-8">
              <Header resetSearch={resetSearch} patientId={selectedPatientId} />
              <main className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-center text-gray-800 mb-2">Registros Médicos del Paciente</h1>
                <p className="text-center text-gray-600 mb-6">Visualice todos los registros médicos del paciente organizados por Inteligencia Artificial. Use el buscador<br />para encontrar información específica.</p>
                {error && !isLoadingPatients && !selectedPatientId && !isLoading && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert"><p className="font-medium">Error</p><p className="text-sm">{error}</p></div>}
                {error && selectedPatientId && !isLoading && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert"><p className="font-medium">Error al cargar datos</p><p className="text-sm">{error}</p></div>}
                {!selectedPatientId ? (
                  <div className="text-center py-12"><p className="text-gray-500">Seleccione un paciente para ver sus registros médicos</p></div>
                ) : (
                  <>
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} />
                    <MedicalRecords results={results} isLoading={isLoading} selectedCategory={selectedCategory} />
                  </>
                )}
              </main>
            </div>
            <div className="w-96 flex-shrink-0"></div> {/* Placeholder for ChatSidebar */}
            <ChatSidebar chatMessages={chatMessages} setChatMessages={setChatMessages} isChatLoading={isChatLoading} setIsChatLoading={setIsChatLoading} resultsData={fhirDataString} selectedPatientId={selectedPatientId} />
          </div>
        </ProtectedRoute>} />
      </Routes>
  );
}

// Main App component that includes the BrowserRouter
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
