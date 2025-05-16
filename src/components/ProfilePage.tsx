import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link for navigation
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, off, update } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { app } from '../firebase';

interface DoctorProfile {
  nombre: string;
  apellido: string;
  especialidad: string;
  telefono: string;
  direccion?: string;
  horario?: string;
  photoURL?: string;
}

const ProfilePage: React.FC = () => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [editableProfile, setEditableProfile] = useState<DoctorProfile | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const storage = getStorage(app);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const doctorProfileRef = ref(database, `doctors/${doctorUid}/perfil`);
        setIsLoading(true);
        setError(null);

        const listener = onValue(doctorProfileRef, (snapshot) => {
          const profileData = snapshot.val() as DoctorProfile;
          if (profileData) {
            setDoctorProfile(profileData);
            setEditableProfile(profileData);
          } else {
            setDoctorProfile(null);
            setEditableProfile({
                 nombre: '',
                 apellido: '',
                 especialidad: '',
                 telefono: '',
                 direccion: '',
                 horario: '',
                 photoURL: ''
            });
             setError('No se encontró un perfil existente. Por favor, complete sus datos.');
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching doctor profile:", error);
          setError('Error al cargar el perfil del doctor.');
          setIsLoading(false);
        });
        return () => off(doctorProfileRef, 'value', listener);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [auth, database, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (editableProfile) {
           setEditableProfile({
               ...editableProfile,
               [e.target.name]: e.target.value
           });
      }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setProfilePhotoFile(e.target.files[0]);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveSuccess(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditableProfile(doctorProfile);
    setProfilePhotoFile(null);
    setError(null);
    setSaveSuccess(null);
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

    if (!editableProfile.nombre || !editableProfile.apellido || !editableProfile.especialidad || !editableProfile.telefono) {
        setError('Nombre, Apellido, Especialidad y Teléfono son obligatorios.');
        setIsSaving(false);
        return;
    }

    const doctorUid = user.uid;
    const doctorProfileRef = ref(database, `doctors/${doctorUid}/perfil`);
    let newPhotoURL = editableProfile.photoURL || '';

    try {
      if (profilePhotoFile) {
        const imageRef = storageRef(storage, `doctor_profiles/${doctorUid}/${profilePhotoFile.name}`);
        await uploadBytes(imageRef, profilePhotoFile);
        newPhotoURL = await getDownloadURL(imageRef);
      }

      const updatedProfileData = {
          ...editableProfile,
          photoURL: newPhotoURL
      };

      await update(doctorProfileRef, updatedProfileData);
      setSaveSuccess('Perfil actualizado con éxito.');
      setIsEditing(false);
      setProfilePhotoFile(null);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(`Error al guardar el perfil: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

   const userEmail = auth.currentUser?.email || 'N/A';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        <div className="mb-8">
            <Link to="/dashboard" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Volver al Dashboard
            </Link>
        </div>
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-teal-800 mb-6 text-center">Configuración del Perfil</h1>

        {isLoading ? (
          <div className="text-center text-gray-600">Cargando perfil...</div>
        ) : error && !editableProfile ? (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
             </div>
        ) : editableProfile && (
          <form onSubmit={handleSaveChanges} className="space-y-6">
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

            <div className="flex flex-col items-center space-y-4">
                {editableProfile.photoURL ? (
                    <img 
                        src={editableProfile.photoURL} 
                        alt="Foto de perfil" 
                        className="w-32 h-32 rounded-full object-cover shadow-md"
                    />
                ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl shadow-md">
                        👤
                    </div>
                )}
                {isEditing && (
                    <div>
                        <label htmlFor="profilePhotoFile" className="block text-sm font-medium text-gray-700 mb-1">Cambiar foto de perfil (Opcional)</label>
                        <input 
                            type="file"
                            id="profilePhotoFile"
                            name="profilePhotoFile"
                            accept="image/*"
                            onChange={handlePhotoFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                        />
                         {profilePhotoFile && <p className="text-xs text-gray-500 mt-1">Archivo seleccionado: {profilePhotoFile.name}</p>}
                    </div>
                )}
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userEmail}
                  disabled
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
                />
              </div>
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
              <input
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