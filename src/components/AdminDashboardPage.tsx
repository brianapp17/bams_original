import React, { useEffect, useState } from 'react';
import {
  getDatabase, ref, get, DataSnapshot, remove, update, set as dbSet // 'set' renombrado a 'dbSet'
} from "firebase/database";
import {
  getAuth,
  createUserWithEmailAndPassword, // Para registro email/pass
  GoogleAuthProvider,           // Para credencial de Google
  signInWithCredential,         // Para GSI
  UserCredential,               // Tipo para GSI
  signOut                       // Para cerrar sesión
} from "firebase/auth";
import { app } from '../firebase';
import { useNavigate } from 'react-router-dom';

// Declarar google para GSI
declare const google: any;

interface PatientNamePart {
  family: string;
  given: string[];
  use?: string;
}
interface Patient {
  id: string;
  name: PatientNamePart[] | string;
}

// Actualizada para incluir todos los campos del perfil de un doctor
interface DoctorProfile {
  nombre: string;
  apellido: string;
  especialidad: string;
  telefono: string;
  photoURL?: string;
  createdAt?: string;
  clinica?: string;
  direccion?: string;
  horario?: string;
  // Añade cualquier otro campo que forme parte del perfil de un doctor
}

interface Doctor {
  id: string;
  name: string; // Será nombre + apellido
  email: string;
  specialty?: string;
  phone?: string;
  profileData: DoctorProfile; // Aseguramos que profileData siempre exista
  patients?: Patient[];
}

const YOUR_GOOGLE_CLIENT_ID = '127465468754-kpsk6hlcj9cubic8be05o204nhubpgdk.apps.googleusercontent.com'; // ¡¡¡REEMPLAZA ESTO CON TU CLIENT ID!!!

const AdminDashboardPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [gsiLoading, setGsiLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editFormData, setEditFormData] = useState<DoctorProfile>({
    nombre: '', apellido: '', especialidad: '', telefono: '', photoURL: '', createdAt: '', clinica: '', direccion: '', horario: '',
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [registerFormData, setRegisterFormData] = useState({
    email: '', password: '', confirmPassword: '', nombre: '', apellido: '', especialidad: '', telefono: '',
  });

  const [isReadModalOpen, setIsReadModalOpen] = useState<boolean>(false);
  const [readingDoctor, setReadingDoctor] = useState<Doctor | null>(null);

  const database = getDatabase(app);
  const auth = getAuth(app);
  const navigate = useNavigate();

  const clearMessages = () => { setError(null); setSuccessMessage(null); };
  const showTemporarySuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const showTemporaryError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const doctorsRef = ref(database, 'doctors');
      const doctorsSnapshot: DataSnapshot = await get(doctorsRef);
      if (doctorsSnapshot.exists()) {
        const doctorsData = doctorsSnapshot.val();
        const loadedDoctorsPromises: Promise<Doctor | null>[] = [];
        for (const doctorId in doctorsData) {
          if (Object.hasOwnProperty.call(doctorsData, doctorId)) {
            const doctorInfo = doctorsData[doctorId];
            const profile: DoctorProfile | undefined = doctorInfo.perfil;
            const doctorPromise = async (): Promise<Doctor | null> => {
              let doctorEmail = 'No disponible';
              try {
                const userRef = ref(database, `users/${doctorId}/email`);
                const emailSnapshot: DataSnapshot = await get(userRef);
                if (emailSnapshot.exists()) doctorEmail = emailSnapshot.val();
              } catch (emailError) { console.error(`Error email doctor ${doctorId}:`, emailError); }

              const patientsData = doctorInfo.patients;
              const doctorPatients: Patient[] = [];
              if (patientsData) {
                for (const patientId in patientsData) {
                  if (Object.hasOwnProperty.call(patientsData, patientId)) {
                    const patientDetails = patientsData[patientId];
                    if (typeof patientDetails === 'object' && patientDetails !== null && 'name' in patientDetails && Array.isArray(patientDetails.name)) {
                      doctorPatients.push({ id: patientId, name: patientDetails.name });
                    } else { doctorPatients.push({ id: patientId, name: `Paciente ${patientId}` }); }
                  }
                }
              }
              const defaultProfile: DoctorProfile = {
                nombre: '', apellido: '', especialidad: '', telefono: '', photoURL: '', createdAt: new Date().toISOString(), clinica: '', direccion: '', horario: '',
              };
              const currentProfile = profile || defaultProfile;
              return {
                id: doctorId,
                name: `${currentProfile.nombre || ''} ${currentProfile.apellido || ''}`.trim() || `Doctor ${doctorId}`,
                email: doctorEmail,
                specialty: currentProfile.especialidad || 'Sin asignar',
                phone: currentProfile.telefono || 'N/A',
                profileData: currentProfile,
                patients: doctorPatients,
              };
            };
            loadedDoctorsPromises.push(doctorPromise());
          }
        }
        const resolvedDoctors = (await Promise.all(loadedDoctorsPromises)).filter(doc => doc !== null) as Doctor[];
        setDoctors(resolvedDoctors.sort((a,b) => a.name.localeCompare(b.name)));
      } else { setDoctors([]); }
    } catch (err) { showTemporaryError(`Fallo al obtener doctores: ${(err as Error).message}`);
    } finally { setLoading(false); }
  };

  const handleCredentialResponse = async (response: any) => {
    clearMessages();
    console.log("Admin GSI: Google credential response received:", response);
    if (response.credential) {
      setGsiLoading(true);
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        const result: UserCredential = await signInWithCredential(auth, credential);
        const user = result.user; // Este es el usuario que seleccionó en el prompt de Google
        const uid = user.uid;
        const nowISO = new Date().toISOString();
        console.log("Admin GSI: Firebase sign-in/association with Google user successful.", user);

        const userRefDb = ref(database, `users/${uid}`);
        const doctorProfileRefDb = ref(database, `doctors/${uid}/perfil`);
        const userSnapshot = await get(userRefDb);

        if (!userSnapshot.exists()) {
          console.log('Admin GSI: New user via Google. Creating profile in DB...');
          const userData = {
            email: user.email, role: 'doctor', createdAt: nowISO, displayName: user.displayName || '',
          };
          const nameParts = user.displayName?.split(' ') || [];
          const doctorProfileData: DoctorProfile = {
            nombre: nameParts[0] || "Doctor",
            apellido: nameParts.slice(1).join(' ') || "Google",
            especialidad: "General",
            telefono: user.phoneNumber || "",
            photoURL: user.photoURL || "",
            createdAt: nowISO,
            clinica: '', direccion: '', horario: '',
          };
          // Como auth.currentUser es ahora este nuevo usuario, las reglas deben permitirle
          // escribir su propio perfil inicial con rol 'doctor'.
          await dbSet(userRefDb, userData);
          await dbSet(doctorProfileRefDb, doctorProfileData);
          showTemporarySuccess(`Nuevo doctor ${user.displayName} registrado/asociado con Google.`);
          fetchDoctors();
        } else {
          showTemporarySuccess(`El usuario ${user.displayName} (Google) ya existe en el sistema.`);
          const doctorSnapshot = await get(doctorProfileRefDb);
          if(!doctorSnapshot.exists()){
            const nameParts = user.displayName?.split(' ') || [];
            const doctorProfileData: DoctorProfile = {
              nombre: nameParts[0] || "Doctor",
              apellido: nameParts.slice(1).join(' ') || "Google",
              especialidad: "General",
              telefono: user.phoneNumber || "",
              photoURL: user.photoURL || "",
              createdAt: nowISO,
              clinica: '', direccion: '', horario: '',
            };
            await dbSet(doctorProfileRefDb, doctorProfileData); // Permite al usuario (ahora logueado) crear su perfil de doctor si no existe
            showTemporarySuccess(`Perfil de doctor creado para ${user.displayName} existente.`);
            fetchDoctors();
          }
        }
      } catch (error: any) {
        console.error("Admin GSI: Error:", error);
        if (error.code === 'auth/account-exists-with-different-credential') {
          showTemporaryError('Cuenta existe con otro método de login.');
        } else {
          showTemporaryError(`Error con Google: ${error.message}`);
        }
      } finally {
        setGsiLoading(false);
      }
    } else {
      console.error("Admin GSI: Google credential response did not contain a credential.", response);
      showTemporaryError("Error al recibir credencial de Google.");
      setGsiLoading(false);
    }
  };

  useEffect(() => {
    const initGoogleOneTapForAdmin = () => {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        try {
          google.accounts.id.initialize({
            client_id: YOUR_GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          console.log("Google Identity Services inicializado en Admin Dashboard.");
        } catch(e) { console.error("Error inicializando Google ID Services en Admin: ", e); }
      } else {
        console.warn("Google Identity Services script not ready, retrying init for admin...");
        setTimeout(initGoogleOneTapForAdmin, 700); // Aumentar un poco el reintento
      }
    };
    initGoogleOneTapForAdmin();
    fetchDoctors();
  }, []);

  const triggerGoogleSignIn = () => {
    clearMessages();
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      setGsiLoading(true);
      try {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            if(gsiLoading) setGsiLoading(false); // Solo si aún estaba en loading por esta acción
            const reason = notification.getNotDisplayedReason() || notification.getSkippedReason();
            console.warn("Google prompt no se mostró o fue omitido:", reason);
            if (reason === "suppressed_by_user" || reason === "user_cancel" || reason === "tap_outside") {
                 showTemporaryError("El proceso de Google fue cancelado por el usuario.");
            } else if (reason !== "credential_returned" && reason !== "display_moment") { // Evitar error si ya se procesó
                 showTemporaryError("No se pudo mostrar el diálogo de Google. Verifique pop-ups/cookies.");
            }
          }
        });
      } catch(e) {
        console.error("Error al llamar a google.accounts.id.prompt: ", e);
        setGsiLoading(false);
        showTemporaryError("Error al intentar iniciar el proceso de Google.");
      }
    } else {
      showTemporaryError("Servicio de Google no disponible. Intente recargar la página.");
      setGsiLoading(false);
    }
  };

  const handleSignOut = async () => {
    clearMessages();
    setActionLoading(true);
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) { showTemporaryError(`Error al cerrar sesión: ${(error as Error).message}`);
    } finally { setActionLoading(false); }
  };
  
  const formatPatientName = (nameData: PatientNamePart[] | string, patientId: string): string => {
    if (typeof nameData === 'string') return nameData;
    if (Array.isArray(nameData) && nameData.length > 0) {
      const officialName = nameData.find(n => n.use === 'official') || nameData[0];
      if (officialName && officialName.given && officialName.family) {
        return `${officialName.given.join(' ')} ${officialName.family}`;
      }
    }
    return `Paciente ${patientId}`;
  };

  const handleOpenReadModal = (doctor: Doctor) => { setReadingDoctor(doctor); setIsReadModalOpen(true); };
  const handleOpenEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setEditFormData(JSON.parse(JSON.stringify(doctor.profileData)));
    setIsEditModalOpen(true);
  };
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateDoctor = async () => {
    if (!editingDoctor) return;
    setActionLoading(true);
    clearMessages();
    const doctorProfileRef = ref(database, `doctors/${editingDoctor.id}/perfil`);
    try {
      const updatedProfileData = { ...editFormData };
      if (!updatedProfileData.createdAt) {
        updatedProfileData.createdAt = editingDoctor.profileData.createdAt || new Date().toISOString();
      }
      await update(doctorProfileRef, updatedProfileData);
      showTemporarySuccess('Doctor actualizado exitosamente!');
      setIsEditModalOpen(false);
      setEditingDoctor(null);
      fetchDoctors();
    } catch (error) { showTemporaryError(`Error al actualizar doctor: ${(error as Error).message}`);
    } finally { setActionLoading(false); }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al doctor ${doctorName}? Se eliminarán sus datos de la aplicación (perfil, pacientes) y su entrada en la lista de usuarios. La cuenta de autenticación de Firebase (si existe) seguirá existiendo y deberá ser manejada manualmente.`)) {
      setActionLoading(true);
      clearMessages();
      try {
        await remove(ref(database, `doctors/${doctorId}`));
        await remove(ref(database, `users/${doctorId}`));
        showTemporarySuccess(`Datos del doctor ${doctorName} eliminados. Gestione la cuenta de Auth en Firebase si es necesario.`);
        fetchDoctors();
      } catch (error) { showTemporaryError(`Error al eliminar doctor: ${(error as Error).message}`);
      } finally { setActionLoading(false); }
    }
  };

  const handleRegisterFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterDoctorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();
    setActionLoading(true);

    const adminUIDBeforeCreation = auth.currentUser?.uid; // Captura el UID del admin antes de crear
    console.log('ADMIN DASHBOARD: UID del admin (antes de crear user):', adminUIDBeforeCreation);


    const { email, password, confirmPassword, nombre, apellido, especialidad, telefono } = registerFormData;
    if (!email || !password || !nombre || !apellido) {
      showTemporaryError('Email, contraseña, nombre y apellido son requeridos.');
      setActionLoading(false); return;
    }
    if (password !== confirmPassword) {
      showTemporaryError('Las contraseñas no coinciden.');
      setActionLoading(false); return;
    }
    if (password.length < 6) {
      showTemporaryError('La contraseña debe tener al menos 6 caracteres.');
      setActionLoading(false); return;
    }

    try {
      // Esta llamada CAMBIA el auth.currentUser al nuevo usuario
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUid = userCredential.user.uid;
      const newUserEmail = userCredential.user.email;
      const nowISO = new Date().toISOString();

      console.log('Nuevo usuario Auth creado y AHORA ES auth.currentUser:', auth.currentUser?.uid);

      // Ahora, el auth.currentUser es el nuevo usuario. Las reglas deben permitirle
      // escribir su propia data inicial con rol "doctor".
      await dbSet(ref(database, `users/${newUid}`), {
        email: newUserEmail,
        role: 'doctor',
        createdAt: nowISO,
      });
      await dbSet(ref(database, `doctors/${newUid}/perfil`), {
        nombre: nombre, apellido: apellido, especialidad: especialidad || 'General',
        telefono: telefono || '', photoURL: '', createdAt: nowISO,
        clinica: '', direccion: '', horario: '',
      });

      showTemporarySuccess(`Doctor ${nombre} ${apellido} registrado. (Logueado como nuevo doctor temporalmente)`);
      fetchDoctors();
      setIsRegisterModalOpen(false);
      setRegisterFormData({ email: '', password: '', confirmPassword: '', nombre: '', apellido: '', especialidad: '', telefono: '' });

      // Aquí es donde la UX se complica. El admin ahora está logueado como el nuevo doctor.
      // Para continuar como admin, necesitaría volver a loguearse.
      // Una opción es desloguear al nuevo usuario y mostrar un mensaje al admin.
      if (auth.currentUser?.uid === newUid) {
        await signOut(auth); // Desloguea al nuevo doctor
        showTemporarySuccess(`Doctor ${nombre} ${apellido} registrado. Por favor, inicie sesión nuevamente como administrador si desea continuar gestionando.`);
        // navigate('/'); // Opcional: redirigir al login
      }


    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') showTemporaryError('Este correo ya está en uso.');
      else if (authError.code === 'auth/weak-password') showTemporaryError('Contraseña débil.');
      else if (authError.code === 'auth/invalid-email') showTemporaryError('Correo no válido.');
      else if (authError.message?.includes("permission_denied")) {
            showTemporaryError("Permiso denegado al guardar datos. Revise las reglas de la base de datos para la creación inicial por el nuevo usuario.");
      } else showTemporaryError(`Error al registrar: ${authError.message}`);
    } finally {
      setActionLoading(false);
    }
  };


  if (loading && doctors.length === 0) return <div className="text-center py-4">Cargando doctores...</div>;
  if (error && doctors.length === 0 && !loading) return <div className="text-center py-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-teal-700">Admin Dashboard</h1>
        <button
          onClick={handleSignOut}
          disabled={actionLoading || gsiLoading}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {(actionLoading || gsiLoading) ? 'Procesando...' : 'Cerrar Sesión'}
        </button>
      </div>
      
      {error && <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
      {successMessage && <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">{successMessage}</div>}

      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Gestión de Usuarios Doctores</h2>
        <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          disabled={actionLoading || gsiLoading}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {(actionLoading || gsiLoading) ? 'Procesando...' : 'Registrar Doctor (Email/Pass)'}
        </button>
        <button
          onClick={triggerGoogleSignIn}
          disabled={actionLoading || gsiLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {gsiLoading ? 'Cargando Google...' : (actionLoading ? 'Procesando...' : 'Crear/Asociar Doctor con Google')}
        </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4 text-gray-700">Lista de Doctores</h2>
      {(loading && doctors.length > 0) && <p className="text-center text-gray-600">Actualizando lista...</p>}
      {(!loading && doctors.length === 0 && !error) && <div className="text-center py-4 text-gray-500">No se encontraron doctores.</div>}
      
      {doctors.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pacientes</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doctor.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doctor.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doctor.specialty || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doctor.phone || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doctor.patients && doctor.patients.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {doctor.patients.slice(0, 3).map(patient => (
                          <li key={patient.id}>{formatPatientName(patient.name, patient.id)}</li>
                        ))}
                        {doctor.patients.length > 3 && <li>... ({doctor.patients.length - 3} más)</li>}
                      </ul>
                    ) : ('No tiene')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleOpenReadModal(doctor)} className="text-indigo-600 hover:text-indigo-900">Leer</button>
                    <button onClick={() => handleOpenEditModal(doctor)} className="text-yellow-600 hover:text-yellow-900">Editar</button>
                    <button onClick={() => handleDeleteDoctor(doctor.id, doctor.name)} disabled={actionLoading || gsiLoading} className="text-red-600 hover:text-red-900 disabled:opacity-50">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Leer Doctor */}
      {isReadModalOpen && readingDoctor && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalles del Doctor</h2>
                <button onClick={() => setIsReadModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">×</button>
            </div>
            {readingDoctor.profileData.photoURL && <img src={readingDoctor.profileData.photoURL} alt={`Foto de ${readingDoctor.name}`} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto mb-4 object-cover border-2 border-gray-300" />}
            <div className="space-y-2 text-sm sm:text-base">
                <p><strong className="font-semibold text-gray-700">ID:</strong> <span className="text-gray-600 break-all">{readingDoctor.id}</span></p>
                <p><strong className="font-semibold text-gray-700">Nombre:</strong> <span className="text-gray-600">{readingDoctor.name}</span></p>
                <p><strong className="font-semibold text-gray-700">Email:</strong> <span className="text-gray-600">{readingDoctor.email}</span></p>
                <p><strong className="font-semibold text-gray-700">Especialidad:</strong> <span className="text-gray-600">{readingDoctor.specialty || 'N/A'}</span></p>
                <p><strong className="font-semibold text-gray-700">Teléfono:</strong> <span className="text-gray-600">{readingDoctor.phone || 'N/A'}</span></p>
                <p><strong className="font-semibold text-gray-700">Clínica:</strong> <span className="text-gray-600">{readingDoctor.profileData.clinica || 'N/A'}</span></p>
                <p><strong className="font-semibold text-gray-700">Dirección:</strong> <span className="text-gray-600">{readingDoctor.profileData.direccion || 'N/A'}</span></p>
                <p><strong className="font-semibold text-gray-700">Horario:</strong> <span className="text-gray-600">{readingDoctor.profileData.horario || 'N/A'}</span></p>
                <p><strong className="font-semibold text-gray-700">Registro (Perfil):</strong> <span className="text-gray-600">{readingDoctor.profileData.createdAt ? new Date(readingDoctor.profileData.createdAt).toLocaleDateString() : 'N/A'}</span></p>
            </div>
            <h3 className="text-md sm:text-lg font-semibold mt-6 mb-2 text-gray-700">Pacientes ({readingDoctor.patients?.length || 0})</h3>
            {readingDoctor.patients && readingDoctor.patients.length > 0 ? (
              <ul className="list-disc list-inside text-gray-600 max-h-40 sm:max-h-60 overflow-y-auto text-sm sm:text-base">
                {readingDoctor.patients.map(patient => (
                  <li key={patient.id}>{formatPatientName(patient.name, patient.id)}</li>
                ))}
              </ul>
            ) : (<p className="text-gray-500 text-sm sm:text-base">No tiene pacientes asignados.</p>)}
             <div className="mt-6 text-right">
                <button onClick={() => setIsReadModalOpen(false)} className="px-5 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Doctor */}
      {isEditModalOpen && editingDoctor && (
         <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Editar Doctor: {editingDoctor.profileData.nombre} {editingDoctor.profileData.apellido}</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateDoctor(); }} className="space-y-4">
              {Object.keys(editFormData).filter(key => key !== 'createdAt').map(field => (
                <div key={field}>
                  <label htmlFor={`edit-${field}`} className="block text-sm font-medium text-gray-700 capitalize">{field.replace('URL', ' URL')}:</label>
                  <input
                    type={field === 'photoURL' ? 'url' : 'text'}
                    name={field}
                    id={`edit-${field}`}
                    value={editFormData[field as keyof DoctorProfile] || ''}
                    onChange={handleEditFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              ))}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">Cancelar</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                  {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Doctor (Email/Password) */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Registrar Nuevo Doctor</h2>
                 <button onClick={() => setIsRegisterModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">×</button>
            </div>
            <form onSubmit={handleRegisterDoctorSubmit} className="space-y-4">
              {/* Campos del formulario de registro */}
              <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">Correo Electrónico:</label>
                  <input type="email" name="email" id="register-email" value={registerFormData.email} onChange={handleRegisterFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">Contraseña (mín. 6 caracteres):</label>
                  <input type="password" name="password" id="register-password" value={registerFormData.password} onChange={handleRegisterFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                  <label htmlFor="register-confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Contraseña:</label>
                  <input type="password" name="confirmPassword" id="register-confirmPassword" value={registerFormData.confirmPassword} onChange={handleRegisterFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                  <label htmlFor="register-nombre" className="block text-sm font-medium text-gray-700">Nombre:</label>
                  <input type="text" name="nombre" id="register-nombre" value={registerFormData.nombre} onChange={handleRegisterFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                  <label htmlFor="register-apellido" className="block text-sm font-medium text-gray-700">Apellido:</label>
                  <input type="text" name="apellido" id="register-apellido" value={registerFormData.apellido} onChange={handleRegisterFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                  <label htmlFor="register-especialidad" className="block text-sm font-medium text-gray-700">Especialidad:</label>
                  <input type="text" name="especialidad" id="register-especialidad" value={registerFormData.especialidad} onChange={handleRegisterFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                  <label htmlFor="register-telefono" className="block text-sm font-medium text-gray-700">Teléfono:</label>
                  <input type="tel" name="telefono" id="register-telefono" value={registerFormData.telefono} onChange={handleRegisterFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">Cancelar</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50">
                  {actionLoading ? 'Registrando...' : 'Registrar Doctor'}
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