import React, { useEffect, useState } from 'react';
import { getDatabase, ref, get, DataSnapshot, remove, update } from "firebase/database"; // Funciones de DB añadidas
import { app } from '../firebase';

// Interfaces (sin cambios respecto a la versión anterior)
interface PatientNamePart {
  family: string;
  given: string[];
  use?: string;
}

interface Patient {
  id: string;
  name: PatientNamePart[] | string;
}

interface DoctorProfile { // Interfaz separada para el perfil del doctor para el formulario de edición
  nombre: string;
  especialidad: string;
  telefono: string;
  // Añade otros campos del perfil que quieras editar
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  phone?: string;
  // Guardamos el perfil original para facilitar la edición
  profileData?: DoctorProfile; // Para los datos del formulario de edición
  patients?: Patient[];
}

const AdminDashboardPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editFormData, setEditFormData] = useState<DoctorProfile>({
    nombre: '',
    especialidad: '',
    telefono: '',
  });

  const database = getDatabase(app);

  const fetchDoctors = async () => {
    // ... (la función fetchDoctors es la misma que la versión anterior con la obtención del email)
    try {
      setLoading(true);
      setError(null);

      const doctorsRef = ref(database, 'doctors');
      const doctorsSnapshot: DataSnapshot = await get(doctorsRef);

      if (doctorsSnapshot.exists()) {
        const doctorsData = doctorsSnapshot.val();
        const loadedDoctorsPromises: Promise<Doctor | null>[] = [];

        for (const doctorId in doctorsData) {
          if (Object.hasOwnProperty.call(doctorsData, doctorId)) {
            const doctorInfo = doctorsData[doctorId];
            const profile = doctorInfo.perfil;

            const doctorPromise = async (): Promise<Doctor | null> => {
              let doctorEmail = 'Email no disponible';
              try {
                const userRef = ref(database, `users/${doctorId}/email`);
                const emailSnapshot: DataSnapshot = await get(userRef);
                if (emailSnapshot.exists()) {
                  doctorEmail = emailSnapshot.val();
                } else {
                  console.warn(`No se encontró email para el usuario/doctor con UID: ${doctorId}`);
                }
              } catch (emailError) {
                console.error(`Error al obtener email para el doctor ${doctorId}:`, emailError);
              }

              const patientsData = doctorInfo.patients;
              const doctorPatients: Patient[] = [];

              if (patientsData) {
                for (const patientId in patientsData) {
                  if (Object.hasOwnProperty.call(patientsData, patientId)) {
                    const patientDetails = patientsData[patientId];
                    if (typeof patientDetails === 'object' && patientDetails !== null && 'name' in patientDetails && Array.isArray(patientDetails.name)) {
                      doctorPatients.push({ id: patientId, name: patientDetails.name });
                    } else if (typeof patientDetails === 'object' && patientDetails !== null && typeof patientDetails.name === 'string') {
                      doctorPatients.push({ id: patientId, name: patientDetails.name });
                    } else {
                      console.warn(`Estructura de datos de paciente inesperada para paciente ${patientId} bajo doctor ${doctorId}`, patientDetails);
                      doctorPatients.push({ id: patientId, name: `Paciente ${patientId}` });
                    }
                  }
                }
              }

              if (profile) {
                return {
                  id: doctorId,
                  name: profile.nombre || 'N/A',
                  email: doctorEmail,
                  specialty: profile.especialidad || 'Sin asignar',
                  phone: profile.telefono || 'N/A',
                  profileData: { // Guardar los datos crudos del perfil para edición
                      nombre: profile.nombre || '',
                      especialidad: profile.especialidad || '',
                      telefono: profile.telefono || '',
                      // ...otros campos del perfil
                  },
                  patients: doctorPatients,
                };
              } else {
                console.warn(`No se encontró perfil para el doctor: ${doctorId}`);
                return {
                  id: doctorId,
                  name: `Doctor ${doctorId}`,
                  email: doctorEmail,
                  profileData: { nombre: '', especialidad: '', telefono: ''}, // Perfil vacío para edición si no existe
                  patients: doctorPatients,
                };
              }
            };
            loadedDoctorsPromises.push(doctorPromise());
          }
        }
        const resolvedDoctors = (await Promise.all(loadedDoctorsPromises)).filter(doc => doc !== null) as Doctor[];
        setDoctors(resolvedDoctors);
      } else {
        console.log("No se encontraron doctores en la base de datos.");
        setDoctors([]);
      }
    } catch (err) {
      console.error('Error al obtener doctores de Firebase:', err);
      setError(`Fallo al obtener doctores: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const formatPatientName = (nameData: PatientNamePart[] | string, patientId: string): string => {
    // ... (sin cambios)
    if (typeof nameData === 'string') {
      return nameData;
    }
    if (Array.isArray(nameData) && nameData.length > 0) {
      const officialName = nameData.find(n => n.use === 'official') || nameData[0];
      if (officialName && officialName.given && officialName.family) {
        return `${officialName.given.join(' ')} ${officialName.family}`;
      }
    }
    return `Paciente ${patientId}`;
  };

  // --- Handlers para CRUD ---
  const handleReadDoctor = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      // Por ahora, solo mostraremos en consola. Podrías abrir un modal con más detalles.
      console.log('Detalles del Doctor:', doctor);
      alert(`Detalles del Doctor:\nID: ${doctor.id}\nNombre: ${doctor.name}\nEmail: ${doctor.email}\nEspecialidad: ${doctor.specialty}\nTeléfono: ${doctor.phone}`);
    }
  };

  const handleOpenEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    // Usar profileData si existe, sino los campos principales como fallback para el formulario
    setEditFormData(doctor.profileData || {
        nombre: doctor.name,
        especialidad: doctor.specialty || '',
        telefono: doctor.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateDoctor = async () => {
    if (!editingDoctor || !editFormData) return;

    const doctorProfileRef = ref(database, `doctors/${editingDoctor.id}/perfil`);
    try {
      // Solo actualizamos los campos del perfil que están en editFormData
      // Asegúrate que editFormData contenga todos los campos que quieres actualizar en 'perfil'
      await update(doctorProfileRef, {
        nombre: editFormData.nombre,
        especialidad: editFormData.especialidad,
        telefono: editFormData.telefono,
        // ...otros campos que hayas añadido al formulario y a DoctorProfile
      });
      alert('Doctor actualizado exitosamente!');
      setIsEditModalOpen(false);
      setEditingDoctor(null);
      fetchDoctors(); // Recargar la lista de doctores
    } catch (error) {
      console.error('Error al actualizar doctor:', error);
      alert(`Error al actualizar doctor: ${(error as Error).message}`);
    }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al doctor ${doctorName} (ID: ${doctorId}) y todos sus datos asociados (perfil, pacientes)? Esta acción no se puede deshacer.`)) {
      try {
        // 1. Eliminar el nodo completo del doctor en /doctors/$doctorId
        const doctorDataRef = ref(database, `doctors/${doctorId}`);
        await remove(doctorDataRef);

        // 2. Eliminar la entrada del usuario en /users/$doctorId
        // ¡CUIDADO! Esto también elimina su capacidad de login si no se maneja en otro lado.
        // Si solo quieres quitarle el rol de doctor pero mantener su cuenta de usuario,
        // deberías actualizar el rol en lugar de eliminar el nodo completo.
        // Por ahora, vamos a eliminarlo como se pidió "eliminar todos los datos"
        const userDataRef = ref(database, `users/${doctorId}`);
        await remove(userDataRef);

        alert(`Doctor ${doctorName} eliminado exitosamente.`);
        fetchDoctors(); // Recargar la lista
      } catch (error) {
        console.error('Error al eliminar doctor:', error);
        alert(`Error al eliminar doctor: ${(error as Error).message}`);
      }
    }
  };


  if (loading) return <div className="text-center py-4">Cargando doctores...</div>;
  if (error) return <div className="text-center py-4 text-red-600">Error: {error}</div>;
  if (!loading && doctors.length === 0) return <div className="text-center py-4">No se encontraron doctores.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard - Lista de Doctores</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-md shadow-md">
          {/* ... (thead sin cambios) ... */}
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Nombre</th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Email</th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Especialidad</th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Teléfono</th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Pacientes</th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor, index) => (
              <tr key={doctor.id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b`}>
                <td className="py-3 px-4 text-gray-700">{doctor.name}</td>
                <td className="py-3 px-4 text-gray-700">{doctor.email}</td>
                <td className="py-3 px-4 text-gray-700">{doctor.specialty || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-700">{doctor.phone || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-700">
                  {doctor.patients && doctor.patients.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {doctor.patients.map(patient => (
                        <li key={patient.id}>{formatPatientName(patient.name, patient.id)}</li>
                      ))}
                    </ul>
                  ) : (
                    'No tiene pacientes'
                  )}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs mr-2 hover:bg-blue-600"
                    onClick={() => handleReadDoctor(doctor.id)}
                  >
                    Leer
                  </button>
                  <button
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-xs mr-2 hover:bg-yellow-600"
                    onClick={() => handleOpenEditModal(doctor)}
                  >
                    Editar
                  </button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                    onClick={() => handleDeleteDoctor(doctor.id, doctor.name)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición (muy básico) */}
      {isEditModalOpen && editingDoctor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Editar Doctor: {editingDoctor.name}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateDoctor(); }}>
              <div className="mb-4">
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre:</label>
                <input
                  type="text"
                  name="nombre"
                  id="nombre"
                  value={editFormData.nombre}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700">Especialidad:</label>
                <input
                  type="text"
                  name="especialidad"
                  id="especialidad"
                  value={editFormData.especialidad}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono:</label>
                <input
                  type="text"
                  name="telefono"
                  id="telefono"
                  value={editFormData.telefono}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              {/* Agrega más campos aquí si es necesario */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingDoctor(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;