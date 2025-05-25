import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, push, set, onValue, off } from "firebase/database";
import { app } from '../firebase';
import type { Patient } from '../types'; // Assuming you have a Patient type defined in types.ts

const NewConsultationPage: React.FC = () => {
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatientFormData, setNewPatientFormData] = useState({
    nombre: '',
    apellido: '',
    gender: '',
    birthDate: '',
    dui: ''
  });
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [createPatientError, setCreatePatientError] = useState<string | null>(null);
  const [createPatientSuccess, setCreatePatientSuccess] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true); // Set to true initially
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // For initial auth check

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthLoading(false); // Auth check is done
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
        navigate('/login'); // Redirect if not authenticated
      }
    });
    return () => unsubscribeAuth();
  }, [auth, database, navigate]);

  const handleNewPatientClick = () => {
    setShowNewPatientForm(true);
    setNewPatientFormData({ nombre: '', apellido: '', gender: '', birthDate: '', dui: '' });
    setCreatePatientError(null);
    setCreatePatientSuccess(null);
    setIsCreatingPatient(false);
  };

  const handleNewPatientFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewPatientFormData({ ...newPatientFormData, [e.target.name]: e.target.value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const validateDUI = (dui: string): boolean => {
    const duiRegex = /^\d{8}-\d{1}$/;
    return duiRegex.test(dui);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    // Auth check already done by top-level useEffect, but good for direct action
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }
    setCreatePatientError(null);
    setCreatePatientSuccess(null);
    setIsCreatingPatient(true);
    const doctorUid = user.uid;

    if (!newPatientFormData.nombre || !newPatientFormData.apellido || !newPatientFormData.gender || !newPatientFormData.birthDate || !newPatientFormData.dui) {
      setCreatePatientError('Por favor, complete todos los campos obligatorios.');
      setIsCreatingPatient(false);
      return;
    }

    if (!validateDUI(newPatientFormData.dui)) {
        setCreatePatientError('El formato del DUI no es válido (debe ser 00000000-0).');
        setIsCreatingPatient(false);
        return;
    }

    try {
      const doctorPatientsRef = ref(database, `doctors/${doctorUid}/patients`);
      const newPatientRef = push(doctorPatientsRef);
      const newPatientId = newPatientRef.key;

      if (!newPatientId) {
           setCreatePatientError('Error al generar ID de paciente.');
           setIsCreatingPatient(false);
           return;
      }

      const patientData = {
        id: newPatientId,
        resourceType: "Patient",
        name: [{ family: newPatientFormData.apellido, given: [newPatientFormData.nombre], use: "official" }],
        gender: newPatientFormData.gender,
        birthDate: newPatientFormData.birthDate,
        dui: newPatientFormData.dui,
        identifier: [{ system: "urn:elsalvador:dui", value: newPatientFormData.dui }],
        createdAt: new Date().toISOString()
      };

      await set(newPatientRef, patientData);
      setCreatePatientSuccess('Paciente registrado con éxito.');
      setIsCreatingPatient(false);
      setNewPatientFormData({ nombre: '', apellido: '', gender: '', birthDate: '', dui: '' });
      setShowNewPatientForm(false);
    } catch (error: any) {
      console.error('Error creating patient:', error);
      setCreatePatientError(`Error al registrar paciente: ${error.message}`);
      setIsCreatingPatient(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const query = searchQuery.toLowerCase();
    const fullName = `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.toLowerCase();
    const dui = patient.dui?.toLowerCase() || '';
    return fullName.includes(query) || dui.includes(query);
  });

  const handlePatientSelect = (patientId: string) => {
      navigate(`/expedientes/${patientId}`);
  }

  // Render a loading state or nothing while initial auth check is happening
  if (isAuthLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Verificando autenticación...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8">
       <div className="mb-8 self-start">
        <Link to="/dashboard" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Volver al Dashboard
        </Link>
      </div>
      <div className="max-w-8xl mx-auto flex w-full space-x-8 flex-grow">
        {/* Left Section: Nuevo Paciente / Form */}
        <div className="flex-1 bg-white p-8 rounded-lg shadow-md flex flex-col items-center justify-center">
          {!showNewPatientForm ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Nuevo Paciente</h2>
              <p className="text-gray-600 mb-6">Iniciar una consulta con un paciente que no está registrado.</p>
              <button
                onClick={handleNewPatientClick}
                className="block w-full bg-teal-600 text-white py-3 px-6 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 text-lg font-semibold"
              >
                Crear Nuevo Paciente
              </button>
                {createPatientError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                    <span className="block sm:inline">{createPatientError}</span>
                  </div>
                )}
                {createPatientSuccess && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4" role="alert">
                    <span className="block sm:inline">{createPatientSuccess}</span>
                  </div>
                )}
            </div>
          ) : (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Registrar Nuevo Paciente</h2>
              {createPatientError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <span className="block sm:inline">{createPatientError}</span>
                </div>
              )}
              {createPatientSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <span className="block sm:inline">{createPatientSuccess}</span>
                </div>
              )}
              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" id="nombre" name="nombre" value={newPatientFormData.nombre} onChange={handleNewPatientFormChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">Apellido</label>
                  <input type="text" id="apellido" name="apellido" value={newPatientFormData.apellido} onChange={handleNewPatientFormChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
                </div>
                 <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Género</label>
                  <select id="gender" name="gender" value={newPatientFormData.gender} onChange={handleNewPatientFormChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">Seleccionar...</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">Fecha de nacimiento</label>
                  <input type="date" id="birthDate" name="birthDate" value={newPatientFormData.birthDate} onChange={handleNewPatientFormChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
                </div>
                 <div>
                  <label htmlFor="dui" className="block text-sm font-medium text-gray-700">Número de Identificación (DUI)</label>
                  <input type="text" id="dui" name="dui" value={newPatientFormData.dui} onChange={handleNewPatientFormChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Ej: 12345678-9"/>
                </div>
                <button type="submit" disabled={isCreatingPatient} className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-semibold disabled:opacity-50">
                  {isCreatingPatient ? 'Registrando...' : 'Registrar y Continuar'}
                </button>
              </form>
            </div>
          )}
        </div>
        {/* Right Section: Paciente Registrado / List */}
        <div className="flex-1 bg-white p-8 rounded-lg shadow-md flex flex-col">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Seleccionar Paciente Registrado</h2>
          <div className="mb-4">
              <label htmlFor="patient-search" className="sr-only">Buscar paciente por DUI o nombre</label>
              <input type="text" id="patient-search" name="patient-search" value={searchQuery} onChange={handleSearchChange} placeholder="Buscar paciente por DUI, nombre o apellido..." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
          </div>
          {isLoadingPatients ? (
            <div className="text-center text-gray-600">Cargando pacientes...</div>
          ) : patientsError && !auth.currentUser ? (
             // This will likely not be hit often if top-level auth check redirects
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{patientsError}</span>
            </div>
          ) : filteredPatients.length === 0 ? (
             <div className="text-center text-gray-600">No se encontraron pacientes{searchQuery && ` para "${searchQuery}"`}.</div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              {filteredPatients.map(patient => (
                <div key={patient.id} className="p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-100" onClick={() => handlePatientSelect(patient.id)}>
                  <p className="font-semibold text-gray-800">👤 {`${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}</p>
                  <p className="text-sm text-gray-600">🪪 DUI: {patient.dui}</p>
                  <p className="text-sm text-gray-600">🚻 Género: {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || 'N/A'}</p>
                  <p className="text-sm text-gray-600">🎂 Fecha de nacimiento: {patient.birthDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConsultationPage;