import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off, update } from "firebase/database";
import { app } from '../firebase';
import { useNavigate } from 'react-router-dom';

// Define a type for the doctor profile data
interface DoctorProfile {
  nombre: string;
  apellido: string;
  especialidad: string;
  telefono: string;
  direccion?: string; // Optional field
  horario?: string; // Optional field
  // Add other fields as needed, like photoURL
}

const ProfilePage: React.FC = () => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [editableProfile, setEditableProfile] = useState<DoctorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  // Effect to fetch doctor profile when the user is authenticated
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const doctorProfileRef = ref(database, `doctors/${doctorUid}/perfil`);

        setIsLoading(true);
        setError(null);

        const listener = onValue(doctorProfileRef, (snapshot) => {
          const profileData = snapshot.val();
          if (profileData) {
            setDoctorProfile(profileData);
            setEditableProfile(profileData); // Initialize editable data with fetched data
          } else {
            // Handle case where no profile exists yet (e.g., new user)
            setDoctorProfile(null);
            setEditableProfile({
                 nombre: '',
                 apellido: '',
                 especialidad: '',
                 telefono: '',
                 direccion: '',
                 horario: '',
            }); // Initialize with empty fields for editing
             setError('No se encontró un perfil existente. Por favor, complete sus datos.');
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching doctor profile:", error);
          setError('Error al cargar el perfil del doctor.');
          setIsLoading(false);
        });

        // Cleanup listener on component unmount or user logout
        return () => off(doctorProfileRef, 'value', listener);

      } else {
        // User is not logged in, redirect to login
        navigate('/login');
      }
    });

    // Cleanup auth state change listener
    return () => unsubscribeAuth();
  }, [auth, database, navigate]); // Rerun effect if auth, database, or navigate change

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (editableProfile) {
           setEditableProfile({
               ...editableProfile,
               [e.target.name]: e.target.value
           });
      }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveSuccess(null); // Clear previous success message
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    // Reset editable data to the last saved profile data
    setEditableProfile(doctorProfile);
    setError(null); // Clear any validation errors from editing
     setSaveSuccess(null); // Clear previous success message
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editableProfile) return;

    setError(null);
    setSaveSuccess(null);
    setIsSaving(true);

    const user = auth.currentUser;
    if (!user) {
      setError('Debe iniciar sesión para guardar su perfil.');
      setIsSaving(false);
      return;
    }

     // Basic validation (add more as needed)
    if (!editableProfile.nombre || !editableProfile.apellido || !editableProfile.especialidad || !editableProfile.telefono) {
        setError('Nombre, Apellido, Especialidad y Teléfono son obligatorios.');
        setIsSaving(false);
        return;
    }
     // Add DUI validation if needed


    const doctorUid = user.uid;
    const doctorProfileRef = ref(database, `doctors/${doctorUid}/perfil`);

    try {
      // Use update to merge changes, not overwrite the whole profile
      await update(doctorProfileRef, editableProfile);
      setSaveSuccess('Perfil actualizado con éxito.');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(`Error al guardar el perfil: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

   // Assuming email is read-only and comes from auth
   const userEmail = auth.currentUser?.email || 'N/A';
    // TODO: Add DUI field state and input handling if you decide to store it in /perfil
    // Currently, DUI is only stored during registration in the patient object.

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-teal-800 mb-6 text-center">Configuración del Perfil</h1>

        {isLoading ? (
          <div className="text-center text-gray-600">Cargando perfil...</div>
        ) : error && !editableProfile ? (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
             </div>
        ) : editableProfile && (
          <form onSubmit={handleSaveChanges} className="space-y-4">

             {/* Display save success/error messages */}
            {saveSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{saveSuccess}</span>
              </div>
            )}
             {error && isEditing && (
                 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                 </div>
             )}

            {/* Read-only fields */}
             <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userEmail}
                  disabled // Email from auth is not directly editable here
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
                />
              </div>
             {/* TODO: Add read-only DUI from patient registration if needed, or make it editable */}

            {/* Editable fields */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={editableProfile.nombre}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">Apellido</label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={editableProfile.apellido}
                onChange={handleInputChange}
                disabled={!isEditing}
                 required
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
             <div>
              <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700">Especialidad</label>
              <input // Could be a select dropdown for predefined specialties
                type="text"
                id="especialidad"
                name="especialidad"
                value={editableProfile.especialidad}
                onChange={handleInputChange}
                disabled={!isEditing}
                 required
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
             <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={editableProfile.telefono}
                onChange={handleInputChange}
                disabled={!isEditing}
                 required
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
             <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección / Clínica (Opcional)</label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={editableProfile.direccion || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
             <div>
              <label htmlFor="horario" className="block text-sm font-medium text-gray-700">Horario disponible (Opcional)</label>
              <input
                type="text"
                id="horario"
                name="horario"
                value={editableProfile.horario || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4">
              {isEditing ? (
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelClick}
                     disabled={isSaving}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="w-full px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Editar Perfil
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;