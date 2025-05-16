import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref as dbRef, set, onValue, off } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from '../firebase';

const DoctorProfilePage: React.FC = () => {
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    nombre: '',
    apellido: '',
    dui: '',
    telefono: '',
    especialidad: '',
    direccion: '',
    horario: '',
    photoURL: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const storage = getStorage(app);

  // Effect to fetch doctor profile when the user is authenticated
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const profileRef = dbRef(database, `doctors/${doctorUid}/perfil`);

        setIsLoading(true);
        setError(null);

        const listener = onValue(profileRef, (snapshot) => {
          const profileData = snapshot.val();
          if (profileData) {
            setDoctorProfile(profileData);
            // Set form data for editing when profile is loaded
            setFormData(profileData);
          } else {
            setDoctorProfile(null);
             // If no profile exists, maybe pre-fill email from auth
             setFormData({ ...formData, email: user.email || ''});
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching doctor profile:", error);
          setError('Error al cargar el perfil del doctor.');
          setIsLoading(false);
        });

        // Cleanup listener
        return () => off(profileRef, 'value', listener);

      } else {
        // User is not logged in
        setDoctorProfile(null);
        setFormData({
          nombre: '',
          apellido: '',
          dui: '',
          telefono: '',
          especialidad: '',
          direccion: '',
          horario: '',
          photoURL: ''
        });
        setIsLoading(false);
        setError('Debe iniciar sesión para ver su perfil.');
      }
    });

    // Cleanup auth state change listener
    return () => unsubscribeAuth();
  }, [auth, database]); // Rerun effect if auth or database instances change

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(null);
    // Reset form data to the currently loaded profile data
    if(doctorProfile) {
        setFormData(doctorProfile);
    } else {
         // If no profile exists, clear the form
        setFormData({
          nombre: '',
          apellido: '',
          dui: '',
          telefono: '',
          especialidad: '',
          direccion: '',
          horario: '',
          photoURL: ''
        });
    }
     setSelectedImage(null); // Clear selected image on cancel
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(true);

    const user = auth.currentUser;
    if (!user) {
      setSaveError('Debe iniciar sesión para guardar su perfil.');
      setIsSaving(false);
      return;
    }

    const doctorUid = user.uid;
    let newPhotoURL = formData.photoURL; // Start with existing photoURL

    try {
       // Upload new image if selected
      if (selectedImage) {
        const imageRef = storageRef(storage, `doctor_profiles/${doctorUid}/${selectedImage.name}`);
        const uploadResult = await uploadBytes(imageRef, selectedImage);
        newPhotoURL = await getDownloadURL(uploadResult.ref);
        console.log('Image uploaded. Download URL:', newPhotoURL);
      }

      // Data to be saved/updated in Realtime Database
      const dataToSave = {
        nombre: formData.nombre || '',
        apellido: formData.apellido || '',
        dui: formData.dui || '',
        telefono: formData.telefono || '',
        especialidad: formData.especialidad || '',
        direccion: formData.direccion || '',
        horario: formData.horario || '',
        photoURL: newPhotoURL || '', // Use the new URL or empty string
        // createdAt: doctorProfile?.createdAt || new Date().toISOString() // Keep original creation date
         email: user.email || '', // Store email from Auth for easy access
      };

      // Save/update data in Realtime Database
      const profileRef = dbRef(database, `doctors/${doctorUid}/perfil`);
      await set(profileRef, dataToSave);

      setSaveSuccess('Perfil actualizado con éxito!');
      setIsEditing(false);
      setSelectedImage(null); // Clear selected image after saving

    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveError(`Error al guardar el perfil: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Display loading state
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600 text-lg">Cargando perfil...</div>;
  }

  // Display error state
  if (error) {
     return (
         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
                <span className="block sm:inline">{error}</span>
             </div>
         </div>
     );
  }

  // If no profile exists and not editing, show a message or redirect to registration (or allow creating profile here)
   if (!doctorProfile && !isEditing) {
       return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-600 text-lg">
                    <p>No se encontró un perfil de doctor asociado a su cuenta.</p>
                    <button
                        onClick={handleEditClick}
                        className="mt-4 px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700"
                    >
                        Crear Perfil
                    </button>
                </div>
            </div>
       );
   }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-teal-800 mb-6 text-center">Configuración del Perfil</h1>

        {/* Display save error or success messages */}
        {saveError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{saveError}</span>
          </div>
        )}
        {saveSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{saveSuccess}</span>
          </div>
        )}

        {!isEditing ? (
          {/* View Mode */}
          <div>
            <div className="flex flex-col items-center mb-6">
              <img
                src={doctorProfile?.photoURL || '/placeholder-profile.png'} // Use a placeholder if no photoURL
                alt="Foto de perfil"
                className="w-32 h-32 rounded-full object-cover mb-4 border-2 border-teal-600"
              />
              <h2 className="text-xl font-semibold text-gray-800">{`${doctorProfile?.nombre || ''} ${doctorProfile?.apellido || ''}`}</h2>
              <p className="text-gray-600">{doctorProfile?.especialidad}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Correo electrónico:</p>
                <p className="text-gray-800">{auth.currentUser?.email || 'N/A'}</p>
              </div>
               <div>
                <p className="text-sm font-medium text-gray-700">DUI / Documento ID:</p>
                <p className="text-gray-800">{doctorProfile?.dui || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Teléfono:</p>
                <p className="text-gray-800">{doctorProfile?.telefono || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Dirección / Clínica:</p>
                <p className="text-gray-800">{doctorProfile?.direccion || 'N/A'}</p>
              </div>
               <div>
                <p className="text-sm font-medium text-gray-700">Horario disponible:</p>
                <p className="text-gray-800">{doctorProfile?.horario || 'N/A'}</p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleEditClick}
                className="px-6 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Editar Perfil
              </button>
            </div>
          </div>
        ) : (
          {/* Edit Mode */}
          <form onSubmit={handleSaveChanges} className="space-y-4">
             <div className="flex flex-col items-center mb-6">
                 <img
                    src={selectedImage ? URL.createObjectURL(selectedImage) : (formData.photoURL || '/placeholder-profile.png')}
                    alt="Foto de perfil preview"
                    className="w-32 h-32 rounded-full object-cover mb-4 border-2 border-teal-600"
                  />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-gray-600" />
             </div>

            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">Apellido</label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
             <div>
              <label htmlFor="dui" className="block text-sm font-medium text-gray-700">DUI / Documento ID</label>
              <input
                type="text"
                id="dui"
                name="dui"
                value={formData.dui}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700">Especialidad</label>
              <input
                type="text"
                id="especialidad"
                name="especialidad"
                value={formData.especialidad}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
             <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección / Clínica</label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
             <div>
              <label htmlFor="horario" className="block text-sm font-medium text-gray-700">Horario disponible</label>
              <input
                type="text"
                id="horario"
                name="horario"
                value={formData.horario}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
             {/* Email field - display only */}
             <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={auth.currentUser?.email || ''}
                  disabled // Email from auth is not editable directly here
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
                />
              </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={isSaving}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DoctorProfilePage;