// PatientDetailView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // <--- Añadido useRef
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off, push, set } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"; // <--- Añadido para Storage
import { app } from '../firebase';
import type { Patient, ApiResponse, PatientInfo, ChatMessage, NotaConsultaItem } from '../types';
import { getCategoryLabel, fetchMarkdown } from '../api'; // <--- Añadido fetchMarkdown
import { FileText } from 'lucide-react';
import { jsPDF } from 'jspdf'; // <--- Añadido jsPDF

// Components
import PatientSidebar from './PatientSidebar';
import ChatSidebar from './ChatSidebar';
import Header from './Header';
import SearchBar from './SearchBar';
import MedicalRecords from './MedicalRecords';
import AddResourceMenu from './AddResourceMenu';
// Import all the form components
import AddObservationForm, { ObservationFormData } from './AddObservationForm';
import AddConditionForm from './AddConditionForm';
import AddEncounterForm from './AddEncounterForm';
import AddProcedureForm from './AddProcedureForm';
import AddMedicationAdministrationForm from './AddMedicationAdministrationForm';
import AddMedicationAdministrationDuplicateForm from './AddMedicationAdministrationDuplicateForm';
import AddAllergyIntoleranceForm from './AddAllergyIntoleranceForm';
import AddClinicalImpressionForm from './AddClinicalImpressionForm';
import AddImmunizationForm from './AddImmunizationForm';
import AddMedicationRequestForm from './AddMedicationRequestForm';

