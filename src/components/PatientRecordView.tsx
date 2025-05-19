import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from '../firebase';
import type { Patient, ApiResponse, PatientInfo, ChatMessage } from '../types';
import { searchMedicalRecords, getCategoryLabel } from '../api';

// Components
import PatientSidebar from './PatientSidebar';
import ChatSidebar from './ChatSidebar';
import Header from './Header';
import SearchBar from './SearchBar';
import MedicalRecords from './MedicalRecords';

const PatientRecordView: React.FC = () => {
  const { patientId } = useParams<{ patientId?: string }>(); // patientId is optional at root
  const navigate = useNavigate();
  const location = useLocation();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<ApiResponse | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null); // PatientInfo for sidebar
  const [isLoadingPatient, setIsLoadingPatient] = useState(true); // Keep true initially as we need to check patientId
  const [isLoadingRecords, setIsLoadingRecords] = useState(false); // Assuming records might be fetched separately
  const [patientError, setPatientError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(''); // Search state for the main content
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Category state for MedicalRecords

   // Chatbot state (needs to be managed here for the ChatSidebar)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const auth = getAuth(app);
  const database = getDatabase(app);

  // Effect to fetch patient data and medical records when patientId or auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        console.log('Authenticated Doctor UID:', doctorUid);

        if (patientId) {
             console.log('Fetching data for Patient ID:', patientId);
             const patientRef = ref(database, `doctors/${doctorUid}/patients/${patientId}`);

            setIsLoadingPatient(true); // Start loading when patientId is found
            setPatientError(null);

            const patientListener = onValue(patientRef, (snapshot) => {
              const patientData = snapshot.val() as Patient;
              console.log('Fetched Patient Data:', patientData);
              if (patientData) {
                setPatient(patientData);
                setPatientInfo({
                     name: `${patientData.name?.[0]?.given?.join(' ') || ''} ${patientData.name?.[0]?.family || ''}`,
                     id: patientData.id,
                     birthDate: patientData.birthDate,
                     gender: patientData.gender,
                     identifier: patientData.identifier?.[0]?.value,
                 });

                 // Fetch Medical Records related to this patient
                 setIsLoadingRecords(true);
                 setRecordsError(null);
                 searchMedicalRecords(patientId) 
                    .then(data => {
                        console.log('Fetched Medical Records:', data);
                        setMedicalRecords(data);
                        setIsLoadingRecords(false);
                    })
                    .catch(error => {
                         console.error('Error fetching medical records:', error);
                         setRecordsError(`Error al cargar registros médicos: ${error.message}`);
                         setIsLoadingRecords(false);
                    });

              } else {
                setPatient(null);
                setPatientInfo(null);
                setMedicalRecords(null);
                setPatientError('Paciente no encontrado en la base de datos.');
                 setIsLoadingRecords(false);
              }
              setIsLoadingPatient(false); // Loading finished
            }, (error) => {
              console.error("Error fetching patient data from DB:", error);
              setPatientError('Error al cargar datos del paciente desde la base de datos.');
              setIsLoadingPatient(false); // Loading finished
               setIsLoadingRecords(false);
            });

            return () => off(patientRef, 'value', patientListener);

        } else {
            console.log('No patientId in URL, showing selection message.');
            setPatient(null);
            setPatientInfo(null);
            setMedicalRecords(null);
            setPatientError(null);
            setIsLoadingPatient(false); // No patient to load, so not loading patient data
            setIsLoadingRecords(false); // No records to load without a patient
        }

      } else {
         console.log('User not authenticated, redirecting to login.');
        navigate('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [auth, database, navigate, patientId]); // Rerun effect if dependencies change

    // Derive categories from medical records for the sidebar
   const getCategories = () => {
    if (!medicalRecords?.results) return [];

    const categoriesWithContent = new Map<string, boolean>();
    medicalRecords.results.forEach(record => {
      const data = record.document.structData;
      // Add category extraction logic similar to AppContent or PatientSidebar
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

   // Prepare FHIR data string for ChatSidebar
   const fhirDataString = medicalRecords ? JSON.stringify(medicalRecords, null, 2) : null;

   // Search and category selection handlers for the central content
  const handleSearch = (e: React.FormEvent) => { 
      e.preventDefault();
      console.log('Search submitted:', searchQuery);
      // Filtering should ideally happen here based on fetched medicalRecords
  };
  const resetSearch = () => { 
      setSearchQuery(''); 
      setSelectedCategory(null); 
       // Reset filtering logic here
  };

  const handlePatientSelect = (id: string) => { // This handler is likely unused in this component now
      navigate(`/expedientes/${id}`);
  }

  // --- Conditional Rendering --- 

  // 1. Show loading state specifically when a patientId is present and we are loading.
  if (patientId && isLoadingPatient) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando expediente...</p></div>;
  }

   // 2. Show message if no patientId is selected (e.g., accessing the root path '/').
   // This condition is met when patientId is undefined or null.
   if (!patientId) {
       return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Seleccione un Paciente</h1>
                    <p className="text-gray-600 mb-6">Navegue a la lista de expedientes para seleccionar un paciente registrado o inicie una nueva consulta.</p>
                     <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 mr-4">
                        Ver Expedientes
                    </Link>
                    <Link to="/nueva-consulta" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                         Nueva Consulta
                    </Link>
                </div>
            </div>
       );
   }

  // 3. Show error if patientId is present but data fetching failed or patient not found.
  // This condition is met if patientId exists, but patient is null or patientError is set.
  if (patientId && (patientError || !patient)) {
      return (
           <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 className="text-2xl font-bold text-red-700 mb-4">Error</h1>
                    <p className="text-gray-600 mb-6">{patientError || 'Paciente no encontrado o no especificado.'}</p>
                     <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                        Volver a la lista de expedientes
                    </Link>
                </div>
           </div>
      );
  }

   // 4. Render the full patient record layout when patient data is loaded and patientId is present.
  // This is the primary rendering condition for displaying a patient's expediente.
  if (patient && patientId && !isLoadingPatient && !patientError) {
       return (
        <div className="min-h-screen bg-gray-50 flex">

            {/* Patient Info Sidebar (Left) */}
             {/* This sidebar displays INFO, not a selector list */}
            <PatientSidebar
                  patientInfo={patientInfo}
                  categories={getCategories()}
                  selectedCategory={selectedCategory ? getCategoryLabel(selectedCategory) : null} 
                  setSelectedCategory={setSelectedCategory}
                  fhirData={fhirDataString} 
                />

          {/* Main Content Area (Patient Record Details and Medical Records) */}
          <div className="flex-1 mx-auto max-w-8xl px-4 py-8">
               <div className="mb-8">
                    <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Volver a Expedientes
                    </Link>
               </div>
                <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md mb-6">
                    <h1 className="text-2xl font-bold text-teal-800 mb-4">Expediente de Paciente</h1>
                    <div className="border-b pb-4 mb-4">
                        <p className="text-lg font-semibold text-gray-800 mb-2">👤 Nombre: {`${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}</p>
                        <p className="text-gray-600 mb-1">🪪 DUI: {patient.dui || 'N/A'}</p>
                        <p className="text-gray-600 mb-1">🚻 Género: {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || 'N/A'}</p>
                    <p className="text-gray-600">🎂 Fecha de nacimiento: {patient.birthDate || 'N/A'}</p>
                </div>
                <SearchBar 
                    searchQuery={searchQuery} 
                    setSearchQuery={setSearchQuery} 
                    handleSearch={handleSearch} 
                />
                <h2 className="text-xl font-bold text-teal-800 mb-4 mt-8">Registros Médicos</h2>
                 {isLoadingRecords ? (
                     <div className="text-center text-gray-600">Cargando registros médicos...</div>
                 ) : recordsError ? (
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{recordsError}</span>
                      </div>
                 ) : medicalRecords?.results && medicalRecords.results.length > 0 ? (
                     <MedicalRecords results={medicalRecords} isLoading={isLoadingRecords} selectedCategory={selectedCategory} />
                 ) : (
                      <div className="text-center text-gray-600">No se encontraron registros médicos para este paciente.</div>
                 )}
            </div>
          </div>

          {/* Chatbot Sidebar (Right) */}
          <div className="w-96 flex-shrink-0"></div> {/* Placeholder space */}
           <ChatSidebar
                  chatMessages={chatMessages}
                  setChatMessages={setChatMessages}
                  isChatLoading={isChatLoading}
                  setIsChatLoading={setIsChatLoading}
                  resultsData={fhirDataString} 
                  selectedPatientId={patientId || null} 
                />
        </div>
       );
   }

   // Fallback or should not be reached if logic is correct, but good to have a final return
   return null;

};

export default PatientRecordView;