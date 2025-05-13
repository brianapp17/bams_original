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
    try {
      const data = await searchMedicalRecords(patientId);
      if (data.results) {
        let patientFound = false;
        for (const record of data.results) {
            const patientRecord = record.document.structData;
            if (patientRecord && patientRecord.Patient) {
                const patient = patientRecord.Patient;
                setPatientInfo({
                    name: `${patient.name[0].given.join(' ')} ${patient.name[0].family}`,
                    id: patient.id,
                    birthDate: patient.birthDate,
                    gender: patient.gender,
                    identifier: patient.identifier[0].value,
                });
                patientFound = true;
                break;
            }
        }
        if (!patientFound) { // if the patient is not found we throw an error
          throw new Error("Patient data not found.");
        } 
      }
    } catch (error) {
      console.error('Error fetching patient info:', error);
      setError('Failed to load patient information. Please try again later.');
    }
  };

  const loadData = async (query: string = '') => {
    if (!selectedPatientId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchMedicalRecords(selectedPatientId, query);
      setResults(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load medical records. Please try again later.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientInfo(selectedPatientId);
      loadData();
    } else {
      setPatientInfo(null);
      setResults(null);
    }
  }, [selectedPatientId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const resetSearch = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    loadData();
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setChatMessages([]);
    setSearchQuery('');
    setSelectedCategory(null);
    setError(null);
  };

  const getCategories = () => {
    if (!results?.results) return [];
    
    const categoriesWithContent = new Map<string, boolean>();
    
    results.results.forEach(result => {
      const data = result.document.structData;
      
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
    });
    
    return Array.from(categoriesWithContent.keys()).sort();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Patient Selector */}
      <PatientSelector
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={handlePatientSelect}
        isLoading={isLoadingPatients}
        error={error}
      />

      {/* Patient Info Sidebar */}
      <PatientSidebar 
        patientInfo={patientInfo}
        categories={getCategories()}
        selectedCategory={selectedCategory ? getCategoryLabel(selectedCategory) : null}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 mr-96">
        {/* Header */}
        <Header resetSearch={resetSearch} patientId={selectedPatientId} />

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-center text-gray-800 mb-2">
            Registros Médicos del Paciente
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Visualice todos los registros médicos del paciente organizados por Inteligencia Artificial. Use el buscador
            <br />para encontrar información específica.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
              <p className="font-medium">Error</p>
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

      {/* Chatbot Sidebar */}
      <ChatSidebar 
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        isChatLoading={isChatLoading}
        setIsChatLoading={setIsChatLoading}
        resultsData={results ? JSON.stringify(results) : null}
        selectedPatientId={selectedPatientId}
      />
    </div>
  );
}

export default App;