import React, { useState, useEffect } from 'react';
import { searchMedicalRecords, fetchAllPatients, getCategoryLabel } from './api';
import type { ApiResponse, PatientInfo, ChatMessage, PatientListItem } from './types';

// Components
import PatientSidebar from './components/PatientSidebar';
import ChatSidebar from './components/ChatSidebar';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import MedicalRecords from './components/MedicalRecords';
import PatientSelector from './components/PatientSelector';

function App() {
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

  const loadPatients = async () => {
    setIsLoadingPatients(true);
    setError(null);
    try {
      const data = await fetchAllPatients();
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
    setIsLoading(true); // Indicate loading for medical records area
    setError(null); // Clear previous errors

    try {
      const data = await searchMedicalRecords(patientId);
      setResults(data); // Set results state here (includes structData/FHIR)

      if (data.results && data.results.length > 0) {
        // Find patient info within the results
        const patientRecord = data.results.find((record: { document: { structData: { Patient: any; }; }; }) => record.document.structData?.Patient)?.document.structData?.Patient;

        if (patientRecord) {
             setPatientInfo({
                 name: `${patientRecord.name[0].given.join(' ')} ${patientRecord.name[0].family}`,
                 id: patientRecord.id,
                 birthDate: patientRecord.birthDate,
                 gender: patientRecord.gender,
                 identifier: patientRecord.identifier[0].value,
             });
        } else {
             // Patient record not found within the documents
             setPatientInfo(null); // Clear patient info if not found
             setError("Patient information not found within the medical records.");
        }
      } else {
         // Handle case where data.results is null or empty
         setPatientInfo(null);
         setResults(null); // Ensure results is null if no records found
         setError("No medical records found for this patient.");
      }
    } catch (error) {
      console.error('Error fetching patient info or records:', error);
      setPatientInfo(null);
      setResults(null);
      setError('Failed to load medical records. Please try again later.');
    } finally {
        setIsLoading(false); // End loading regardless of success or failure
    }
  };

  // loadData is now primarily for handling search queries on existing results
  const loadData = async (query: string = '') => {
      if (!selectedPatientId) return;

      // If query is empty, we rely on the full results already loaded by loadPatientInfo
      if (query === '' && results) { // Use existing results if no query and results are present
          console.log("Search query is empty, using already loaded results.");
          // Potentially re-filter results based on category if needed, but loadPatientInfo fetches all.
          return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Only perform API search if there's a non-empty query
        const data = await searchMedicalRecords(selectedPatientId, query);
        setResults(data); // Update results state with search results
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to perform search. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };


  useEffect(() => {
    loadPatients();
  }, []); // Load patients only once on mount

  // Effect for patient selection
  useEffect(() => {
    if (selectedPatientId) {
      console.log("Patient selected:", selectedPatientId);
      // Reset all related states immediately on new patient selection
      setPatientInfo(null);
      setResults(null);
      setChatMessages([]);
      setSearchQuery('');
      setSelectedCategory(null);
      setError(null); // Clear any previous errors

      // Load patient info and initial records for the selected patient
      loadPatientInfo(selectedPatientId);

    } else {
      // Reset states when no patient is selected
      setPatientInfo(null);
      setResults(null);
      setChatMessages([]);
      setSearchQuery('');
      setSelectedCategory(null);
      setError(null);
      // Do not clear patients list
    }
  }, [selectedPatientId]); // Effect runs when selectedPatientId changes


  // Effect to clear chat messages and potentially other states if results change (e.g. after search)
  // This might be too aggressive. Consider if you want the chat history to persist through searches.
  // Removing this effect for now, chat state is reset on patient change.
  // useEffect(() => {
  //    setChatMessages([]); // Clear chat messages when results (medical records) change
  // }, [results]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery); // Use loadData for actual search query
  };

  const resetSearch = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    // Reload initial data for the current patient if one is selected
    if (selectedPatientId) {
       loadPatientInfo(selectedPatientId); // Re-run loadPatientInfo to get all records again
    } else {
       // If no patient selected, nothing to reset for search results
       setResults(null); // Ensure results is null
       setError(null); // Clear potential error message related to no records
    }
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    // The useEffect for selectedPatientId will handle loading data and resetting other states
  };

  const getCategories = () => {
    if (!results?.results) return [];

    const categoriesWithContent = new Map<string, boolean>();

    // Iterate through each record's structured data to find categories
    results.results.forEach(record => {
      const data = record.document.structData;

      // Check relevant sections for categories
      if (data.DiagnosticReport?.category) {
        data.DiagnosticReport.category.forEach((cat: any) => {
          if (cat.text) categoriesWithContent.set(getCategoryLabel(cat.text), true);
          if (cat.coding) {
            cat.coding.forEach((code: any) => {
              if (code.code) categoriesWithContent.set(getCategoryLabel(code.code), true);
            });
          }
        });
      }

      if (data.Observation?.category) {
        data.Observation.category.forEach((cat: any) => {
          if (cat.coding) {
            cat.coding.forEach((code: any) => {
              if (code.code) categoriesWithContent.set(getCategoryLabel(code.code), true);
            });
          }
        });
      }

      if (data.Condition?.category) {
        data.Condition.category.forEach((cat: any) => {
          if (cat.text) categoriesWithContent.set(getCategoryLabel(cat.text), true);
        });
      }
       // Add other FHIR resource types if they have categories you want to filter by
       // Example: if (data.Procedure?.category) { ... }
    });

    return Array.from(categoriesWithContent.keys()).sort();
  };

  // Prepare FHIR data string for sidebars
  // Ensure results is not null before stringifying
  const fhirDataString = results ? JSON.stringify(results, null, 2) : null;


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Patient Selector */}
      {/* Container for the fixed PatientSelector (if it's fixed) */}
      {/* If PatientSelector is NOT fixed, this container div is just for layout */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
        <PatientSelector
          patients={patients}
          selectedPatientId={selectedPatientId}
          onSelectPatient={handlePatientSelect}
          isLoading={isLoadingPatients}
          // Pass error prop - Corrected comment placement
          error={error}
        />
      </div>


      {/* Patient Info Sidebar (Fixed) */}
      {/* This div creates space for the fixed sidebar on the left */}
       <PatientSidebar
          patientInfo={patientInfo}
          categories={getCategories()}
          selectedCategory={selectedCategory ? getCategoryLabel(selectedCategory) : null}
          setSelectedCategory={setSelectedCategory}
          fhirData={fhirDataString} // <-- PASANDO fhirData AL PatientSidebar
       />


      {/* Main Content */}
      <div className="flex-1 mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <Header resetSearch={resetSearch} patientId={selectedPatientId} />

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-center text-gray-800 mb-2">
            Registros Médicos del Paciente
         </h1>
          <p className="text-center text-gray-600 mb-6">
            Visualice todos los registros médicos del paciente organizados por Inteligencia Artificial. Use el buscador
            <br />para encontrar información específica.
          </p>

          {/* Display main error related to general loading/selection */}
          {error && !isLoadingPatients && !selectedPatientId && !isLoading && (
               <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
               </div>
          )}
           {/* Display specific error message related to patient/record loading for selected patient */}
           {error && selectedPatientId && !isLoading && (
               <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                <p className="font-medium">Error al cargar datos</p>
                <p className="text-sm">{error}</p>
               </div>
           )}


          {!selectedPatientId ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Seleccione un paciente para ver sus registros médicos</p>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
              />

              {/* Medical Records */}
              <MedicalRecords
                results={results}
                isLoading={isLoading}
                selectedCategory={selectedCategory}
              />
            </>
          )}
        </main>
      </div>

      {/* Chatbot Sidebar (Fixed) */}
       {/* This div creates space for the fixed sidebar on the right */}
       <div className="w-96 flex-shrink-0"></div> {/* Placeholder for fixed chat sidebar */}
      <ChatSidebar
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        isChatLoading={isChatLoading}
        setIsChatLoading={setIsChatLoading}
        resultsData={fhirDataString} // <-- Ya pasas la data aquí
        selectedPatientId={selectedPatientId}
      />
    </div>
  );
}

export default App;