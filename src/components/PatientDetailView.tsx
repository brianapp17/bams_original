// PatientDetailView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
// Import specific Firebase functions used for DB operations (push, set)
import { getDatabase, ref, onValue, off, push, set } from "firebase/database";
import { app } from '../firebase';
import type { Patient, ApiResponse, PatientInfo, ChatMessage } from '../types';
// Assuming searchMedicalRecords is no longer used based on previous changes
// import { searchMedicalRecords, getCategoryLabel } from '../api';
// Use getCategoryLabel from api
import { getCategoryLabel } from '../api';


// Components
import PatientSidebar from './PatientSidebar';
import ChatSidebar from './ChatSidebar';
import Header from './Header';
import SearchBar from './SearchBar';
import MedicalRecords from './MedicalRecords';
import AddResourceMenu from './AddResourceMenu'; // Import the AddResourceMenu
// Import all the form components
import AddObservationForm from './AddObservationForm';
import AddConditionForm from './AddConditionForm';
import AddEncounterForm from './AddEncounterForm';
import AddProcedureForm from './AddProcedureForm';
import AddMedicationAdministrationForm from './AddMedicationAdministrationForm';
import AddMedicationAdministrationDuplicateForm from './AddMedicationAdministrationDuplicateForm';
import AddAllergyIntoleranceForm from './AddAllergyIntoleranceForm';
import AddClinicalImpressionForm from './AddClinicalImpressionForm';
import AddImmunizationForm from './AddImmunizationForm';
import AddMedicationRequestForm from './AddMedicationRequestForm'; // Import the Medication Request form


// Import the types for form data
import type { ClinicalImpressionFormData } from './AddClinicalImpressionForm';
import type { ImmunizationFormData } from './AddImmunizationForm';
import type { MedicationRequestFormData } from './AddMedicationRequestForm'; // Import the Medication Request type
// Add types for other forms if you have them (Observation, Condition, etc.)
// import type { ObservationFormData } from './AddObservationForm';
// import type { ConditionFormData } from './AddConditionForm';
// import type { ProcedureFormData } from './AddProcedureForm';
// import type { EncounterFormData } from './AddEncounterForm';
// import type { MedicationAdministrationFormData } from './AddMedicationAdministrationForm'; // If different from the duplicated one
// import type { AllergyIntoleranceFormData } from './AddAllergyIntoleranceForm';