// Import the types for form data
import type { ClinicalImpressionFormData } from './AddClinicalImpressionForm';
import type { ImmunizationFormData } from './AddImmunizationForm';
import type { MedicationRequestFormData } from './AddMedicationRequestForm';

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

  // --- NUEVO ESTADO Y REF PARA EL BOTÓN DE REPORTE AI ---
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [reportButtonText, setReportButtonText] = useState("Reporte AI");
  const reportIntervalIdRef = useRef<NodeJS.Timeout | undefined>(undefined);
  // --- FIN NUEVO ESTADO Y REF ---

  const auth = getAuth(app);
  const database = getDatabase(app);
  const storage = getStorage(app); // <--- Instancia de Storage

  // --- NUEVA CONSTANTE PARA MENSAJES DE CARGA DEL REPORTE ---
  const reportLoadingMessages = [
    "Reporte AI",
    "Analizando historial...",
    "Leyendo expediente...",
    "Resumiendo datos médicos...",
    "IA en acción...",
    "Generando informe...",
    "Detectando diagnósticos...",
    "Resumiendo inteligentemente...",
    "Procesando paciente...",
    "Ordenando información...",
    "Informe en camino...",
  ];
  // --- FIN NUEVA CONSTANTE ---

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
    const unsubscribeFunctions: (() => void)[] = [];
    const dataAggregator: { [key: string]: any[] } = {};
    resourcePaths.forEach(path => dataAggregator[path] = []);
    const updateAndSetMedicalRecords = () => {
      const combinedRecords: any[] = [];
      Object.values(dataAggregator).forEach(recordsForPath => {
        combinedRecords.push(...recordsForPath);
      });
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
        if (data) {
          Object.keys(data).forEach(key => {
            const record = data[key];
            if (record && typeof record === 'object') {
              const structData: { [key: string]: any } = {};
              structData[resourceType] = record;
              recordsForThisPath.push({ document: { structData: structData } });
            }
          });
        }
        dataAggregator[path] = recordsForThisPath;
        updateAndSetMedicalRecords();
      }, (dbError: unknown) => {
        console.error(`Error fetching ${resourceType} data from Firebase:`, dbError);
        const errorMessage = (dbError instanceof Error) ? dbError.message : String(dbError);
        setRecordsError(prevError => prevError ? `${prevError}\nError al cargar datos de ${resourceType.toLowerCase()}: ${errorMessage}` : `Error al cargar datos de ${resourceType.toLowerCase()}: ${errorMessage}`);
        dataAggregator[path] = [];
        updateAndSetMedicalRecords();
      });
      unsubscribeFunctions.push(() => off(dataRef, 'value', listener));
    });
    return () => { unsubscribeFunctions.forEach(unsub => unsub()); };
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
        const patientRefDB = ref(database, `doctors/${doctorUid}/patients/${patientId}`);
        setIsLoadingPatient(true);
        setPatientError(null);
        unsubscribePatient = onValue(patientRefDB, (snapshot) => {
          const patientData = snapshot.val() as Patient;
          if (patientData) {
            setPatient(patientData);
            const infoForSidebar: PatientInfo = {
                 name: `${patientData.name?.[0]?.given?.join(' ') || ''} ${patientData.name?.[0]?.family || ''}`,
                 id: patientData.id,
                 birthDate: patientData.birthDate,
                 gender: patientData.gender,
                 identifier: patientData.identifier?.[0]?.value || patientData.dui,
                 NotasConsulta: patientData.NotasConsulta
             };
            setPatientInfo(infoForSidebar);
            if (unsubscribeRecordsCleanup) unsubscribeRecordsCleanup();
            unsubscribeRecordsCleanup = fetchMedicalRecordsFromFirebase(doctorUid, patientId);
          } else {
            setPatient(null);
            setPatientInfo(null);
            setMedicalRecords(null);
            setPatientError('Paciente no encontrado en la base de datos.');
            setIsLoadingRecords(false);
          }
          setIsLoadingPatient(false);
        }, (error: unknown) => {
          const errorMessage = (error instanceof Error) ? error.message : String(error);
          setPatientError('Error al cargar datos del paciente: ' + errorMessage);
          setIsLoadingPatient(false);
          setIsLoadingRecords(false);
          setPatientInfo(null);
        });
      } else {
        navigate('/login');
      }
    });
    return () => {
      unsubscribeAuth();
      unsubscribePatient();
      if (unsubscribeRecordsCleanup) unsubscribeRecordsCleanup();
    };
  }, [auth, database, navigate, patientId, fetchMedicalRecordsFromFirebase]);

  // --- NUEVO USEEFFECT PARA LIMPIAR INTERVALO DEL REPORTE ---
  useEffect(() => {
    return () => {
      if (reportIntervalIdRef.current) {
        clearInterval(reportIntervalIdRef.current);
      }
    };
  }, []);
  // --- FIN NUEVO USEEFFECT ---


  const handleSaveNewConsultationNote = async (noteContent: NotaConsultaItem): Promise<boolean> => {
    if (!patientId || !auth.currentUser) {
      alert("Error: No se pudo identificar al paciente o al usuario para guardar la nota.");
      return false;
    }
    const doctorUid = auth.currentUser.uid;
    const now = new Date();
    const noteDateKey = now.toISOString().split('.')[0] + 'Z';
    const newNotePath = `doctors/${doctorUid}/patients/${patientId}/NotasConsulta/${noteDateKey}`;
    const noteRefDB = ref(database, newNotePath);
    try {
      await set(noteRefDB, noteContent);
      return true;
    } catch (error) {
      alert(`Error al guardar la nota: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };

  const getCategories = useCallback(() => {
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
          if (resourceTypeKey === 'Procedure') categoriesMap.set(getCategoryLabel('Procedure'), true);
          else if (resourceTypeKey === 'Encounter') categoriesMap.set(getCategoryLabel('Encounter'), true);
          else if ((resourceTypeKey === 'MedicationAdministration' || resourceTypeKey === 'MedicationAdministrationDuplicate') && resource?.medication) categoriesMap.set(getCategoryLabel('Medication'), true);
          else if (resourceTypeKey === 'AllergyIntolerance' && resource?.code) categoriesMap.set(getCategoryLabel('Allergy'), true);
          else if (resourceTypeKey === 'Immunization' && resource?.vaccineCode) categoriesMap.set(getCategoryLabel('Immunization'), true);
          else if (resourceTypeKey === 'ClinicalImpression') categoriesMap.set(getCategoryLabel('ClinicalImpression'), true);
          else if (resourceTypeKey === 'MedicationRequest' && resource?.medicationCodeableConcept) categoriesMap.set(getCategoryLabel('MedicationRequest'), true);
          else if (resourceTypeKey === 'DiagnosticReport' && resource?.code) categoriesMap.set(getCategoryLabel('DiagnosticReport'), true);
          else if (resourceTypeKey === 'ServiceRequest' && resource?.code) categoriesMap.set(getCategoryLabel('ServiceRequest'), true);
          else if (resourceTypeKey === 'MedicationDispense' && resource?.medication) categoriesMap.set(getCategoryLabel('MedicationDispense'), true);
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
         if (hasResource && !categories.includes(categoryLabel)) { categories.push(categoryLabel); }
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
    return categories;
  }, [medicalRecords]);

  const fhirDataString = medicalRecords ? JSON.stringify(medicalRecords, null, 2) : null;

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); console.log("Searching for:", searchQuery); };
  const handleAddResourceClick = () => { setShowAddResourceMenu(true); setSelectedResourceType(null); };
  const handleSelectResource = (resourceType: string) => { setSelectedResourceType(resourceType); setShowAddResourceMenu(false); };
  const handleCancelAddResource = () => { setSelectedResourceType(null); setShowAddResourceMenu(false); };

  const handleSaveObservation = async (formData: ObservationFormData) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/observations`);
    const newRef = push(dataRef);
    let effectiveDateISO: string | undefined;
    if (formData.effectiveDateTime) {
        try {
            if (formData.effectiveDateTime.endsWith('Z')) { effectiveDateISO = formData.effectiveDateTime; }
            else { const dateObj = new Date(formData.effectiveDateTime); if (!isNaN(dateObj.getTime())) { effectiveDateISO = dateObj.toISOString(); }}
        } catch (e) { console.error("Error al parsear effectiveDateTime:", e); }
    }
    if (!effectiveDateISO) { alert('Error: La fecha de observación no es válida.'); return; }
    const dataToSave: { [key: string]: any } = {
        id: newRef.key, resourceType: "Observation", status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }], text: "Observación" }],
        code: formData.codeText ? { text: formData.codeText.trim() } : undefined,
        subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' },
        effectiveDateTime: effectiveDateISO, note: [{ text: formData.noteText || '' }]
    };
    const hasValue = typeof formData.value === 'string' && formData.value.trim() !== '';
    const hasUnit = typeof formData.unit === 'string' && formData.unit.trim() !== '';
    if (hasValue && hasUnit) {
      const trimmedValueStr = formData.value.replace(/\s/g, '').trim();
      const trimmedUnitStr = formData.unit.trim();
      const numericValue = Number(trimmedValueStr);
      if (!isNaN(numericValue)) { dataToSave.valueQuantity = { value: numericValue, unit: trimmedUnitStr }; }
    }
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (e: unknown) { alert(`Error al guardar la Observación: ${(e instanceof Error) ? e.message : String(e)}`); }
  };
  const handleSaveCondition = async (formData: any) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/conditions`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "Condition", clinicalStatus: formData.clinicalStatus ? { coding: [{ code: formData.clinicalStatus }] } : undefined, verificationStatus: formData.verificationStatus ? { coding: [{ code: formData.verificationStatus }] } : undefined, category: [{ text: "Condición Médica" }], code: formData.codeText ? { text: formData.codeText } : undefined, subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, onsetDateTime: formData.onsetDateTime, note: formData.noteText ? [{ text: formData.noteText }] : undefined };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (e: unknown) { alert(`Error al guardar la Condición: ${(e instanceof Error) ? e.message : String(e)}`); }
  };
  const handleSaveProcedure = async (formData: any) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/procedures`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "Procedure", status: formData.status, code: formData.codeText ? { text: formData.codeText } : undefined, subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, performedDateTime: formData.performedDateTime, note: formData.noteText ? [{ text: formData.noteText }] : undefined };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (e: unknown) { alert(`Error al guardar el Procedimiento: ${(e instanceof Error) ? e.message : String(e)}`); }
  };
  const handleSaveEncounter = async (formData: any) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/encounters`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "Encounter", status: formData.status || "finished", type: formData.type ? [{ text: formData.type }] : undefined, period: (formData.periodStart || formData.periodEnd) ? { start: formData.periodStart || undefined, end: formData.periodEnd || undefined } : undefined, subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, reason: formData.reason ? [{ text: formData.reason }] : undefined, note: formData.noteText ? [{ text: formData.noteText }] : undefined };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (e: unknown) { alert(`Error al guardar el Encuentro: ${(e instanceof Error) ? e.message : String(e)}`); }
  };
  const handleSaveMedicationAdministration = async (formData: any) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/medicationAdministrations`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "MedicationAdministration", status: formData.status || "completed", medication: formData.medicationName ? { text: formData.medicationName } : undefined, subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, effectiveDateTime: formData.effectiveDateTime, dosage: (formData.dosageValue !== undefined || formData.dosageUnit !== undefined || formData.route !== undefined) ? { dose: (formData.dosageValue !== undefined && formData.dosageUnit !== undefined) ? { value: parseFloat(formData.dosageValue), unit: formData.dosageUnit } : undefined, route: formData.route ? { text: formData.route } : undefined } : undefined, note: formData.noteText ? [{ text: formData.noteText }] : undefined };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (error: unknown) { alert(`Error al guardar la Administración de Medicamento: ${(error instanceof Error) ? error.message : String(error)}`); }
  };
  const handleSaveMedicationAdministrationDuplicate = async (formData: any) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/medicationAdministrationsDuplicate`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "MedicationAdministrationDuplicate", status: formData.status || "completed", medication: formData.medicationName ? { text: formData.medicationName } : undefined, subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, effectiveDateTime: formData.effectiveDateTime, dosage: (formData.dosageValue !== undefined || formData.dosageUnit !== undefined || formData.route !== undefined) ? { dose: (formData.dosageValue !== undefined && formData.dosageUnit !== undefined) ? { value: parseFloat(formData.dosageValue), unit: formData.dosageUnit } : undefined, route: formData.route ? { text: formData.route } : undefined } : undefined, note: formData.noteText ? [{ text: formData.noteText }] : undefined };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (error: unknown) { alert(`Error al guardar la Administración de Medicamento (Duplicado): ${(error instanceof Error) ? error.message : String(error)}`); }
  };
  const handleSaveAllergyIntolerance = async (formData: any) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/allergyIntolerances`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "AllergyIntolerance", clinicalStatus: formData.clinicalStatus ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: formData.clinicalStatus }] } : undefined, verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "confirmed" }] }, type: "allergy", code: formData.substance ? { coding: [{ display: formData.substance }], text: formData.substance } : undefined, patient: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, recordedDate: new Date().toISOString(), note: [{ text: formData.note }] };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (error: unknown) { alert(`Error al guardar la Alergia/Intolerancia: ${(error instanceof Error) ? error.message : String(error)}`); }
  };
  const handleSaveClinicalImpression = async (formData: ClinicalImpressionFormData) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/clinicalImpressions`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "ClinicalImpression", date: formData.date || new Date().toISOString(), description: formData.description || "", status: formData.status, subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, note: [{ text: formData.noteText || '' }] };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (error: unknown) { alert(`Error al guardar la Impresión Clínica: ${(error instanceof Error) ? error.message : String(error)}`); }
  };
  const handleSaveImmunization = async (formData: ImmunizationFormData) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/immunizations`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "Immunization", status: formData.status, vaccineCode: formData.vaccineCode ? { coding: [{ display: formData.vaccineCode }] } : undefined, patient: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, occurrenceDateTime: formData.occurrenceDateTime, note: [{ text: formData.noteText || '' }] };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (error: unknown) { alert(`Error al guardar la Inmunización: ${(error instanceof Error) ? error.message : String(error)}`); }
  };
  const handleSaveMedicationRequest = async (formData: MedicationRequestFormData) => {
    if (!patientId || !auth.currentUser) { alert('Error: Paciente o usuario no definido.'); return; }
    const doctorUid = auth.currentUser.uid;
    const dataRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/medicationRequests`);
    const newRef = push(dataRef);
    const dataToSave = { id: newRef.key, resourceType: "MedicationRequest", status: formData.status, intent: formData.intent, medicationCodeableConcept: formData.medicationName ? { coding: [{ display: formData.medicationName }] } : undefined, subject: { reference: `Patient/${patientId}`, display: patientInfo?.name || 'Paciente Desconocido' }, authoredOn: formData.authoredOn, dosageInstruction: formData.dosageInstructionText ? [{ text: formData.dosageInstructionText, route: formData.routeText ? { coding: [{ display: formData.routeText }] } : undefined }] : undefined, note: formData.noteText ? [{ text: formData.noteText }] : undefined };
    try { await set(newRef, dataToSave); handleCancelAddResource(); }
    catch (error: unknown) { alert(`Error al guardar la Solicitud de Medicamento: ${(error instanceof Error) ? error.message : String(error)}`); }
  };

  // --- NUEVA FUNCIÓN handleDownloadReport (ANTES handleDownload en Header) ---
  const handleDownloadReport = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para generar reportes.");
      return;
    }
    if (!patientId) {
      alert("Por favor, selecciona un paciente antes de generar el reporte.");
      return;
    }
    if (!fhirDataString) { // Usamos fhirDataString que ya está disponible en este componente
      alert("No hay datos del paciente (registros médicos) para generar el reporte.");
      return;
    }

    setIsDownloadingReport(true);
    let currentLoadingIndex = 1;
    setReportButtonText(reportLoadingMessages[currentLoadingIndex]);

    if (reportIntervalIdRef.current) clearInterval(reportIntervalIdRef.current);
    reportIntervalIdRef.current = setInterval(() => {
      currentLoadingIndex = (currentLoadingIndex + 1) % (reportLoadingMessages.length - 1);
      if (currentLoadingIndex === 0) currentLoadingIndex = 1; // Evitar el primer mensaje "Reporte AI" en el ciclo
      setReportButtonText(reportLoadingMessages[currentLoadingIndex]);
    }, 2000);

    try {
      const markdownResponse: string = await fetchMarkdown(patientId, fhirDataString);

      if (reportIntervalIdRef.current) clearInterval(reportIntervalIdRef.current);

      const generatePdfBlob = (markdownString: string): Blob | null => {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const maxLineWidth = pageWidth - (margin * 2);
        let y = margin;
        const lineHeight = 7;
        const fontSize = 11;
        pdf.setFontSize(fontSize);
        try {
          const parsedContent = JSON.parse(markdownString);
          const reportText = parsedContent.response;
          if (typeof reportText !== 'string') { throw new Error('Formato de respuesta inesperado.'); }
          const lines = reportText.split('\n').reduce((acc: string[], paragraph: string) => {
            const paragraphLines = pdf.splitTextToSize(paragraph, maxLineWidth);
            return acc.concat(paragraphLines);
          }, []);
          lines.forEach((line: string) => {
            if (y + lineHeight > pageHeight - margin) { pdf.addPage(); y = margin; }
            pdf.text(line, margin, y);
            y += lineHeight;
          });
          return pdf.output('blob');
        } catch (error) {
          alert(`Hubo un error al procesar el contenido del reporte: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      };

      const pdfBlob = generatePdfBlob(markdownResponse);

      if (pdfBlob) {
        const doctorUid = user.uid;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `reporte-medico-${patientId}-${timestamp}.pdf`;
        // Usamos la instancia de storage definida en este componente
        const pdfStorageRef = storageRef(storage, `doctor_reports/${doctorUid}/${fileName}`);
        const uploadResult = await uploadBytes(pdfStorageRef, pdfBlob);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        // Usamos la instancia de database definida en este componente
        const medicalReportsRef = ref(database, `doctors/${doctorUid}/medicalReports`);
        const newReportRef = push(medicalReportsRef);
        const currentPatientNameForReport = patientInfo?.name || (patient?.name?.[0]?.given?.join(' ') + ' ' + patient?.name?.[0]?.family) || 'Paciente Desconocido';

        const reportData = {
          id: newReportRef.key,
          patientId: patientId,
          patientName: currentPatientNameForReport,
          fileName: fileName,
          downloadURL: downloadURL,
          timestamp: new Date().toISOString(),
          reportDate: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        };
        await set(newReportRef, reportData);
        setReportButtonText("Reporte Guardado");
        setTimeout(() => setReportButtonText(reportLoadingMessages[0]), 3000);
      } else {
        throw new Error("No se pudo generar el PDF.");
      }
    } catch (error) {
      if (reportIntervalIdRef.current) clearInterval(reportIntervalIdRef.current);
      alert(`Error al generar o guardar el reporte: ${error instanceof Error ? error.message : String(error)}`);
      setReportButtonText("Error al Generar");
      setTimeout(() => setReportButtonText(reportLoadingMessages[0]), 3000);
    } finally {
      setIsDownloadingReport(false);
      if (reportIntervalIdRef.current) clearInterval(reportIntervalIdRef.current);
    }
  };
  // --- FIN NUEVA FUNCIÓN handleDownloadReport ---


  if (patientId && isLoadingPatient) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando expediente...</p></div>;
  }
  if (!patientId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Seleccione un Paciente</h1>
          <p className="text-gray-600 mb-6">Navegue a la lista de expedientes para seleccionar un paciente o inicie una nueva consulta.</p>
          <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 mr-4">Ver Expedientes</Link>
          <Link to="/new-consultation" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Nueva Consulta</Link>
        </div>
      </div>
    );
  }

  if (patient && patientId && !isLoadingPatient && !patientError && patientInfo) {

    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <Header resetSearch={() => {}} /> {/* Ya no pasamos props de reporte al Header */}

        <div className="flex flex-1 p-4 gap-4 items-stretch overflow-hidden">
          <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col">
            <PatientSidebar
              patientInfo={patientInfo}
              categories={getCategories()}
              selectedCategory={selectedCategory ? getCategoryLabel(selectedCategory) : null}
              setSelectedCategory={setSelectedCategory}
              fhirData={fhirDataString}
              onSaveNewNote={handleSaveNewConsultationNote}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md flex flex-col flex-1 min-h-0 w-full">
              <div className="flex-shrink-0">
                <div className="mb-4 flex space-x-4 flex-shrink-0 p-2 items-center"> {/* Añadido items-center para alinear botones */}
                  <h2 className="text-xl font-bold text-teal-800 mr-auto"> {/* mr-auto para empujar botones a la derecha */}
                    Registros Médicos
                  </h2>
                  {/* Botón "Volver a Expedientes" ELIMINADO de aquí */}
                  <button
                    onClick={handleAddResourceClick}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Agregar Recurso
                  </button>
                  {/* --- NUEVO BOTÓN DE REPORTE AI AQUÍ --- */}
                  {patientId && ( // Solo mostrar si hay un patientId (aunque ya estamos dentro de un bloque que lo asegura)
                    <button
                      className={`text-white font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors duration-150 ${isDownloadingReport ? 'cursor-wait opacity-75' : 'hover:bg-teal-700'}`}
                      onClick={handleDownloadReport}
                      disabled={isDownloadingReport}
                      style={{ backgroundColor: '#29a3ac' }} // Mismo estilo que tenía en Header
                    >
                      {reportButtonText}
                    </button>
                  )}
                  {/* --- FIN NUEVO BOTÓN --- */}
                  <Link to="/reportes-medicos" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                    <FileText className="w-5 h-5 mr-2" />
                    Ver Mis Reportes AI
                  </Link>
                </div>
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  handleSearch={handleSearchSubmit}
                />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {isLoadingRecords ? (
                  <div className="text-center text-gray-600">Cargando registros médicos...</div>
                ) : recordsError ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{recordsError}</span>
                  </div>
                ) : medicalRecords?.results && medicalRecords.results.length > 0 ? (
                  <MedicalRecords results={medicalRecords} isLoading={isLoadingRecords} selectedCategory={selectedCategory} searchQuery={searchQuery} />
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
              selectedPatientId={patientId}
            />
          </div>
        </div>

        {showAddResourceMenu && selectedResourceType === null && (
          <AddResourceMenu onSelectResource={handleSelectResource} onCancel={handleCancelAddResource} />
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
        {selectedResourceType === 'MedicationRequest' && <AddMedicationRequestForm onSave={handleSaveMedicationRequest} onCancel={handleCancelAddResource} />}
      </div>
    );
  }

  if (patientError) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-red-500">Error al cargar el expediente: {patientError}</p></div>;
  }
  if (patientId && isLoadingPatient) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando expediente...</p></div>;
  }
  if (patientId && !isLoadingPatient && !patient) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-red-500">Paciente no encontrado.</p></div>;
  }
  return null;
};

export default PatientDetailView;