import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from '../firebase';
import type { Patient, ApiResponse } from '../types'; // Assuming Patient and ApiResponse types exist
import { searchMedicalRecords } from '../api'; // Import the API function

// Import the MedicalRecords component
import MedicalRecords from './MedicalRecords';

const PatientRecordPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<ApiResponse | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true); // Assuming records are fetched initially
  const [patientError, setPatientError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const auth = getAuth(app);
  const database = getDatabase(app);

  // Effect to fetch patient data and medical records when patientId or auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && patientId) {
        const doctorUid = user.uid;
        const patientRef = ref(database, `doctors/${doctorUid}/patients/${patientId}`);

        // Fetch Patient Demographic Data
        setIsLoadingPatient(true);
        setPatientError(null);
        const patientListener = onValue(patientRef, (snapshot) => {
          const patientData = snapshot.val() as Patient;
          if (patientData) {
            setPatient(patientData);
          } else {
            setPatient(null);
            setPatientError('Paciente no encontrado.');
          }
          setIsLoadingPatient(false);
        }, (error) => {
          console.error("Error fetching patient data:", error);
          setPatientError('Error al cargar datos del paciente.');
          setIsLoadingPatient(false);
        });

        // Fetch Medical Records (assuming searchMedicalRecords fetches by patientId)
         setIsLoadingRecords(true);
         setRecordsError(null);
         searchMedicalRecords(patientId) // Call API function to fetch records
            .then(data => {
                setMedicalRecords(data);
                setIsLoadingRecords(false);
            })
            .catch(error => {
                 console.error('Error fetching medical records:', error);
                 setRecordsError(`Error al cargar registros médicos: ${error.message}`);
                 setIsLoadingRecords(false);
            });

        return () => { 
            off(patientRef, 'value', patientListener);
             // TODO: Add cleanup for medical records fetch if it uses a listener
             // Currently assumes searchMedicalRecords is a one-time fetch
        };

      } else if (!user) {
        navigate('/login'); // Redirect if not authenticated
      } else if (!patientId) {
         setPatient(null);
         setMedicalRecords(null);
         setPatientError('No se especificó un paciente.');
         setIsLoadingPatient(false);
         setIsLoadingRecords(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, database, navigate, patientId]); // Rerun effect if dependencies change

  // Display a loading state while fetching initial patient data
  if (isLoadingPatient && !patientError) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando datos del paciente...</p></div>;
  }

  // Display error if patient not found or other loading error for patient data
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

  // Render the patient record details and medical records
  return (
    <div className="min-h-screen bg-gray-50 p-8">
       <div className="mb-8">
        <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Volver a Expedientes
        </Link>
      </div>
      <div className="max-w-8xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-teal-800 mb-4">Expediente de Paciente</h1>

        {/* Patient Basic Information */}
        <div className="mb-6 border-b pb-4">
            <p className="text-lg font-semibold text-gray-800 mb-2">👤 Nombre: {`${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}</p>
            <p className="text-gray-600 mb-1">🪪 DUI: {patient.dui || 'N/A'}</p>
            <p className="text-gray-600 mb-1">🚻 Género: {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || 'N/A'}</p>
            <p className="text-gray-600">🎂 Fecha de nacimiento: {patient.birthDate || 'N/A'}</p>
        </div>

        {/* Medical Records Section */}
        <h2 className="text-xl font-bold text-teal-800 mb-4">Registros Médicos</h2>
         {isLoadingRecords ? (
             <div className="text-center text-gray-600">Cargando registros médicos...</div>
         ) : recordsError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{recordsError}</span>
              </div>
         ) : medicalRecords?.results && medicalRecords.results.length > 0 ? (
             <MedicalRecords results={medicalRecords} isLoading={isLoadingRecords} selectedCategory={null} />
         ) : (
              <div className="text-center text-gray-600">No se encontraron registros médicos para este paciente.</div>
         )}
      </div>
    </div>
  );
};

export default PatientRecordPage;