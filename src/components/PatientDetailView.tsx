// PatientDetailView.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from '../firebase';
import type { Patient, ApiResponse, PatientInfo, ChatMessage } from '../types';
import { searchMedicalRecords, getCategoryLabel } from '../api';

// Components
import PatientSidebar from './PatientSidebar';
import ChatSidebar from './ChatSidebar';
import SearchBar from './SearchBar';
import MedicalRecords from './MedicalRecords';

const PatientDetailView: React.FC = () => {
  const { patientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<ApiResponse | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const auth = getAuth(app);
  const database = getDatabase(app);

  useEffect(() => {
    if (!patientId) {
      setPatientError('No se especificó un ID de paciente.');
      setIsLoadingPatient(false);
      setIsLoadingRecords(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const patientRef = ref(database, `doctors/${doctorUid}/patients/${patientId}`);

        setIsLoadingPatient(true);
        setPatientError(null);

        const patientListener = onValue(patientRef, (snapshot) => {
          const patientData = snapshot.val() as Patient;
          if (patientData) {
            setPatient(patientData);
            setPatientInfo({
              name: `${patientData.name?.[0]?.given?.join(' ') || ''} ${patientData.name?.[0]?.family || ''}`,
              id: patientData.id,
              birthDate: patientData.birthDate,
              gender: patientData.gender,
              identifier: patientData.identifier?.[0]?.value || patientData.dui,
            });
          } else {
            setPatient(null);
            setPatientInfo(null);
            setPatientError('Paciente no encontrado.');
          }
          setIsLoadingPatient(false);
        }, (dbError) => {
          console.error("Error fetching patient data:", dbError);
          setPatientError('Error al cargar datos del paciente.');
          setIsLoadingPatient(false);
        });

        setIsLoadingRecords(true);
        setRecordsError(null);
        searchMedicalRecords(patientId)
            .then(data => {
                setMedicalRecords(data);
                setIsLoadingRecords(false);
            })
            .catch(apiError => {
                 console.error('Error fetching medical records:', apiError);
                 setRecordsError(`Error al cargar registros médicos: ${apiError.message}`);
                 setIsLoadingRecords(false);
            });

        return () => {
            off(patientRef, 'value', patientListener);
        };
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [auth, database, navigate, patientId]);

  const getCategories = () => {
    if (!medicalRecords?.results) return [];
    const categoriesMap = new Map<string, boolean>();
    medicalRecords.results.forEach(record => {
      const data = record.document.structData;
      const extractCategories = (resource: any) => {
          if (resource?.category) {
              resource.category.forEach((cat: any) => {
                  if (cat.text) categoriesMap.set(getCategoryLabel(cat.text), true);
                  if (cat.coding) {
                      cat.coding.forEach((code: any) => {
                          if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                          if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                      });
                  }
              });
          }
      };

      if (data.DiagnosticReport) extractCategories(data.DiagnosticReport);
      if (data.Observation) extractCategories(data.Observation);
      if (data.Condition) extractCategories(data.Condition);
      if (data.Procedure) extractCategories(data.Procedure);
      if (data.MedicationRequest) extractCategories(data.MedicationRequest);
      // Add other resource types as needed based on your data
    });
    return Array.from(categoriesMap.keys()).sort();
  };


  const fhirDataString = medicalRecords ? JSON.stringify(medicalRecords, null, 2) : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    // Note: Search logic isn't fully implemented here, MedicalRecords component likely handles filtering
  };

  if (isLoadingPatient) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando datos del paciente...</p></div>;
  }

  if (patientError || !patient) {
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

  return (
    // Outermost container: Full viewport height, flex column layout
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header / Top Bar */}
      <div className="p-4 bg-white shadow-md flex-shrink-0">
        <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Volver a Expedientes
        </Link>
      </div>

      {/* Main Content Area: Takes remaining vertical space, flex row for columns */}
      {/* h-0 and overflow-hidden here work correctly to make the container a flex item taking available height and contain its horizontal flex items */}
      <div className="flex flex-1 p-4 gap-4 h-0 overflow-hidden"> {/* min-h-0 removed as h-0 is used */}

        {/* Left Sidebar Wrapper - takes fixed width, takes full height */}
        {/* This wrapper provides the space for the PatientSidebar component */}
        <div className="w-72 xl:w-80 flex-shrink-0 h-full"> {/* Removed flex flex-col here, as the inner component is flex-col */}
          <PatientSidebar
            patientInfo={patientInfo}
            categories={getCategories()}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            fhirData={fhirDataString}
            // PatientSidebar component's ROOT element MUST have className="h-full flex flex-col"
            // and its SCROLLABLE CONTENT area MUST have className="flex-1 overflow-y-auto"
          />
        </div>

        {/* Center Content Wrapper - takes remaining space, allows vertical scrolling */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
          {/* Patient Basic Information Card */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h1 className="text-xl font-bold text-teal-800 mb-4">Expediente de: {`${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}</h1>
            <div className="border-b pb-2 mb-3">
                <p className="text-gray-700"><strong>Nombre Completo:</strong> {`${patient.name?.[0]?.given?.join(' ') || ''} ${patient.name?.[0]?.family || ''}`}</p>
                <p className="text-gray-700"><strong>DUI:</strong> {patient.dui || 'N/A'}</p>
                <p className="text-gray-700"><strong>Género:</strong> {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || 'N/A'}</p>
                <p className="text-gray-700"><strong>Fecha de nacimiento:</strong> {patient.birthDate || 'N/A'}</p>
            </div>
          </div>

          {/* Search Bar for medical records */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
             <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearchSubmit}
             />
          </div>

          {/* Medical Records Section Card */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-teal-700 mb-4 border-b pb-2">Registros Médicos</h2>
            {isLoadingRecords ? (
                <div className="text-center text-gray-600 py-8">Cargando registros médicos...</div>
            ) : recordsError ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{recordsError}</span>
                  </div>
            ) : medicalRecords?.results && medicalRecords.results.length > 0 ? (
                // MedicalRecords component should handle its own overflow if needed
                <MedicalRecords results={medicalRecords} isLoading={isLoadingRecords} selectedCategory={selectedCategory} />
            ) : (
                  <div className="text-center text-gray-600 py-8">No se encontraron registros médicos para este paciente.</div>
            )}
          </div>
        </div>

        {/* Right Sidebar Wrapper - takes fixed width, takes full height */}
        {/* This wrapper provides the space for the ChatSidebar component */}
        <div className="w-96 flex-shrink-0 h-full"> {/* Removed flex flex-col here, as the inner component is flex-col */}
          <ChatSidebar
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            isChatLoading={isChatLoading}
            setIsChatLoading={setIsChatLoading}
            resultsData={fhirDataString}
            selectedPatientId={patientId || null}
            // ChatSidebar component's ROOT element MUST have className="h-full flex flex-col"
            // and its SCROLLABLE CONTENT area (message list) MUST have className="flex-1 overflow-y-auto"
            // and its INPUT area MUST have className="flex-shrink-0"
          />
        </div>
      </div>
    </div>
  );
};

export default PatientDetailView;