// PatientDetailView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
// Import specific Firebase functions used for DB operations (push, set)
import { getDatabase, ref, onValue, off, push, set } from "firebase/database";
import { app } from '../firebase';
import type { Patient, ApiResponse, PatientInfo, ChatMessage } from '../types';
// Use getCategoryLabel from api
import { getCategoryLabel } from '../api';


// Components
import PatientSidebar from './PatientSidebar';
import ChatSidebar from './ChatSidebar';
import Header from './Header'; // Asegúrate que la ruta de importación sea correcta
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

  const fetchMedicalRecordsFromFirebase = useCallback((doctorUid: string, patientId: string) => {
    setIsLoadingRecords(true);
    setRecordsError(null);

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
      `doctors/${doctorUid}/patients/${patientId}/medicationRequests`,
    ];

    console.log(`[fetchMedicalRecordsFromFirebase] Setting up listeners for multiple paths`);

    const unsubscribeFunctions: (() => void)[] = [];
    const dataAggregator: { [key: string]: any[] } = {};
    resourcePaths.forEach(path => dataAggregator[path] = []);

    const updateAndSetMedicalRecords = () => {
      const combinedRecords: any[] = [];
      Object.values(dataAggregator).forEach(recordsForPath => {
        combinedRecords.push(...recordsForPath);
      });
      console.log('[fetchMedicalRecordsFromFirebase] All data (re-)aggregated, final formatted records:', { results: combinedRecords });
      setMedicalRecords({ results: combinedRecords });
      setIsLoadingRecords(false);
    };

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
        path.includes('medicationRequests') ? 'MedicationRequest' :
        'Unknown';

      const dataRef = ref(database, path);
      const listener = onValue(dataRef, (snapshot) => {
        const recordsForThisPath: any[] = [];
        const data = snapshot.val();
        console.log(`[fetchMedicalRecordsFromFirebase] Live update for ${resourceType}:`, data);
        if (data) {
          Object.keys(data).forEach(key => {
            const record = data[key];
            if (record && typeof record === 'object') {
              const structData: { [key: string]: any } = {};
              structData[resourceType] = record;
              recordsForThisPath.push({
                document: { structData: structData },
              });
            }
          });
        }
        dataAggregator[path] = recordsForThisPath;
        updateAndSetMedicalRecords();
      }, (dbError: unknown) => {
        console.error(`Error fetching ${resourceType} data from Firebase:`, dbError);
        const errorMessage = (dbError instanceof Error) ? dbError.message : String(dbError);
        setRecordsError(prevError =>
          prevError ? `${prevError}\nError al cargar datos de ${resourceType.toLowerCase()}: ${errorMessage}`
            : `Error al cargar datos de ${resourceType.toLowerCase()}: ${errorMessage}`
        );
        dataAggregator[path] = [];
        updateAndSetMedicalRecords();
      });
      unsubscribeFunctions.push(() => off(dataRef, 'value', listener));
    });

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
    let unsubscribeRecordsCleanup: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        console.log('[useEffect] Authenticated Doctor UID:', doctorUid);
        console.log('[useEffect] Fetching data for Patient ID:', patientId);
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
              NotasConsulta: patientData.NotasConsulta
            });

            if (unsubscribeRecordsCleanup) unsubscribeRecordsCleanup();
            unsubscribeRecordsCleanup = fetchMedicalRecordsFromFirebase(doctorUid, patientId);
          } else {
            console.log('[useEffect] Patient not found in database.');
            setPatient(null);
            setPatientInfo(null);
            setMedicalRecords(null);
            setPatientError('Paciente no encontrado en la base de datos.');
            setIsLoadingRecords(false);
          }
          setIsLoadingPatient(false);
        }, (error: unknown) => {
          console.error("Error fetching patient data from DB:", error);
          const errorMessage = (error instanceof Error) ? error.message : String(error);
          setPatientError('Error al cargar datos del paciente desde la base de datos: ' + errorMessage);
          setIsLoadingPatient(false);
          setIsLoadingRecords(false);
        });
      } else {
        console.log('[useEffect] User not authenticated, redirecting to login.');
        navigate('/login');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribePatient();
      if (unsubscribeRecordsCleanup) unsubscribeRecordsCleanup();
      console.log('[useEffect] Cleaning up Firebase listeners.');
    };
  }, [auth, database, navigate, patientId, fetchMedicalRecordsFromFirebase]);

  const getCategories = useCallback(() => {
    console.log('[getCategories] Recalculating categories with medicalRecords data:', medicalRecords);
    if (!medicalRecords?.results) return [];
    const categoriesMap = new Map<string, boolean>();
    medicalRecords.results.forEach(record => {
      const data = record.document.structData;
      const extractCategories = (resource: any, resourceTypeKey: string) => {
        if (resource?.category) {
          resource.category.forEach((cat: any) => {
            if (cat.text) categoriesMap.set(getCategoryLabel(cat.text), true);
            if (cat.coding) {
              cat.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
          });
        } else {
          if (resourceTypeKey === 'Procedure') {
            categoriesMap.set(getCategoryLabel('Procedure'), true);
          } else if (resourceTypeKey === 'Encounter' && (resource?.type || resource?.class)) {
            if (resource.type) {
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
            if (resource.class?.coding) {
              resource.class.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('Encounter'), true);
          } else if ((resourceTypeKey === 'MedicationAdministration' || resourceTypeKey === 'MedicationAdministrationDuplicate') && resource?.medication) {
            if (resource.medication?.text) categoriesMap.set(getCategoryLabel(resource.medication.text), true);
            if (resource.medication?.coding) {
              resource.medication.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('Medication'), true);
          } else if (resourceTypeKey === 'AllergyIntolerance' && resource?.code) {
            if (resource.code.text) categoriesMap.set(getCategoryLabel(resource.code.text), true);
            if (resource.code.coding) {
              resource.code.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('Allergy'), true);
          } else if (resourceTypeKey === 'Immunization' && resource?.vaccineCode) {
            if (resource.vaccineCode.text) categoriesMap.set(getCategoryLabel(resource.vaccineCode.text), true);
            if (resource.vaccineCode.coding) {
              resource.vaccineCode.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('Immunization'), true);
          } else if (resourceTypeKey === 'ClinicalImpression') {
            categoriesMap.set(getCategoryLabel('ClinicalImpression'), true);
          }
          else if (resourceTypeKey === 'MedicationRequest' && resource?.medicationCodeableConcept) {
            if (resource.medicationCodeableConcept.text) categoriesMap.set(getCategoryLabel(resource.medicationCodeableConcept.text), true);
            if (resource.medicationCodeableConcept.coding) {
              resource.medicationCodeableConcept.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('MedicationRequest'), true);
          }
          else if (resourceTypeKey === 'DiagnosticReport' && resource?.code) {
            if (resource.code.text) categoriesMap.set(getCategoryLabel(resource.code.text), true);
            if (resource.code.coding) {
              resource.code.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('DiagnosticReport'), true);
          } else if (resourceTypeKey === 'ServiceRequest' && resource?.code) {
            if (resource.code.text) categoriesMap.set(getCategoryLabel(resource.code.text), true);
            if (resource.code.coding) {
              resource.code.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('ServiceRequest'), true);
          } else if (resourceTypeKey === 'MedicationDispense' && resource?.medication) {
            if (resource.medication.text) categoriesMap.set(getCategoryLabel(resource.medication.text), true);
            if (resource.medication.coding) {
              resource.medication.coding.forEach((code: any) => {
                if (code.display) categoriesMap.set(getCategoryLabel(code.display), true);
                else if (code.code) categoriesMap.set(getCategoryLabel(code.code), true);
              });
            }
            categoriesMap.set(getCategoryLabel('MedicationDispense'), true);
          }
        }
      };

      if (data.Observation) extractCategories(data.Observation, 'Observation');
      if (data.Condition) extractCategories(data.Condition, 'Condition');
      if (data.Procedure) extractCategories(data.Procedure, 'Procedure');
      if (data.Encounter) extractCategories(data.Encounter, 'Encounter');
      if (data.MedicationAdministration) extractCategories(data.MedicationAdministration, 'MedicationAdministration');
      if (data.MedicationAdministrationDuplicate) extractCategories(data.MedicationAdministrationDuplicate, 'MedicationAdministrationDuplicate');
      if (data.AllergyIntolerance) extractCategories(data.AllergyIntolerance, 'AllergyIntolerance');
      if (data.ClinicalImpression) extractCategories(data.ClinicalImpression, 'ClinicalImpression');
      if (data.Immunization) extractCategories(data.Immunization, 'Immunization');
      if (data.MedicationRequest) extractCategories(data.MedicationRequest, 'MedicationRequest');
      if (data.DiagnosticReport) extractCategories(data.DiagnosticReport, 'DiagnosticReport');
      if (data.ServiceRequest) extractCategories(data.ServiceRequest, 'ServiceRequest');
      if (data.MedicationDispense) extractCategories(data.MedicationDispense, 'MedicationDispense');
    });

    let categories = Array.from(categoriesMap.keys()).sort();
    const checkAndAddCategory = (resourceKey: keyof ApiResponse['results'][number]['document']['structData'], labelKey: string) => {
      const hasResource = medicalRecords?.results.some(record => record.document.structData[resourceKey]);
      const categoryLabel = getCategoryLabel(labelKey);
      if (hasResource && !categories.includes(categoryLabel)) {
        categories.push(categoryLabel);
      }
    };

    checkAndAddCategory('Observation', 'Observation');
    checkAndAddCategory('Condition', 'Condition');
    checkAndAddCategory('Procedure', 'Procedure');
    checkAndAddCategory('Encounter', 'Encounter');
    checkAndAddCategory('MedicationAdministration', 'Medication');
    checkAndAddCategory('MedicationAdministrationDuplicate', 'Medication');
    checkAndAddCategory('MedicationRequest', 'MedicationRequest');
    checkAndAddCategory('AllergyIntolerance', 'Allergy');
    checkAndAddCategory('Immunization', 'Immunization');
    checkAndAddCategory('ClinicalImpression', 'ClinicalImpression');
    checkAndAddCategory('DiagnosticReport', 'DiagnosticReport');
    checkAndAddCategory('ServiceRequest', 'ServiceRequest');
    checkAndAddCategory('MedicationDispense', 'MedicationDispense');

    categories.sort();
    console.log('[getCategories] Final categories:', categories);
    return categories;
  }, [medicalRecords, getCategoryLabel]);

  const fhirDataString = medicalRecords ? JSON.stringify(medicalRecords, null, 2) : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  const handleAddResourceClick = () => {
    console.log('handleAddResourceClick: Setting showAddResourceMenu to true');
    setShowAddResourceMenu(true);
    setSelectedResourceType(null);
  };

  const handleSelectResource = (resourceType: string) => {
    console.log(`handleSelectResource: Resource type selected: ${resourceType}`);
    setSelectedResourceType(resourceType);
    setShowAddResourceMenu(false);
  };

  const handleCancelAddResource = () => {
    console.log('handleCancelAddResource: Closing form and menu');
    setSelectedResourceType(null);
    setShowAddResourceMenu(false);
  };

  const handleSaveObservation = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Observation: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/observations`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "Observation",
      status: formData.status || "final",
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }], text: "Observación" }],
      code: formData.codeText ? { text: formData.codeText } : undefined,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      effectiveDateTime: formData.effectiveDateTime,
      valueQuantity: (formData.value !== undefined && formData.unit !== undefined) ? { value: parseFloat(formData.value), unit: formData.unit } : undefined,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving Observation:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Observation saved successfully.'); handleCancelAddResource(); } catch (e: unknown) {
      console.error('Failed to save Observation:', e);
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar la Observación: ${errorMessage}`);
    }
  };

  const handleSaveCondition = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Condition: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/conditions`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "Condition",
      clinicalStatus: formData.clinicalStatus ? { coding: [{ code: formData.clinicalStatus }] } : undefined,
      verificationStatus: formData.verificationStatus ? { coding: [{ code: formData.verificationStatus }] } : undefined,
      category: [{ text: "Condición Médica" }],
      code: formData.codeText ? { text: formData.codeText } : undefined,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      onsetDateTime: formData.onsetDateTime,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving Condition:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Condition saved successfully.'); handleCancelAddResource(); } catch (e: unknown) {
      console.error('Failed to save Condition:', e);
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar la Condición: ${errorMessage}`);
    }
  };

  const handleSaveProcedure = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Procedure: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/procedures`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "Procedure",
      status: formData.status,
      code: formData.codeText ? { text: formData.codeText } : undefined,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      performedDateTime: formData.performedDateTime,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving Procedure:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Procedure saved successfully.'); handleCancelAddResource(); } catch (e: unknown) {
      console.error('Failed to save Procedure:', e);
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar el Procedimiento: ${errorMessage}`);
    }
  };

  const handleSaveEncounter = async (formData: any) => {
    if (!patientId || !auth.currentUser) { console.error('Error saving Encounter: patientId or authenticated user is not defined.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/encounters`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "Encounter",
      status: formData.status || "finished",
      type: formData.type ? [{ text: formData.type }] : undefined,
      period: (formData.periodStart || formData.periodEnd) ? { start: formData.periodStart || undefined, end: formData.periodEnd || undefined } : undefined,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      reason: formData.reason ? [{ text: formData.reason }] : undefined,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving Encounter:', dataToSave);
    try { await set(newRef, dataToSave); console.log('Encounter saved successfully.'); handleCancelAddResource(); } catch (e: unknown) {
      console.error('Failed to save Encounter:', e);
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      alert(`Error al guardar el Encuentro: ${errorMessage}`);
    }
  };

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
      status: formData.status || "completed",
      medication: formData.medicationName ? { text: formData.medicationName } : undefined,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      effectiveDateTime: formData.effectiveDateTime,
      dosage: (formData.dosageValue !== undefined || formData.dosageUnit !== undefined || formData.route !== undefined) ? {
        dose: (formData.dosageValue !== undefined && formData.dosageUnit !== undefined) ? { value: parseFloat(formData.dosageValue), unit: formData.dosageUnit } : undefined,
        route: formData.route ? { text: formData.route } : undefined
      } : undefined,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving MedicationAdministration:', dataToSave);
    try {
      await set(newRef, dataToSave);
      console.log('MedicationAdministration saved successfully to Firebase.');
      handleCancelAddResource();
    } catch (error: unknown) {
      console.error('Failed to save medication administration to Firebase:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Error al guardar la Administración de Medicamento: ${errorMessage}`);
    }
  };

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
      resourceType: "MedicationAdministrationDuplicate",
      status: formData.status || "completed",
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
      handleCancelAddResource();
    } catch (error: unknown) {
      console.error('Failed to save duplicated medication administration to Firebase:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Error al guardar la Administración de Medicamento (Duplicado): ${errorMessage}`);
    }
  };

  const handleSaveAllergyIntolerance = async (formData: any) => {
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
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "confirmed" }] },
      type: "allergy",
      code: formData.substance ? {
        coding: [{ display: formData.substance }]
      } : undefined,
      patient: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      recordedDate: formData.recordedDate || new Date().toISOString(),
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving AllergyIntolerance:', dataToSave);
    try {
      await set(newRef, dataToSave);
      console.log('Allergy/Intolerance saved successfully to Firebase.');
      handleCancelAddResource();
    } catch (error: unknown) {
      console.error('Failed to save allergy/intolerance to Firebase:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Error al guardar la Alergia/Intolerancia: ${errorMessage}`);
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
      date: formData.date || new Date().toISOString(),
      description: formData.description || "",
      status: formData.status,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving ClinicalImpression:', dataToSave);
    try {
      await set(newRef, dataToSave);
      console.log('Clinical Impression saved successfully to Firebase.');
      handleCancelAddResource();
    } catch (error: unknown) {
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
      vaccineCode: formData.vaccineCode ? {
        coding: [{ display: formData.vaccineCode }]
      } : undefined,
      patient: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      occurrenceDateTime: formData.occurrenceDateTime,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving Immunization:', dataToSave);
    try {
      await set(newRef, dataToSave);
      console.log('Immunization saved successfully to Firebase.');
      handleCancelAddResource();
    } catch (error: unknown) {
      console.error('Failed to save immunization to Firebase:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Error al guardar la Inmunización: ${errorMessage}`);
    }
  };

  const handleSaveMedicationRequest = async (formData: MedicationRequestFormData) => {
    if (!patientId || !auth.currentUser) {
      console.error('Cannot save medication request: patientId or authenticated user is not defined.');
      return;
    }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/medicationRequests`);
    const newRef = push(dataRef);
    const dataToSave = {
      id: newRef.key,
      resourceType: "MedicationRequest",
      status: formData.status,
      intent: formData.intent,
      medicationCodeableConcept: formData.medicationName ? {
        coding: [{ display: formData.medicationName }]
      } : undefined,
      subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
      authoredOn: formData.authoredOn,
      dosageInstruction: formData.dosageInstructionText ? [{
        text: formData.dosageInstructionText,
        route: formData.routeText ? {
          coding: [{ display: formData.routeText }]
        } : undefined,
      }] : undefined,
      note: formData.noteText ? [{ text: formData.noteText }] : undefined
    };
    console.log('Saving MedicationRequest:', dataToSave);
    try {
      await set(newRef, dataToSave);
      console.log('Medication Request saved successfully to Firebase.');
      handleCancelAddResource();
    } catch (error: unknown) {
      console.error('Failed to save medication request to Firebase:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Error al guardar la Solicitud de Medicamento: ${errorMessage}`);
    }
  };

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

  if (patient && patientId && !isLoadingPatient && !patientError) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* AQUÍ SE PASA LA PROP resultsData */}
        <Header 
          resetSearch={() => { /* Define tu lógica de resetSearch aquí si es necesaria */ }} 
          patientId={patientId || null} 
          resultsData={fhirDataString} 
        />

        <div className="flex flex-1 p-4 gap-4 items-stretch overflow-hidden">
          
          <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col"> 
            <PatientSidebar
              patientInfo={patientInfo}
              categories={getCategories()}
              selectedCategory={selectedCategory ? getCategoryLabel(selectedCategory) : null}
              setSelectedCategory={setSelectedCategory}
              fhirData={fhirDataString}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0"> 
            
            <div className="mb-4 flex space-x-4 flex-shrink-0 p-2">
              <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Volver a Expedientes
              </Link>
              <button
                onClick={handleAddResourceClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Agregar Recurso
              </button>
            </div>

            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md flex flex-col flex-1 min-h-0 w-full">
              
              <div className="flex-shrink-0">
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  handleSearch={handleSearchSubmit}
                />
              </div>
              
              <h2 className="text-xl font-bold text-teal-800 mb-4 mt-6 flex-shrink-0">
                Registros Médicos
              </h2>

              <div className="flex-1 overflow-y-auto min-h-0">
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
          </div>

          <div className="w-96 border-l border-gray-200 flex flex-col"> 
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

        {showAddResourceMenu && selectedResourceType === null && (
          <AddResourceMenu
            onSelectResource={handleSelectResource}
            onCancel={handleCancelAddResource}
          />
        )}

        {selectedResourceType === 'Observation' && <AddObservationForm onSave={handleSaveObservation} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Condition' && <AddConditionForm onSave={handleSaveCondition} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Encounter' && <AddEncounterForm onSave={handleSaveEncounter} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Procedure' && <AddProcedureForm onSave={handleSaveProcedure} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'MedicationAdministration' && <AddMedicationAdministrationForm onSave={handleSaveMedicationAdministration} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'MedicationAdministrationDuplicate' && <AddMedicationAdministrationDuplicateForm onSave={handleSaveMedicationAdministrationDuplicate} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'AllergyIntolerance' && <AddAllergyIntoleranceForm onSave={handleSaveAllergyIntolerance} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'ClinicalImpression' && <AddClinicalImpressionForm onSave={handleSaveClinicalImpression} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'Immunization' && <AddImmunizationForm onSave={handleSaveImmunization} onCancel={handleCancelAddResource} />}
        {selectedResourceType === 'MedicationRequest' && (
          <AddMedicationRequestForm
            onSave={handleSaveMedicationRequest}
            onCancel={handleCancelAddResource}
          />
        )}
      </div>
    );
  }

  return null;
};

export default PatientDetailView;