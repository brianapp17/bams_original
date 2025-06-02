import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from '../firebase';
import type { Patient } from '../types'; // Assuming you have a Patient type defined in types.ts
import { ArrowLeft } from 'lucide-react';

const PatientListPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const patientsRef = ref(database, `doctors/${doctorUid}/patients`);
        setIsLoadingPatients(true);
        setPatientsError(null);

        const listener = onValue(patientsRef, (snapshot) => {
          const patientsData = snapshot.val();
          const loadedPatients: Patient[] = [];
          if (patientsData) {
            Object.keys(patientsData).forEach(key => {
              loadedPatients.push({ id: key, ...patientsData[key] } as Patient);
            });
          }
          setPatients(loadedPatients);
          setIsLoadingPatients(false);
        }, (error) => {
          console.error("Error fetching patients:", error);
          setPatientsError('Error al cargar la lista de pacientes.');
          setIsLoadingPatients(false);
        });
        return () => off(patientsRef, 'value', listener);
      } else {
        setPatients([]);
        setIsLoadingPatients(false);
        navigate('/login'); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribeAuth();
  }, [auth, database, navigate]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

   const filteredPatients = patients.filter(patient => {
    const query = searchQuery.toLowerCase();
    const fullName = `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.toLowerCase();
    const dui = patient.dui?.toLowerCase() || '';
    return fullName.includes(query) || dui.includes(query);
  });

  const handlePatientSelect = (patientId: string) => {
      navigate(`/expedientes/${patientId}`); // Corrected navigation path
  }

  if (isLoadingPatients && patients.length === 0 && !patientsError && auth.currentUser === null) {
      return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Verificando autenticación...</p></div>;
  }
  
  return (
    // MODIFIED: Adjusted padding for smaller screens
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
       <div className="mb-6 relative flex items-center justify-center">
  {/* Botón de regreso alineado a la izquierda de forma absoluta */}
  <button
    onClick={() => navigate(-1)}
    className="absolute left-0 inline-flex items-center px-3 py-2 md:px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
  >
    <ArrowLeft className="w-5 h-5 md:mr-2" />
    <span className="hidden md:inline">Volver</span>
  </button>

  {/* Título centrado completamente */}
  <h1 className="text-2xl sm:text-3xl font-bold text-teal-800">Expedientes</h1>
</div>


      <div className="max-w-8xl mx-auto">
        {/* MODIFIED: Adjusted text size and margin */}
        <p className="text-center text-gray-600 mb-6 text-sm sm:text-base">
          Aquí puede visualizar y buscar en los expedientes de sus pacientes registrados.
        </p>

        <div className="mb-6">
            <label htmlFor="patient-search" className="sr-only">Buscar paciente por DUI o nombre</label>
            <input
              type="text"
              id="patient-search"
              name="patient-search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar paciente por DUI, nombre o apellido..."
              // MODIFIED: Adjusted padding and text size
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-base sm:p-3 sm:text-lg"
            />
        </div>

        {isLoadingPatients && patients.length === 0 ? (
          <div className="text-center text-gray-600 text-base sm:text-lg">Cargando expedientes...</div>
        ) : patientsError  && !auth.currentUser ? (
           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
            <span className="block sm:inline">{patientsError}</span>
          </div>
        ) : filteredPatients.length === 0 ? (
           <div className="text-center text-gray-600 text-base sm:text-lg">No se encontraron expedientes{searchQuery && ` para "${searchQuery}"`}.</div>
        ) : (
          // Grid is already responsive: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredPatients.map(patient => (
              <div
                key={patient.id}
                // MODIFIED: Slightly smaller padding on cards for smallest screens
                className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200 cursor-pointer hover:bg-gray-100 transition duration-150 ease-in-out"
                onClick={() => handlePatientSelect(patient.id)}
              >
                {/* MODIFIED: Adjusted text sizes within cards */}
                <p className="text-md sm:text-lg font-semibold text-teal-700 mb-2">👤 {`${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}</p>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">🪪 DUI: {patient.dui}</p>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">🚻 Género: {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || 'N/A'}</p>
                <p className="text-xs sm:text-sm text-gray-600">🎂 Fecha de nacimiento: {patient.birthDate}</p>
              </div>
            ))}
          </div>
        )}
         {!isLoadingPatients && !patientsError && patients.length > 0 && filteredPatients.length > 0 && filteredPatients.length < 6 && (
            <div className="mt-8 md:mt-12 text-center text-gray-600 italic text-sm">
                <p>Utilice la barra de búsqueda para encontrar pacientes rápidamente por nombre o DUI.</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default PatientListPage;