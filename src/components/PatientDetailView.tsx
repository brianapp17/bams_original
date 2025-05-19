// PatientDetailView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off, push, set } from "firebase/database";
import { app } from '../firebase';
import type { Patient, ApiResponse, PatientInfo, ChatMessage } from '../types';
import { getCategoryLabel } from '../api';

// Components
import Header from './Header';
import PatientSidebar from './PatientSidebar';
import ChatSidebar from './ChatSidebar';
import SearchBar from './SearchBar';
import MedicalRecords from './MedicalRecords';
import AddResourceMenu from './AddResourceMenu';
import AddObservationForm from './AddObservationForm';

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

  const [showAddResourceMenu, setShowAddResourceMenu] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);

  const auth = getAuth(app);
  const database = getDatabase(app);

  // Function to fetch medical records (Observations for now) directly from Firebase
  const fetchMedicalRecordsFromFirebase = useCallback((doctorUid: string, patientId: string) => {
    setIsLoadingRecords(true);
    setRecordsError(null);
    // Point to the 'observations' node under the patient
    const observationsRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/observations`);

    console.log(`[fetchMedicalRecordsFromFirebase] Setting up listener for: doctors/${doctorUid}/patients/${patientId}/observations`);

    const recordsListener = onValue(observationsRef, (snapshot) => {
      const observationsData = snapshot.val();
      console.log('[fetchMedicalRecordsFromFirebase] Raw data received from Firebase:', observationsData);

      const formattedRecords: ApiResponse = { results: [] };

      if (observationsData) {
        console.log('[fetchMedicalRecordsFromFirebase] Processing received data...');
        // Iterate through the observations (which are key-value pairs in Firebase)
        Object.keys(observationsData).forEach(key => {
          const observation = observationsData[key];
          // Check if the observation object itself is valid before pushing
          if (observation && typeof observation === 'object') {
               console.log(`[fetchMedicalRecordsFromFirebase] Formatting observation with key ${key}:`, observation);
               // Format the observation data to match ApiResponse structure expected by MedicalRecords
               formattedRecords.results.push({
                 document: {
                   structData: {
                     // Place the observation data inside structData.Observation
                     Observation: observation
                   }
                 },
                 // You might need to add other metadata fields here if MedicalRecords uses them,
                 // based on the previous structure from searchMedicalRecords.
                 // Example: if MedicalRecords expects a 'resourceType' at the top level:
                 // resource: { resourceType: 'Observation' }
                 // Another example: adding a unique key/id to the top level if MedicalRecords needs it
                 // key: key, // The Firebase push key
                 // id: observation.id || key // Use the id from data if available, otherwise use Firebase key
               });
          } else {
              console.warn(`[fetchMedicalRecordsFromFirebase] Skipping invalid observation data for key ${key}:`, observation);
          }
        });
         console.log('[fetchMedicalRecordsFromFirebase] Finished processing data.');
      } else {
          console.log('[fetchMedicalRecordsFromFirebase] No observation data found at this path.');
      }


      console.log('[fetchMedicalRecordsFromFirebase] Final formatted data for MedicalRecords:', formattedRecords);
      setMedicalRecords(formattedRecords);
      setIsLoadingRecords(false); // Ensure loading is false after processing

    }, (dbError) => {
      console.error("Error fetching medical records from Firebase:", dbError);
      setRecordsError('Error al cargar registros médicos desde la base de datos.');
      setIsLoadingRecords(false); // Ensure loading is false on error
    });

    return () => off(observationsRef, 'value', recordsListener); // Cleanup listener
  }, [database]);

  // Effect to listen for patient data and medical records data changes in Firebase
  useEffect(() => {
    if (!patientId) {
      setPatientError('No se especificó un ID de paciente.');
      setIsLoadingPatient(false);
      setIsLoadingRecords(false);
      return;
    }

    let unsubscribePatient: () => void = () => {};
    let unsubscribeRecords: () => void = () => {};
    let unsubscribeAuth: () => void = () => {};

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const patientRef = ref(database, `doctors/${doctorUid}/patients/${patientId}`);

        setIsLoadingPatient(true);
        setPatientError(null);

        // Set up listener for patient demographic data
        unsubscribePatient = onValue(patientRef, (snapshot) => {
          const patientData = snapshot.val() as Patient;
          console.log('[useEffect] Patient data from Firebase:', patientData);

          if (patientData) {
            setPatient(patientData);
            setPatientInfo({
              name: `${patientData.name?.[0]?.given?.join(' ') || ''} ${patientData.name?.[0]?.family || ''}`,
              id: patientData.id,
              birthDate: patientData.birthDate,
              gender: patientData.gender,
              identifier: patientData.identifier?.[0]?.value || patientData.dui,
            });

            // Once patient data is loaded, set up listener for medical records
            // Make sure patientId is not null before calling
             if (patientId && doctorUid) {
               console.log('[useEffect] Patient data loaded, setting up medical records listener.');
               unsubscribeRecords = fetchMedicalRecordsFromFirebase(doctorUid, patientId);
             }

          } else {
            console.log('[useEffect] Patient not found in database.');
            setPatient(null);
            setPatientInfo(null);
            setPatientError('Paciente no encontrado en la base de datos.');
            // If patient is not found, stop loading records as well
            setMedicalRecords(null);
            setIsLoadingRecords(false);
          }
          setIsLoadingPatient(false); // Patient loading finished
        }, (dbError) => {
          console.error("Error fetching patient data from DB:", dbError);
          setPatientError('Error al cargar datos del paciente desde la base de datos.');
          setIsLoadingPatient(false); // Patient loading finished
          setIsLoadingRecords(false); // Stop loading records on patient data error
        });

      } else {
        navigate('/login');
      }
    });

    // Cleanup function for all listeners
    return () => {
      unsubscribeAuth();
      unsubscribePatient();
      unsubscribeRecords();
      console.log('[useEffect] Cleaning up Firebase listeners.');
    };
  }, [auth, database, navigate, patientId, fetchMedicalRecordsFromFirebase]);

  const getCategories = useCallback(() => {
    console.log('[getCategories] Recalculating categories with medicalRecords data:', medicalRecords);
    if (!medicalRecords?.results) return [];
    const categoriesMap = new Map<string, boolean>();
    medicalRecords.results.forEach(record => {
      // Assuming your Firebase data structure maps to a similar format or you adapt it here
      // The 'document.structData' part is based on the previous structure from searchMedicalRecords
      // You might need to adjust this based on your Firebase data structure
      const data = record.document.structData;
      const extractCategories = (resource: any) => {
          // This logic needs to read the category from the Observation resource in structData
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

      // Check specifically for the Observation resource within structData
      if (data.Observation) extractCategories(data.Observation);
      // TODO: Add logic here to extract categories from other resource types if you add them to Firebase

    });
    const categories = Array.from(categoriesMap.keys()).sort();
    console.log('[getCategories] Calculated categories:', categories);
    return categories;
  }, [medicalRecords]);


  // fhirDataString is likely used for the ChatSidebar, keep it for now
  const fhirDataString = medicalRecords ? JSON.stringify(medicalRecords, null, 2) : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    // Note: Search logic will now need to filter the data fetched from Firebase
  };

  const handleSelectResource = (resourceType: string) => {
    setSelectedResourceType(resourceType);
  };

  const handleSaveObservation = async (formData: any) => {
    if (!patientId || !auth.currentUser) {
      console.error('Cannot save observation: patientId or authenticated user is not defined.');
      // Optionally show an error message to the user
      return;
    }

    const doctorUid = auth.currentUser.uid;
    // Save under the 'observations' node
    const observationsRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/observations`);
    const newObservationRef = push(observationsRef);

    const observationDataToSave = {
      id: newObservationRef.key, // Use the generated key as the ID
      resourceType: "Observation",
      status: "final",
      category: [{
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/observation-category",
          code: "vital-signs",
          display: "Vital Signs"
        }],
        text: "Observación"
      }],
      code: {
        text: formData.codeText
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: patientInfo?.name || 'Paciente Desconocido'
      },
      effectiveDateTime: formData.effectiveDateTime,
      valueQuantity: {
        value: parseFloat(formData.value),
        unit: formData.unit
      },
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };

    console.log('Saving Observation:', observationDataToSave);

    try {
      await set(newObservationRef, observationDataToSave);
      console.log('Observation saved successfully to Firebase.');
      // The onValue listener for medical records will automatically update the view
      handleCancelAddResource();
    } catch (error) {
      console.error('Failed to save observation to Firebase:', error);
      // Optionally show an error message to the user
    }
  };

  const handleCancelAddResource = () => {
    setSelectedResourceType(null);
    setShowAddResourceMenu(false);
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
    <div className="h-screen flex flex-col bg-gray-50">
      <Header resetSearch={function (): void {
        console.log("resetSearch called in PatientDetailView");
      } } patientId={patientId || null} />
      <div className="flex flex-1 p-4 gap-4 h-0 overflow-hidden">
        <div className="w-72 xl:w-80 flex-shrink-0 h-full">
          <PatientSidebar
            patientInfo={patientInfo}
            categories={getCategories()}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            fhirData={fhirDataString}
          />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
           <div className="mb-4 flex space-x-4">
             <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Volver a Expedientes
              </Link>
              <button
                onClick={() => setShowAddResourceMenu(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                + Agregar Recurso
              </button>
           </div>
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
             <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearchSubmit}
             />
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-teal-700 mb-4 border-b pb-2">Registros Médicos</h2>
            {isLoadingRecords ? (
                <div className="text-center text-gray-600 py-8">Cargando registros médicos...</div>
            ) : recordsError ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{recordsError}</span>
                  </div>
            ) : medicalRecords?.results && medicalRecords.results.length > 0 ? (
                <MedicalRecords results={medicalRecords} isLoading={isLoadingRecords} selectedCategory={selectedCategory} />
            ) : (
                  <div className="text-center text-gray-600 py-8">No se encontraron registros médicos para este paciente.</div>
            )}
          </div>
        </div>
        <div className="w-96 flex-shrink-0 h-full">
          <ChatSidebar
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            isChatLoading={isChatLoading}
            setIsChatLoading={setIsChatLoading}
            resultsData={fhirDataString}
            selectedPatientId={patientId || null}
          />
        </div>

        {showAddResourceMenu && !selectedResourceType && (
          <AddResourceMenu
            onSelectResource={handleSelectResource}
            onCancel={handleCancelAddResource}
          />
        )}

        {showAddResourceMenu && selectedResourceType === 'Observation' && (
          <AddObservationForm
            onSave={handleSaveObservation}
            onCancel={() => setSelectedResourceType(null)}
          />
        )}
      </div>
    </div>
  );
};

export default PatientDetailView;