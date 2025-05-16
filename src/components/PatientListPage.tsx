import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from '../firebase';
import type { Patient } from '../types'; // Assuming you have a Patient type defined in types.ts

const PatientListPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  // Effect to fetch patients when the user is authenticated
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const patientsRef = ref(database, `doctors/${doctorUid}/patients`);

        setIsLoadingPatients(true);
        setPatientsError(null);

        // Using onValue for real-time data fetching
        const listener = onValue(patientsRef, (snapshot) => {
          const patientsData = snapshot.val();
          const loadedPatients: Patient[] = [];
          if (patientsData) {
            // Convert the object of patients into an array
            Object.keys(patientsData).forEach(key => {
              loadedPatients.push({
                id: key,
                ...patientsData[key]
              } as Patient); // Type assertion
            });
          }
          setPatients(loadedPatients);
          setIsLoadingPatients(false);
        }, (error) => {
          console.error("Error fetching patients:", error);
          setPatientsError('Error al cargar la lista de pacientes.');
          setIsLoadingPatients(false);
        });

        // Cleanup listener on component unmount or user logout
        return () => off(patientsRef, 'value', listener);

      } else {
        // User is not logged in, clear patients and show error
        setPatients([]);
        setIsLoadingPatients(false);
        setPatientsError('Debe iniciar sesión para ver la lista de pacientes.');
      }
    });

    // Cleanup auth state change listener
    return () => unsubscribeAuth();
  }, [auth, database]); // Rerun effect if auth or database instances change

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

   const filteredPatients = patients.filter(patient => {
    const query = searchQuery.toLowerCase();
    // Ensure nested name properties are accessed safely and handle potential undefineds
    const fullName = `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.toLowerCase();
    const dui = patient.dui?.toLowerCase() || '';

    return fullName.includes(query) || dui.includes(query);
  });

  const handlePatientSelect = (patientId: string) => {
      console.log("Selected patient with ID:", patientId);
      // Navigate to the main patient records page with the selected patient ID
      navigate(`/?patientId=${patientId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto">
        <h1 className="text-3xl font-bold text-teal-800 mb-6 text-center">Expedientes de Pacientes</h1>
        <p className="text-center text-gray-600 mb-8">
          Aquí puede visualizar y buscar en los expedientes de sus pacientes registrados.
        </p>

        {/* Search Bar */}
        <div className="mb-6">
            <label htmlFor="patient-search" className="sr-only">Buscar paciente por DUI o nombre</label>
            <input
              type="text"
              id="patient-search"
              name="patient-search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar paciente por DUI, nombre o apellido..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 text-lg"
            />
        </div>

        {/* Display loading, error, or patient list */}
        {isLoadingPatients ? (
          <div className="text-center text-gray-600 text-lg">Cargando expedientes...</div>
        ) : patientsError ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
            <span className="block sm:inline">{patientsError}</span>
          </div>
        ) : filteredPatients.length === 0 ? (
           <div className="text-center text-gray-600 text-lg">No se encontraron expedientes{searchQuery && ` para "${searchQuery}"`}.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
              <div
                key={patient.id}
                className="bg-white p-6 rounded-lg shadow-md border border-gray-200 cursor-pointer hover:bg-gray-100 transition duration-150 ease-in-out"
                onClick={() => handlePatientSelect(patient.id)}
              >
                <p className="text-lg font-semibold text-teal-700 mb-2">👤 {`${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}</p>
                <p className="text-sm text-gray-600 mb-1">🪪 DUI: {patient.dui}</p>
                <p className="text-sm text-gray-600 mb-1">🚻 Género: {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || 'N/A'}</p>
                <p className="text-sm text-gray-600">🎂 Fecha de nacimiento: {patient.birthDate}</p>
              </div>
            ))}
          </div>
        )}

         {/* Optional: Add some extra informational text or components if the list is short */}
         {!isLoadingPatients && !patientsError && patients.length > 0 && filteredPatients.length > 0 && filteredPatients.length < 6 && (
            <div className="mt-12 text-center text-gray-600 italic">
                <p>Utilice la barra de búsqueda para encontrar pacientes rápidamente por nombre o DUI.</p>
            </div>
         )}

      </div>
    </div>
  );
};

export default PatientListPage;