const PatientDetailView: React.FC = () => {
  const { patientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  // Removed useLocation as it's not currently used


  const [patient, setPatient] = useState<Patient | null>(null);
  // We will fetch records using Firebase listeners directly now
  const [medicalRecords, setMedicalRecords] = useState<ApiResponse | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  // isLoadingRecords will be managed by the new fetchMedicalRecordsFromFirebase
  const [isLoadingRecords, setIsLoadingRecords] = useState(true); // Set to true initially
  const [patientError, setPatientError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [showAddResourceMenu, setShowAddResourceMenu] = useState(false); // Use the correct state name from previous fix
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null); // Use the correct state name

  const auth = getAuth(app);
  const database = getDatabase(app);

   // Function to fetch medical records from Firebase (Using the version with multiple listeners)
  const fetchMedicalRecordsFromFirebase = useCallback((doctorUid: string, patientId: string) => {
    setIsLoadingRecords(true);
    setRecordsError(null); // Clear previous records errors

    const resourcePaths = [
      `doctors/${doctorUid}/patients/${patientId}/observations`,
      `doctors/${doctorUid}/patients/${patientId}/conditions`,
      `doctors/${doctorUid}/patients/${patientId}/procedures`,
      `doctors/${doctorUid}/patients/${patientId}/encounters`,
      `doctors/${doctorUid}/patients/${patientId}/medicationAdministrations`,
      `doctors/${doctorUid}/patients/${patientId}/medicationAdministrationsDuplicate`,
      `doctors/${doctorUid}/patients/${patientId}/allergyIntolerances`,
      `doctors/${doctorUid}/patients/${patientId}/clinicalImpressions`,
      `doctors/${doctorUid}/patients/${patientId}/immunizations`,
      `doctors/${doctorUid}/patients/${patientId}/medicationRequests`, // Add path for MedicationRequest
      // Add paths for other resource types if they exist in your DB structure
      // `doctors/${doctorUid}/patients/${patientId}/diagnosticReports`,
      // `doctors/${doctorUid}/patients/${patientId}/serviceRequests`,
      // `doctors/${doctorUid}/patients/${patientId}/medicationDispenses`,
    ];

    console.log(`[fetchMedicalRecordsFromFirebase] Setting up listeners for multiple paths`);

    const unsubscribeFunctions: (() => void)[] = [];
    const dataAggregator: { [key: string]: any[] } = {};
    // Initialize dataAggregator with empty arrays for all paths
    resourcePaths.forEach(path => dataAggregator[path] = []);

    const updateAndSetMedicalRecords = () => {
        const combinedRecords: any[] = [];
        Object.values(dataAggregator).forEach(recordsForPath => {
            combinedRecords.push(...recordsForPath);
        });
        console.log('[fetchMedicalRecordsFromFirebase] All data (re-)aggregated, final formatted records:', { results: combinedRecords });
        setMedicalRecords({ results: combinedRecords });
        // Set loading false only after *some* data has been received for the first time, or after a timeout.
        // For simplicity here, we set it false after any update, which implies we received *something* for at least one path.
         setIsLoadingRecords(false); // Set loading false after aggregation
    };


    // Using loadedCount to ensure we only set isLoadingRecords(false) after all initial listeners have fired
    // Removed the previous loadedCount logic as the `updateAndSetMedicalRecords` call pattern handles it fine.
    // The key is that `setIsLoadingRecords(true)` is called *before* the listeners are attached.

    resourcePaths.forEach((path) => {
      const resourceType = path.includes('observations') ? 'Observation' :
                           path.includes('conditions') ? 'Condition' :
                           path.includes('procedures') ? 'Procedure' :
                           path.includes('encounters') ? 'Encounter' :
                           path.includes('medicationAdministrationsDuplicate') ? 'MedicationAdministrationDuplicate' :
                           path.includes('medicationAdministrations') ? 'MedicationAdministration' :
                           path.includes('allergyIntolerances') ? 'AllergyIntolerance' :
                           path.includes('clinicalImpressions') ? 'ClinicalImpression' :
                           path.includes('immunizations') ? 'Immunization' :
                           path.includes('medicationRequests') ? 'MedicationRequest' : // Add mapping for MedicationRequest
                           // Add mappings for other resource types here
                           // path.includes('diagnosticReports') ? 'DiagnosticReport' :
                           // path.includes('serviceRequests') ? 'ServiceRequest' :
                           // path.includes('medicationDispenses') ? 'MedicationDispense' :
                           'Unknown';

      const dataRef = ref(database, path);
      // Explicitly type the error parameter in the listener
      const listener = onValue(dataRef, (snapshot) => {
        const recordsForThisPath: any[] = [];
        const data = snapshot.val();
        console.log(`[fetchMedicalRecordsFromFirebase] Live update for ${resourceType}:`, data);
        if (data) {
          Object.keys(data).forEach(key => {
            const record = data[key];
            // Basic check for object structure
            if (record && typeof record === 'object') {
              const structData: { [key: string]: any } = {};
              // Store the actual resource type name (e.g., "Observation") under the structData key
              structData[resourceType] = record;
              recordsForThisPath.push({
                document: { structData: structData },
              });
            }
          });
        }
        dataAggregator[path] = recordsForThisPath;

        // Always update records on any change
        updateAndSetMedicalRecords();

      }, (dbError: unknown) => { // --- Type error parameter as unknown ---
        console.error(`Error fetching ${resourceType} data from Firebase:`, dbError);
        // --- Assert error as Error before accessing message ---
        const errorMessage = (dbError instanceof Error) ? dbError.message : String(dbError);
        // Append the error message to the existing error state or set a new one
         setRecordsError(prevError =>
             prevError ? `${prevError}\nError al cargar datos de ${resourceType.toLowerCase()}: ${errorMessage}`
                       : `Error al cargar datos de ${resourceType.toLowerCase()}: ${errorMessage}`
         );
        // --- End assertion ---

        dataAggregator[path] = []; // Clear data for this path on error
         // Still try to update the records display with whatever data was loaded successfully
        updateAndSetMedicalRecords();
      });
      unsubscribeFunctions.push(() => off(dataRef, 'value', listener));
    });

     // Optional: A timeout to set isLoadingRecords(false) even if some listeners never fire
     // This prevents infinite loading if a path is missing or has a persistent error
    // const loadingTimeout = setTimeout(() => {
    //     console.log('[fetchMedicalRecordsFromFirebase] Loading timeout reached.');
    //     setIsLoadingRecords(false);
    // }, 15000); // 15 seconds timeout

    // Return a cleanup function that unsubscribes from all listeners and clears timeout
    return () => {
      console.log('[fetchMedicalRecordsFromFirebase] Cleaning up all medical record listeners.');
      unsubscribeFunctions.forEach(unsub => unsub());
      // clearTimeout(loadingTimeout); // Clear timeout on cleanup
    };

  }, [database, getCategoryLabel]); // Depend on database instance and getCategoryLabel


  // Effect to fetch patient data and set up medical records listeners
  useEffect(() => {
    if (!patientId) {
      setPatientError('No se especificó un ID de paciente.');
      setIsLoadingPatient(false);
      setIsLoadingRecords(false); // Ensure loading is false if no patientId
      return;
    }

    let unsubscribePatient: () => void = () => {};
    let unsubscribeRecordsCleanup: () => void = () => {}; // To store the cleanup function from fetchMedicalRecordsFromFirebase

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        console.log('[useEffect] Authenticated Doctor UID:', doctorUid);

        console.log('[useEffect] Fetching data for Patient ID:', patientId);
        const patientRef = ref(database, `doctors/${doctorUid}/patients/${patientId}`);

        setIsLoadingPatient(true);
        setPatientError(null);

        // Explicitly type the error parameter in the listener
        unsubscribePatient = onValue(patientRef, (snapshot) => {
          const patientData = snapshot.val() as Patient;
          console.log('[useEffect] Patient data from Firebase:', patientData);

          if (patientData) {
            setPatient(patientData);
            // Ensure patientInfo is updated correctly with fetched data
            setPatientInfo({
                 name: `${patientData.name?.[0]?.given?.join(' ') || ''} ${patientData.name?.[0]?.family || ''}`,
                 id: patientData.id,
                 birthDate: patientData.birthDate,
                 gender: patientData.gender,
                 identifier: patientData.identifier?.[0]?.value || patientData.dui, // Use dui as fallback
             });

            // Clean up previous records listeners before setting up new ones
            if (unsubscribeRecordsCleanup) unsubscribeRecordsCleanup();
            // Set up new listeners for medical records
            unsubscribeRecordsCleanup = fetchMedicalRecordsFromFirebase(doctorUid, patientId);


          } else {
            console.log('[useEffect] Patient not found in database.');
            setPatient(null);
            setPatientInfo(null); // Clear patient info if patient not found
            setMedicalRecords(null); // Clear records if patient not found
            setPatientError('Paciente no encontrado en la base de datos.');
             setIsLoadingRecords(false); // Stop records loading if patient not found
          }
          setIsLoadingPatient(false); // Patient loading is complete whether found or not
        }, (error: unknown) => { // --- Type error parameter as unknown ---
          console.error("Error fetching patient data from DB:", error);
           // --- Assert error as Error before accessing message ---
           const errorMessage = (error instanceof Error) ? error.message : String(error);
          setPatientError('Error al cargar datos del paciente desde la base de datos: ' + errorMessage);
          // --- End assertion ---
          setIsLoadingPatient(false);
          setIsLoadingRecords(false); // Stop records loading on patient data error
        });

      } else {
        console.log('[useEffect] User not authenticated, redirecting to login.');
        // Redirect if not authenticated
        navigate('/login');
      }
    });

    // Cleanup function for the overall effect
    return () => {
      unsubscribeAuth(); // Clean up auth listener
      unsubscribePatient(); // Clean up patient listener
      if (unsubscribeRecordsCleanup) unsubscribeRecordsCleanup(); // Clean up records listeners
      console.log('[useEffect] Cleaning up Firebase listeners.');
    };
  }, [auth, database, navigate, patientId, fetchMedicalRecordsFromFirebase]); // Added fetchMedicalRecordsFromFirebase to deps


  // getCategories function from previous step - ensure it's included here
   const getCategories = useCallback(() => {
    console.log('[getCategories] Recalculating categories with medicalRecords data:', medicalRecords);
    if (!medicalRecords?.results) return [];
    const categoriesMap = new Map<string, boolean>();
    medicalRecords.results.forEach(record => {
      const data = record.document.structData;
      // Helper function to extract and map categories from a resource
      const extractCategories = (resource: any, resourceTypeKey: string) => {
          // Check for standard 'category' field which is an array
          if (resource?.category) {
              resource.category.forEach((cat: any) => {
                  // Prioritize 'text', then coding.display, then coding.code
                  if (cat.text) categoriesMap.set(getCategoryLabel(cat.text), true);
                  if (cat.coding) {
                      cat.coding.forEach((code: any) => {
                          if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                          else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                      });
                  }
              });
          } else { // Handle resources that don't use the 'category' field standardly
               // Map resource types that don't have a standard 'category' but should appear under one
               if (resourceTypeKey === 'Procedure') { // Procedures often have no category field
                   categoriesMap.set(getCategoryLabel('Procedure'), true); // Maps to 'Procedimientos'
               } else if (resourceTypeKey === 'Encounter' && (resource?.type || resource?.class)) { // Encounters often use 'type' or 'class' for categorization
                   // Check type array for text/coding
                    if(resource.type) {
                        resource.type.forEach((typeObj: any) => {
                            if (typeObj.text) categoriesMap.set(getCategoryLabel(typeObj.text), true);
                             if (typeObj.coding) {
                                 typeObj.coding.forEach((code: any) => {
                                     if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                                     else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                                 });
                             }
                        });
                    }
                    // Check class coding
                    if(resource.class?.coding) {
                         resource.class.coding.forEach((code: any) => {
                             if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                             else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                         });
                    }
                    // Also add a generic 'Encuentro' category if the resource exists
                     categoriesMap.set(getCategoryLabel('Encounter'), true); // Maps to 'Consultas'

               } else if ((resourceTypeKey === 'MedicationAdministration' || resourceTypeKey === 'MedicationAdministrationDuplicate') && resource?.medication) {
                     // Medication Administrations often categorized under 'Medication'
                     // Check medication CodeableConcept/Reference for text/display
                     if (resource.medication?.text) categoriesMap.set(getCategoryLabel(resource.medication.text), true);
                      if (resource.medication?.coding) {
                           resource.medication.coding.forEach((code: any) => {
                               if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                               else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                           });
                       }
                     // Also add a generic 'Medication' category if the resource exists
                     categoriesMap.set(getCategoryLabel('Medication'), true); // Maps to 'Medicamentos'

                } else if (resourceTypeKey === 'AllergyIntolerance' && resource?.code) {
                   // AllergyIntolerances often categorized under 'Allergy' or by the substance
                   // Check substance CodeableConcept for text/display
                   if (resource.code.text) categoriesMap.set(getCategoryLabel(resource.code.text), true);
                    if (resource.code.coding) {
                         resource.code.coding.forEach((code: any) => {
                             if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                             else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                         });
                     }
                    // Also add a generic 'Allergy' category if the resource exists
                    categoriesMap.set(getCategoryLabel('Allergy'), true); // Maps to 'Alergias'

                } else if (resourceTypeKey === 'Immunization' && resource?.vaccineCode) {
                   // Immunizations often categorized under 'Immunization' or by the vaccine
                   // Check vaccine CodeableConcept for text/display
                   if (resource.vaccineCode.text) categoriesMap.set(getCategoryLabel(resource.vaccineCode.text), true);
                    if (resource.vaccineCode.coding) {
                         resource.vaccineCode.coding.forEach((code: any) => {
                             if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                             else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                         });
                     }
                    // Also add a generic 'Immunization' category if the resource exists
                    categoriesMap.set(getCategoryLabel('Immunization'), true); // Maps to 'Inmunizaciones'

               } else if (resourceTypeKey === 'ClinicalImpression') {
                   // Clinical Impressions often categorized as 'Clinical Note' or similar
                   categoriesMap.set(getCategoryLabel('ClinicalImpression'), true); // Use type name, maps to 'Impresión Clínica'
               }
                // --- AÑADIR MAPEO PARA MedicationRequest ---
                 else if (resourceTypeKey === 'MedicationRequest' && resource?.medicationCodeableConcept) {
                     // Medication Requests often categorized under 'Medication' or 'Prescripción Médica'
                      // Check medication CodeableConcept for text/display
                     if (resource.medicationCodeableConcept.text) categoriesMap.set(getCategoryLabel(resource.medicationCodeableConcept.text), true);
                      if (resource.medicationCodeableConcept.coding) {
                           resource.medicationCodeableConcept.coding.forEach((code: any) => {
                               if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                               else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                           });
                       }
                     // Also add a generic 'MedicationRequest' category if the resource exists
                     categoriesMap.set(getCategoryLabel('MedicationRequest'), true); // Maps to 'Prescripción Médica'
                 }
               // --- FIN AÑADIR MAPEO ---
               // Add other resources like DiagnosticReport, ServiceRequest, MedicationDispense if they don't have 'category' field
                else if (resourceTypeKey === 'DiagnosticReport' && resource?.code) {
                     if (resource.code.text) categoriesMap.set(getCategoryLabel(resource.code.text), true);
                     if (resource.code.coding) {
                          resource.code.coding.forEach((code: any) => {
                              if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                              else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                          });
                      }
                     categoriesMap.set(getCategoryLabel('DiagnosticReport'), true); // Maps to 'Reportes Diagnósticos'
                } else if (resourceTypeKey === 'ServiceRequest' && resource?.code) {
                     if (resource.code.text) categoriesMap.set(getCategoryLabel(resource.code.text), true);
                     if (resource.code.coding) {
                          resource.code.coding.forEach((code: any) => {
                              if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                              else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                          });
                      }
                     categoriesMap.set(getCategoryLabel('ServiceRequest'), true); // Maps to 'Solicitud de Servicio' (or similar)
                } else if (resourceTypeKey === 'MedicationDispense' && resource?.medication) {
                      if (resource.medication.text) categoriesMap.set(getCategoryLabel(resource.medication.text), true);
                       if (resource.medication.coding) {
                            resource.medication.coding.forEach((code: any) => {
                                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
                            });
                        }
                     categoriesMap.set(getCategoryLabel('MedicationDispense'), true); // Maps to 'Entrega de Medicamento' (or similar)
                 }
           }
      };

      // Call extractCategories for each potential resource type
      if (data.Observation) extractCategories(data.Observation, 'Observation');
      if (data.Condition) extractCategories(data.Condition, 'Condition');
      if (data.Procedure) extractCategories(data.Procedure, 'Procedure');
      if (data.Encounter) extractCategories(data.Encounter, 'Encounter');
      if (data.MedicationAdministration) extractCategories(data.MedicationAdministration, 'MedicationAdministration');
      if (data.MedicationAdministrationDuplicate) extractCategories(data.MedicationAdministrationDuplicate, 'MedicationAdministrationDuplicate');
      if (data.AllergyIntolerance) extractCategories(data.AllergyIntolerance, 'AllergyIntolerance');
      if (data.ClinicalImpression) extractCategories(data.ClinicalImpression, 'ClinicalImpression');
      if (data.Immunization) extractCategories(data.Immunization, 'Immunization');
      if (data.MedicationRequest) extractCategories(data.MedicationRequest, 'MedicationRequest'); // Call for MedicationRequest
      if (data.DiagnosticReport) extractCategories(data.DiagnosticReport, 'DiagnosticReport');
      if (data.ServiceRequest) extractCategories(data.ServiceRequest, 'ServiceRequest');
      if (data.MedicationDispense) extractCategories(data.MedicationDispense, 'MedicationDispense');
        // Add other resource types here if they exist in your data structure
        // Example: if(data.ProcedureRequest) extractCategories(data.ProcedureRequest, 'ProcedureRequest');


    });

    // Convert map keys to array and sort
    let categories = Array.from(categoriesMap.keys()).sort();

    // --- Consolidate common categories and add fallbacks ---
    // Ensure common FHIR resource types mapped to specific labels are included if data exists
    const checkAndAddCategory = (resourceKey: keyof ApiResponse['results'][number]['document']['structData'], labelKey: string) => {
         const hasResource = medicalRecords?.results.some(record => record.document.structData[resourceKey]);
         const categoryLabel = getCategoryLabel(labelKey);
         if (hasResource && !categories.includes(categoryLabel)) {
             categories.push(categoryLabel);
         }
    };

    checkAndAddCategory('Observation', 'Observation'); // Or 'Observaciones' if you map that
    checkAndAddCategory('Condition', 'Condition'); // Or 'Condiciones Médicas'
    checkAndAddCategory('Procedure', 'Procedure'); // Or 'Procedimientos'
    checkAndAddCategory('Encounter', 'Encounter'); // Or 'Consultas'
    checkAndAddCategory('MedicationAdministration', 'Medication'); // Or 'Medicamentos'
    checkAndAddCategory('MedicationAdministrationDuplicate', 'Medication'); // Or 'Medicamentos'
    checkAndAddCategory('MedicationRequest', 'MedicationRequest'); // Or 'Prescripción Médica'
    checkAndAddCategory('AllergyIntolerance', 'Allergy'); // Or 'Alergias'
    checkAndAddCategory('Immunization', 'Immunization'); // Or 'Inmunizaciones'
    checkAndAddCategory('ClinicalImpression', 'ClinicalImpression'); // Or 'Impresión Clínica'
     // Add checks for other resource types
    checkAndAddCategory('DiagnosticReport', 'DiagnosticReport'); // Or 'Reportes Diagnósticos'
    checkAndAddCategory('ServiceRequest', 'ServiceRequest'); // Or 'Solicitud de Servicio'
    checkAndAddCategory('MedicationDispense', 'MedicationDispense'); // Or 'Entrega de Medicamento'


    categories.sort(); // Re-sort after potential additions

    console.log('[getCategories] Final categories:', categories);
    return categories;
  }, [medicalRecords, getCategoryLabel]); // Added getCategoryLabel to deps


  const fhirDataString = medicalRecords ? JSON.stringify(medicalRecords, null, 2) : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  const handleAddResourceClick = () => {
    console.log('handleAddResourceClick: Setting showAddResourceMenu to true');
    setShowAddResourceMenu(true);
    setSelectedResourceType(null); // Ensure no form is selected when opening the menu
    // NOTE: You will need to ensure "Inmunización" is added as an option in your AddResourceMenu component.
  };

  const handleSelectResource = (resourceType: string) => {
    console.log(`handleSelectResource: Resource type selected: ${resourceType}`);
    setSelectedResourceType(resourceType);
    setShowAddResourceMenu(false); // Close the menu after selection
    console.log(`handleSelectResource: showAddResourceMenu set to false, selectedResourceType set to ${resourceType}`);
  };

  const handleCancelAddResource = () => {
    console.log('handleCancelAddResource: Closing form and menu');
    setSelectedResourceType(null);
    setShowAddResourceMenu(false);
  };

  // --- Save handlers for each form type (Corrected to use async and Error assertion) ---

  const handleSaveObservation = async (formData: any /* Use specific type if defined: ObservationFormData */) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Observation: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/observations`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "Observation",
      status: formData.status || "final", // Assuming default status for observation
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }], text: "Observación" }], // Default category
      code: formData.codeText ? { text: formData.codeText } : undefined, // Assuming code is simple text for now
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      effectiveDateTime: formData.effectiveDateTime,
      // Assume value is quantity unless other fields added to form
      valueQuantity: (formData.value !== undefined && formData.unit !== undefined) ? { value: parseFloat(formData.value), unit: formData.unit } : undefined,
      // Add support for other value types if your form captures them (valueString, valueBoolean, etc.)
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving Observation:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Observation saved successfully.'); handleCancelAddResource(); } catch (e: unknown) { // --- Type error as unknown ---
      console.error('Failed to save Observation:', e);
      // --- Assert error as Error ---
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar la Observación: ${errorMessage}`);
      // --- End assertion ---
    }
  };

  const handleSaveCondition = async (formData: any /* Use specific type if defined: ConditionFormData */) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Condition: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/conditions`);
    const newRef = push(dataRef);
    const dataToSave = {
        id: newRef.key,
        resourceType: "Condition",
        clinicalStatus: formData.clinicalStatus ? { coding: [{ code: formData.clinicalStatus }] } : undefined,
        verificationStatus: formData.verificationStatus ? { coding: [{ code: formData.verificationStatus }] } : undefined,
        category: [{ text: "Condición Médica" }], // Default category
        code: formData.codeText ? { text: formData.codeText } : undefined, // Assuming code is simple text for now
        subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
        onsetDateTime: formData.onsetDateTime,
        // Add severity if your form includes it
        // severity: formData.severityCode ? { coding: [{ code: formData.severityCode }] } : undefined,
        note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving Condition:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Condition saved successfully.'); handleCancelAddResource(); } catch (e: unknown) { // --- Type error as unknown ---
      console.error('Failed to save Condition:', e);
       const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar la Condición: ${errorMessage}`);
    }
  };

  const handleSaveProcedure = async (formData: any /* Use specific type if defined: ProcedureFormData */) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Procedure: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/procedures`);
    const newRef = push(dataRef);
    const dataToSave = {
        id: newRef.key,
        resourceType: "Procedure",
        status: formData.status,
        code: formData.codeText ? { text: formData.codeText } : undefined, // Assuming code is simple text for now
        subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
        performedDateTime: formData.performedDateTime, // Assuming performedDateTime for date
        note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
     console.log('Saving Procedure:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Procedure saved successfully.'); handleCancelAddResource(); } catch (e: unknown) { // --- Type error as unknown ---
      console.error('Failed to save Procedure:', e);
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar el Procedimiento: ${errorMessage}`);
    }
  };

  const handleSaveEncounter = async (formData: any /* Use specific type if defined: EncounterFormData */) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Encounter: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/encounters`);
    const newRef = push(dataRef);
    const dataToSave = {
        id: newRef.key,
        resourceType: "Encounter",
        status: formData.status || "finished", // Default status, or make it selectable in form
        type: formData.type ? [{ text: formData.type }] : undefined, // Assuming type is text, could be CodeableConcept
        period: (formData.periodStart || formData.periodEnd) ? { start: formData.periodStart || undefined, end: formData.periodEnd || undefined } : undefined, // Assuming periodStart/end from form
        subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
        reason: formData.reason ? [{ text: formData.reason }] : undefined, // Assuming reason is text, could be CodeableConcept
        note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
     console.log('Saving Encounter:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Encounter saved successfully.'); handleCancelAddResource(); } catch (e: unknown) { // --- Type error as unknown ---
      console.error('Failed to save Encounter:', e);
       const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar el Encuentro: ${errorMessage}`);
    }
  };

  const handleSaveMedicationAdministration = async (formData: any /* Use specific type if defined: MedicationAdministrationFormData */) => {
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
          status: formData.status || "completed", // Default status, or make selectable
          medication: formData.medicationName ? { text: formData.medicationName } : undefined, // Assuming medication is text, could be CodeableConcept/Reference
          subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
          effectiveDateTime: formData.effectiveDateTime, // Assuming date/time from form
          dosage: (formData.dosageValue !== undefined || formData.dosageUnit !== undefined || formData.route !== undefined) ? {
              dose: (formData.dosageValue !== undefined && formData.dosageUnit !== undefined) ? { value: parseFloat(formData.dosageValue), unit: formData.dosageUnit } : undefined,
              route: formData.route ? { text: formData.route } : undefined // Assuming route is text, could be CodeableConcept
          } : undefined,
          note: formData.noteText ? [{ text: formData.noteText }] : undefined
      };
      console.log('Saving MedicationAdministration:', dataToSave);
      try {
          await set(newRef, dataToSave);
          console.log('MedicationAdministration saved successfully to Firebase.');
          handleCancelAddResource();
      } catch (error: unknown) { // --- Type error as unknown ---
          console.error('Failed to save medication administration to Firebase:', error);
           // --- Assert error as Error ---
           const errorMessage = (error instanceof Error) ? error.message : String(error);
           alert(`Error al guardar la Administración de Medicamento: ${errorMessage}`);
          // --- End assertion ---
      }
  };

   // Placeholder Save handler for the duplicated form (Assuming this is intentional)
   const handleSaveMedicationAdministrationDuplicate = async (formData: any) => {
       if (!patientId || !auth.currentUser) {
          console.error('Cannot save duplicated medication administration: patientId or authenticated user is not defined.');
          return;
      }
      const doctorUid = auth.currentUser.uid;
      const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/medicationAdministrationsDuplicate`);
      const newRef = push(dataRef);
        const dataToSave = {
          id: newRef.key,
          resourceType: "MedicationAdministrationDuplicate", // Use the new resource type
          status: formData.status || "completed", // Default status
          medication: formData.medicationName ? { text: formData.medicationName } : undefined,
          subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
          effectiveDateTime: formData.effectiveDateTime,
          dosage: (formData.dosageValue !== undefined || formData.dosageUnit !== undefined || formData.route !== undefined) ? {
              dose: (formData.dosageValue !== undefined && formData.dosageUnit !== undefined) ? { value: parseFloat(formData.dosageValue), unit: formData.dosageUnit } : undefined,
              route: formData.route ? { text: formData.route } : undefined
          } : undefined,
          note: formData.noteText ? [{ text: formData.noteText }] : undefined
      };
    console.log('Saving Duplicated Medication Administration data:', dataToSave);
    try {
        await set(newRef, dataToSave);
        console.log('Duplicated Medication Administration saved successfully to Firebase.');
        handleCancelAddResource(); // Close form after saving
    } catch (error: unknown) { // --- Type error as unknown ---
        console.error('Failed to save duplicated medication administration to Firebase:', error);
        // --- Assert error as Error ---
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        alert(`Error al guardar la Administración de Medicamento (Duplicado): ${errorMessage}`);
        // --- End assertion ---
    }
  };

  const handleSaveAllergyIntolerance = async (formData: any /* Use specific type if defined: AllergyIntoleranceFormData */) => {
    if (!patientId || !auth.currentUser) {
      console.error('Cannot save allergy/intolerance: patientId or authenticated user is not defined.');
      return;
    }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/allergyIntolerances`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "AllergyIntolerance",
      clinicalStatus: formData.clinicalStatus ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: formData.clinicalStatus }] } : undefined,
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "confirmed" }] }, // Assuming confirmed
      type: "allergy", // Assuming type is allergy
      // category: ["medication"], // Example category, make configurable if needed
      code: formData.substance ? { // Map the substance string to a CodeableConcept with display
          coding: [
              {
                 // system: "http://snomed.info/sct", // Add system/code if using terminology
                 display: formData.substance
              }
          ]
      } : undefined, // Require substance
      patient: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      recordedDate: formData.recordedDate || new Date().toISOString(), // Use form date or current date
      // Add reaction, onset, etc. if your form captures them
      // reaction: formData.reactionText ? [{ description: formData.reactionText }] : undefined,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving AllergyIntolerance:', dataToSave);
    try {
      await set(newRef, dataToSave);
      console.log('Allergy/Intolerance saved successfully to Firebase.');
      handleCancelAddResource();
    } catch (error: unknown) { // --- Type error as unknown ---
      console.error('Failed to save allergy/intolerance to Firebase:', error);
       // --- Assert error as Error ---
       const errorMessage = (error instanceof Error) ? error.message : String(error);
       alert(`Error al guardar la Alergia/Intolerancia: ${errorMessage}`);
       // --- End assertion ---
    }
  };

  const handleSaveClinicalImpression = async (formData: ClinicalImpressionFormData) => {
    if (!patientId || !auth.currentUser) {
      console.error('Cannot save clinical impression: patientId or authenticated user is not defined.');
      return;
    }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/clinicalImpressions`);
    const newRef = push(dataRef);

    const dataToSave = {
      id: newRef.key,
      resourceType: "ClinicalImpression",
      date: formData.date || new Date().toISOString(), // Use form date or current date
      description: formData.description || "", // Use "" if empty
      status: formData.status,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
       // Add summary, problem, etc. if your form captures them
       // summary: formData.summaryText || undefined,
       // problem: formData.problemReference ? [{ reference: formData.problemReference }] : undefined,
       note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };

    console.log('Saving ClinicalImpression:', dataToSave);
    try {
      await set(newRef, dataToSave);
      console.log('Clinical Impression saved successfully to Firebase.');
      handleCancelAddResource();
    } catch (error: unknown) { // --- Type error as unknown ---
      console.error('Failed to save clinical impression to Firebase:', error);
       const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Error al guardar la Impresión Clínica: ${errorMessage}`);
    }
  };

  const handleSaveImmunization = async (formData: ImmunizationFormData) => {
      if (!patientId || !auth.currentUser) {
          console.error('Cannot save immunization: patientId or authenticated user is not defined.');
          return;
      }
      const doctorUid = auth.currentUser.uid;
      const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/immunizations`);
      const newRef = push(dataRef);
      const dataToSave = {
          id: newRef.key,
          resourceType: "Immunization",
          status: formData.status,
          vaccineCode: formData.vaccineCode ? { // Map vaccineCode string to CodeableConcept
              coding: [
                  {
                      display: formData.vaccineCode // Use display for the name from form
                  }
              ]
               // text: formData.vaccineCode // Alternative using text
          } : undefined, // Require vaccineCode
          patient: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
          occurrenceDateTime: formData.occurrenceDateTime, // Assuming date from form
          // Add lotNumber, expirationDate, manufacturer, note etc. if your form captures them
          // lotNumber: formData.lotNumber || undefined,
          // expirationDate: formData.expirationDate || undefined,
          // manufacturer: formData.manufacturerName ? { display: formData.manufacturerName } : undefined,
          note: formData.noteText ? [{ text: formData.noteText }] : undefined
      };

      console.log('Saving Immunization:', dataToSave);
      try {
          await set(newRef, dataToSave);
          console.log('Immunization saved successfully to Firebase.');
          handleCancelAddResource();
      } catch (error: unknown) { // --- Type error as unknown ---
          console.error('Failed to save immunization to Firebase:', error);
          const errorMessage = (error instanceof Error) ? error.message : String(error);
          alert(`Error al guardar la Inmunización: ${errorMessage}`);
      }
  };


  // --- Función para guardar MedicationRequest (Uses the correct formData type) ---
  const handleSaveMedicationRequest = async (formData: MedicationRequestFormData) => {
      if (!patientId || !auth.currentUser) {
          console.error('Cannot save medication request: patientId or authenticated user is not defined.');
          return;
      }
      const doctorUid = auth.currentUser.uid;
      const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/medicationRequests`);
      const newRef = push(dataRef);

      // Construct the FHIR-like structure from form data
      const dataToSave = {
          id: newRef.key, // Use the Firebase push key as the resource ID
          resourceType: "MedicationRequest",
          status: formData.status, // From form
          intent: formData.intent, // From form
          medicationCodeableConcept: formData.medicationName ? { // Map medication name to CodeableConcept
              coding: [
                  {
                     // system: "http://www.whocc.no/atc", // Add system/code if using terminology (e.g., ATC codes)
                     display: formData.medicationName // From form
                  }
              ]
               // text: formData.medicationName // Alternative using text
          } : undefined, // Require medication name
          subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, // Link to patient
          authoredOn: formData.authoredOn, // Date from form
          dosageInstruction: formData.dosageInstructionText ? [ // Dosage is an array in FHIR, at least one item usually
              {
                  text: formData.dosageInstructionText, // From form
                  route: formData.routeText ? { // Map route text to CodeableConcept if available
                      coding: [
                          {
                              // system: "http://snomed.info/sct", // Add system/code if using terminology (e.g., SNOMED)
                              display: formData.routeText // From form
                          }
                      ]
                       // text: formData.routeText // Alternative using text
                  } : undefined, // Omit route if text is empty
                  // Add timing details here if needed (not in current form, but common in FHIR)
                  // timing: { ... }
              }
          ] : undefined, // Omit dosageInstruction if text is empty
          note: formData.noteText ? [{ text: formData.noteText }] : undefined // Include optional note
      };

      console.log('Saving MedicationRequest:', dataToSave);
      try {
          await set(newRef, dataToSave);
          console.log('Medication Request saved successfully to Firebase.');
          handleCancelAddResource(); // Close form after saving
      } catch (error: unknown) { // --- Type error as unknown ---
          console.error('Failed to save medication request to Firebase:', error);
          // --- Assert error as Error ---
          const errorMessage = (error instanceof Error) ? error.message : String(error);
          alert(`Error al guardar la Solicitud de Medicamento: ${errorMessage}`); // Show error to user
          // --- End assertion ---
      }
  };
  // --- FIN FUNCIÓN ---


  // Log state values that control rendering
  console.log(`Rendering PatientDetailView: showAddResourceMenu=${showAddResourceMenu}, selectedResourceType=${selectedResourceType}`);


  if (patientId && isLoadingPatient) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando expediente...</p></div>;
  }

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

  // Render patient details and records only if patient data is loaded and no patient error
  if (patient && patientId && !isLoadingPatient && !patientError) {
    return (
      // Using min-h-screen and flex-col to ensure layout fills screen height
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header is fixed/at the top */}
        <Header resetSearch={() => {}} patientId={patientId || null} /> {/* Assuming Header exists */}

        {/* Main content area - allows horizontal flex and vertical overflow */}
        <div className="flex flex-1 p-4 gap-4 h-0 overflow-hidden">
          {/* Patient Sidebar */}
          <div className="w-72 xl:w-80 flex-shrink-0 h-full overflow-y-auto"> {/* Added overflow */}
            <PatientSidebar
              patientInfo={patientInfo}
              categories={getCategories()}
              // Check if selectedCategory is in the map before getting label
              selectedCategory={selectedCategory ? getCategoryLabel(selectedCategory) : null}
              setSelectedCategory={setSelectedCategory}
              fhirData={fhirDataString}
            />
          </div>

          {/* Main Content Area (SearchBar + Records) */}
          <div className="flex-1 overflow-y-auto min-h-0 p-2"> {/* Main scrollable area */}
             <div className="mb-4 flex space-x-4">
               <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Volver a Expedientes
                </Link>
               {/* Add Resource Button */}
              <button
                onClick={handleAddResourceClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Agregar Recurso
              </button>
             </div>

            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md mb-6"> {/* Adjusted max-width */}
              <h1 className="text-2xl font-bold text-teal-800 mb-4">Expediente de Paciente</h1>
              <div className="border-b pb-4 mb-4">
                {/* Safely access patient info */}
                <p className="text-lg font-semibold text-gray-800 mb-2">👤 Nombre: {`${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}</p>
                <p className="text-gray-600 mb-1">🪪 DUI: {patient.dui || 'N/A'}</p>
                <p className="text-gray-600 mb-1">🚻 Género: {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || 'N/A'}</p>
                <p className="text-gray-600">🎂 Fecha de nacimiento: {patient.birthDate || 'N/A'}</p>
              </div>
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearchSubmit} // Use handleSearchSubmit
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

          {/* ChatSidebar */}
          <div className="w-96 flex-shrink-0 h-full border-l border-gray-200 overflow-y-auto"> {/* Added border and overflow */}
               <ChatSidebar
                 chatMessages={chatMessages}
                 setChatMessages={setChatMessages}
                 isChatLoading={isChatLoading}
                 setIsChatLoading={setIsChatLoading}
                 resultsData={fhirDataString}
                 selectedPatientId={patientId || null}
               />
           </div>
        </div>


        {/* Render the Add Resource Menu */}
        {/* Menu shows when showAddResourceMenu is true AND no specific form is selected */}
        {showAddResourceMenu && selectedResourceType === null && (
          <AddResourceMenu
            onSelectResource={handleSelectResource} // This sets selectedResourceType
            onCancel={handleCancelAddResource} // This just hides the menu and clears selectedResourceType
             // NOTE: Ensure AddResourceMenu includes 'MedicationRequest' option with type 'MedicationRequest'
          />
        )}

        {/* Render the selected resource form */}
        {/* These now correctly check selectedResourceType state */}
        {selectedResourceType === 'Observation' && <AddObservationForm onSave={handleSaveObservation} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Condition' && <AddConditionForm onSave={handleSaveCondition} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Encounter' && <AddEncounterForm onSave={handleSaveEncounter} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Procedure' && <AddProcedureForm onSave={handleSaveProcedure} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'MedicationAdministration' && <AddMedicationAdministrationForm onSave={handleSaveMedicationAdministration} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'MedicationAdministrationDuplicate' && <AddMedicationAdministrationDuplicateForm onSave={handleSaveMedicationAdministrationDuplicate} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'AllergyIntolerance' && <AddAllergyIntoleranceForm onSave={handleSaveAllergyIntolerance} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'ClinicalImpression' && <AddClinicalImpressionForm onSave={handleSaveClinicalImpression} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Immunization' && <AddImmunizationForm onSave={handleSaveImmunization} onCancel={handleCancelAddResource} />}

        {/* --- Conditional rendering for MedicationRequest --- */}
        {selectedResourceType === 'MedicationRequest' && ( // This condition now matches the state set by handleSelectResource
           <AddMedicationRequestForm
             onSave={handleSaveMedicationRequest} // Use the correct prop name expected by the form
             onCancel={handleCancelAddResource}
           />
        )}
        {/* --- End rendering for MedicationRequest --- */}

      </div>
    );
  }

  // Fallback return for cases where patientId exists but data is not loaded or has error
  // Or if patientId is null (handled above but keeping this as a final safety)
  return null; // Or render a loading/error state if not covered above
};

export default PatientDetailView;