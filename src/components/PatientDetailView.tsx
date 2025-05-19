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
import AddConditionForm from './AddConditionForm';
import AddProcedureForm from './AddProcedureForm';
import AddEncounterForm from './AddEncounterForm';
import AddMedicationAdministrationForm from './AddMedicationAdministrationForm'; // Import AddMedicationAdministrationForm

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

  // Function to fetch medical records from Firebase
  const fetchMedicalRecordsFromFirebase = useCallback((doctorUid: string, patientId: string) => {
    setIsLoadingRecords(true);
    setRecordsError(null);

    const resourcePaths = [
      `doctors/${doctorUid}/patients/${patientId}/observations`,
      `doctors/${doctorUid}/patients/${patientId}/conditions`,
      `doctors/${doctorUid}/patients/${patientId}/procedures`,
      `doctors/${doctorUid}/patients/${patientId}/encounters`,
      `doctors/${doctorUid}/patients/${patientId}/medicationAdministrations`,
    ];

    console.log(`[fetchMedicalRecordsFromFirebase] Setting up listeners for multiple paths`);

    // Use an array to store unsubscribe functions for each listener
    const unsubscribeFunctions: (() => void)[] = [];
    const allRecords: any[] = [];
    let loadedCount = 0;

    const processSnapshot = (snapshot: any, resourceType: string) => {
      const data = snapshot.val();
      console.log(`[fetchMedicalRecordsFromFirebase] Raw ${resourceType} data received:`, data);
      if (data) {
        Object.keys(data).forEach(key => {
          const record = data[key];
          if (record && typeof record === 'object') {
            const structData: { [key: string]: any } = {};
            structData[resourceType] = record;
            allRecords.push({
              document: {
                structData: structData
              },
            });
          }
        });
      }
    };

    const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount === resourcePaths.length) {
            console.log('[fetchMedicalRecordsFromFirebase] All data loaded, final formatted records:', { results: allRecords });
            setMedicalRecords({ results: allRecords });
            setIsLoadingRecords(false);
        }
    };

    const setupListener = (path: string, resourceType: string) => {
      const dataRef = ref(database, path);
      const listener = onValue(dataRef, (snapshot) => {
        processSnapshot(snapshot, resourceType);
        checkAllLoaded(); // Check if all listeners have fired at least once
      }, (dbError) => {
        console.error(`Error fetching ${resourceType} data from Firebase:`, dbError);
        setRecordsError(`Error al cargar datos de ${resourceType.toLowerCase()} desde la base de datos.`);
        checkAllLoaded(); // Still need to check if all others loaded, or handle error state
      });
      unsubscribeFunctions.push(() => off(dataRef, 'value', listener));
    };

    setupListener(resourcePaths[0], 'Observation');
    setupListener(resourcePaths[1], 'Condition');
    setupListener(resourcePaths[2], 'Procedure');
    setupListener(resourcePaths[3], 'Encounter');
    setupListener(resourcePaths[4], 'MedicationAdministration');

    return () => {
      console.log('[fetchMedicalRecordsFromFirebase] Cleaning up all medical record listeners.');
      unsubscribeFunctions.forEach(unsub => unsub());
    };

  }, [database]);

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

             if (patientId && doctorUid) {
               console.log('[useEffect] Patient data loaded, setting up medical records listeners.');
               unsubscribeRecords = fetchMedicalRecordsFromFirebase(doctorUid, patientId);
             }

          } else {
            console.log('[useEffect] Patient not found in database.');
            setPatient(null);
            setPatientInfo(null);
            setPatientError('Paciente no encontrado en la base de datos.');
            setMedicalRecords(null);
            setIsLoadingRecords(false);
          }
          setIsLoadingPatient(false);
        }, (dbError) => {
          console.error("Error fetching patient data from DB:", dbError);
          setPatientError('Error al cargar datos del paciente desde la base de datos.');
          setIsLoadingPatient(false);
          setIsLoadingRecords(false);
        });

      } else {
        navigate('/login');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribePatient();
      if (unsubscribeRecords) unsubscribeRecords();
      console.log('[useEffect] Cleaning up Firebase listeners.');
    };
  }, [auth, database, navigate, patientId, fetchMedicalRecordsFromFirebase]);

  const getCategories = useCallback(() => {
    console.log('[getCategories] Recalculating categories with medicalRecords data:', medicalRecords);
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
           if (!resource?.category && resource?.code?.text && resource.resourceType === 'Procedure') {
               categoriesMap.set(getCategoryLabel('Procedimiento'), true); // Default category for procedures
           }
           if (!resource?.category && resource?.type && resource.resourceType === 'Encounter') {
                resource.type.forEach((typeObj: any) => {
                    if (typeObj.text) categoriesMap.set(getCategoryLabel(typeObj.text), true);
                     if (typeObj.coding) {
                         typeObj.coding.forEach((code: any) => {
                             if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                             if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                         });
                     }
                });
           }
           if (!resource?.category && resource?.medication && resource.resourceType === 'MedicationAdministration') {
                 categoriesMap.set(getCategoryLabel('Medication'), true); 
            }
      };

      if (data.Observation) extractCategories(data.Observation);
      if (data.Condition) extractCategories(data.Condition);
      if (data.Procedure) extractCategories(data.Procedure);
      if (data.Encounter) extractCategories(data.Encounter);
      if (data.MedicationAdministration) extractCategories(data.MedicationAdministration);

    });
    const categories = Array.from(categoriesMap.keys()).sort();
    console.log('[getCategories] Calculated categories:', categories);
    return categories;
  }, [medicalRecords]);


  const fhirDataString = medicalRecords ? JSON.stringify(medicalRecords, null, 2) : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  const handleSelectResource = (resourceType: string) => {
    setSelectedResourceType(resourceType);
  };

  const handleSaveObservation = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/observations`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "Observation",
      status: "final",
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }], text: "Observación" }],
      code: { text: formData.codeText },
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      effectiveDateTime: formData.effectiveDateTime,
      valueQuantity: { value: parseFloat(formData.value), unit: formData.unit },
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    try { await set(newRef, dataToSave); handleCancelAddResource(); } catch (e) { console.error(e); }
  };

  const handleSaveCondition = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/conditions`);
    const newRef = push(dataRef);
    const dataToSave = {
        id: newRef.key,
        resourceType: "Condition",
        clinicalStatus: { coding: [{ code: formData.clinicalStatus }] },
        verificationStatus: { coding: [{ code: formData.verificationStatus }] },
        category: [{ text: "Condición Médica" }],
        code: { text: formData.codeText },
        subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
        onsetDateTime: formData.onsetDateTime,
        note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    try { await set(newRef, dataToSave); handleCancelAddResource(); } catch (e) { console.error(e); }
  };

  const handleSaveProcedure = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/procedures`);
    const newRef = push(dataRef);
    const dataToSave = {
        id: newRef.key,
        resourceType: "Procedure",
        status: formData.status,
        code: { text: formData.codeText },
        subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
        performedDateTime: formData.performedDateTime,
        note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    try { await set(newRef, dataToSave); handleCancelAddResource(); } catch (e) { console.error(e); }
  };

  const handleSaveEncounter = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/encounters`);
    const newRef = push(dataRef);
    const dataToSave = {
        id: newRef.key,
        resourceType: "Encounter",
        status: "finished",
        type: formData.type ? [{ text: formData.type }] : undefined,
        period: { start: formData.periodStart, end: formData.periodEnd || undefined },
        subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
        reason: formData.reason ? [{ text: formData.reason }] : undefined,
        note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    try { await set(newRef, dataToSave); handleCancelAddResource(); } catch (e) { console.error(e); }
  };

  // Handler to save a MedicationAdministration
  const handleSaveMedicationAdministration = async (formData: any) => {
      if (!patientId || !auth.currentUser) {
          console.error('Cannot save medication administration: patientId or authenticated user is not defined.');
          return;
      }
      const doctorUid = auth.currentUser.uid;
      const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/medicationAdministrations`);
      const newRef = push(dataRef);
      const dataToSave = {
          id: newRef.key,
          resourceType: "MedicationAdministration",
          status: "completed", // Default status
          medication: { text: formData.medicationName },
          subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
          effectiveDateTime: formData.effectiveDateTime,
          dosage: {
              dose: { value: parseFloat(formData.dosageValue), unit: formData.dosageUnit },
              route: { text: formData.route }
          },
          note: formData.noteText ? [{ text: formData.noteText }] : undefined
      };
      console.log('Saving MedicationAdministration:', dataToSave);
      try {
          await set(newRef, dataToSave);
          console.log('MedicationAdministration saved successfully to Firebase.');
          handleCancelAddResource();
      } catch (error) {
          console.error('Failed to save medication administration to Firebase:', error);
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
      <Header resetSearch={() => {}} patientId={patientId || null} />
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

        {/* Conditional Rendering for Add Resource Menu and Forms */}
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

        {showAddResourceMenu && selectedResourceType === 'Condition' && (
            <AddConditionForm
              onSave={handleSaveCondition}
              onCancel={() => setSelectedResourceType(null)}
            />
        )}

         {showAddResourceMenu && selectedResourceType === 'Procedure' && (
            <AddProcedureForm
              onSave={handleSaveProcedure}
              onCancel={() => setSelectedResourceType(null)}
            />
        )}

        {showAddResourceMenu && selectedResourceType === 'Encounter' && (
            <AddEncounterForm
              onSave={handleSaveEncounter}
              onCancel={() => setSelectedResourceType(null)}
            />
        )}

        {/* Render AddMedicationAdministrationForm when selectedResourceType is 'MedicationAdministration' */}
        {showAddResourceMenu && selectedResourceType === 'MedicationAdministration' && (
            <AddMedicationAdministrationForm
              onSave={handleSaveMedicationAdministration}
              onCancel={() => setSelectedResourceType(null)}
            />
        )}

      </div>
    </div>
  );
};

export default PatientDetailView;