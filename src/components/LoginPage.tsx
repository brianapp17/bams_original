import React, { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider, // Keep this import for GoogleAuthProvider.credential()
  signInWithCredential,
  UserCredential,
} from "firebase/auth";
// REMOVE this import: import { GoogleCredential } from "firebase/auth"; // Import is not needed for GoogleAuthProvider.credential()
import { getDatabase, ref, set, get } from "firebase/database";
import { app } from '../firebase'; // Assuming firebase.ts exports 'app'
import { useNavigate } from 'react-router-dom';

// Declare the google namespace provided by the GSI script
declare const google: any;

const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    especialidad: '',
    telefono: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  // Function to handle the Google Identity Services credential response
  // This is called by the GSI script after the user selects an account
  const handleCredentialResponse = async (response: any) => {
    // isLoading is set to true when the Google button is clicked/prompted
    setError(null);
    setSuccess(null);
    console.log("Step 1: Google credential response received:", response); // ADDED LOG

    if (response.credential) {
      try {
        // Build Firebase credential from Google ID token received in response.credential
        // FIX: Use GoogleAuthProvider.credential()
        const credential = GoogleAuthProvider.credential(response.credential);
        console.log("Step 2: Firebase credential created."); // ADDED LOG

        // Sign in to Firebase with the Google credential
        console.log("Step 3: Signing in to Firebase with credential..."); // ADDED LOG
        const result: UserCredential = await signInWithCredential(auth, credential);
        const user = result.user;
        const uid = user.uid;
        console.log("Step 4: Firebase sign-in successful.", user); // ADDED LOG
        console.log("Step 4: User UID:", uid); // Log the UID to check in Firebase console

        // --- Logic to check/save user data in the Realtime Database ---
        // This runs *after* successful Firebase Auth sign-in with Google
        const userRef = ref(database, `users/${uid}`);
        const doctorProfileRef = ref(database, `doctors/${uid}/perfil`);

        console.log(`Step 5: Checking database for existing profile for UID: ${uid}`); // ADDED LOG
        const [userSnapshot, doctorSnapshot] = await Promise.all([
            get(userRef),
            get(doctorProfileRef)
        ]);

        if (!userSnapshot.exists() || !doctorSnapshot.exists()) {
          // If either the user record or the doctor profile is missing, create/set both
          console.log('Step 6: Profile not found in DB. Creating...'); // ADDED LOG

          const userData = {
              email: user.email,
              role: 'doctor', // Assuming all Google sign-ins are doctors for this app
              createdAt: new Date().toISOString() // Add creation timestamp
          };

           const doctorProfileData = {
              nombre: user.displayName?.split(" ")[0] || "Nombre", // Attempt to parse first name from Google display name
              apellido: user.displayName?.split(" ").slice(1).join(" ") || "Apellido", // Attempt to parse last name
              especialidad: "sin asignar", // Google does not provide specialty
              telefono: "", // Google does not provide phone number
              photoURL: user.photoURL || "", // Use Google provided photo URL
              createdAt: new Date().toISOString() // Add creation timestamp
           };

           console.log("Step 7: Attempting to save user and doctor profile to DB..."); // ADDED LOG
           await Promise.all([
               set(userRef, userData),
               set(doctorProfileRef, doctorProfileData)
           ]);

          console.log('Step 8: Nuevo perfil de doctor/usuario creado en DB.'); // ADDED LOG
          setSuccess('Inicio de sesión con Google exitoso. Perfil creado. Redirigiendo a dashboard...');
          // Decide where to navigate new Google users. '/configuracion' might be better
          // if they need to fill in specialty/phone, or '/dashboard' if defaults are okay.
          // navigate('/configuracion');
          navigate('/dashboard'); // Default navigation for now

        } else {
          console.log('Step 6: Perfil de doctor/usuario existente verificado en DB.'); // ADDED LOG
          setSuccess('Inicio de sesión con Google exitoso. Redirigiendo...');
          navigate('/dashboard'); // Navigate existing users to dashboard
        }
        // --- End of database logic ---

      } catch (error: any) {
        console.error("Error signing in with Google credential or saving data:", error); // ADDED LOG
        if (error.code === 'auth/account-exists-with-different-credential') {
          setError('Ya existe una cuenta con este correo electrónico pero con un método de inicio de sesión diferente. Intenta iniciar sesión con el método original (correo/contraseña o Google si ya usaste ese).');
        } else {
          setError(`Error al iniciar sesión o guardar datos con Google: ${error.message}`);
        }
      } finally {
         setIsLoading(false); // Turn off loading regardless of success or failure
      }
    } else {
       console.error("Step 1: Google credential response did not contain a credential.", response); // ADDED LOG
       setError("Error al recibir respuesta de Google.");
       setIsLoading(false); // Turn off loading if no credential is received
    }
  };

  // useEffect to initialize Google Identity Services when the component mounts
  useEffect(() => {
    console.log("Step 0: Running useEffect for Google Identity Services initialization."); // ADDED LOG
    // Check if the google namespace is available before initializing
    const initGoogle = () => {
      if (google && google.accounts && google.accounts.id) {
        console.log("Step 0a: Initializing Google Identity Services..."); // ADDED LOG
        // YES, this client_id is used here: YOUR GOOGLE CLOUD CLIENT ID for Web
        google.accounts.id.initialize({
          client_id: '127465468754-kpsk6hlcj9cubic8be05o204nhubpgdk.apps.googleusercontent.com',
          callback: handleCredentialResponse, // Link the callback function
          auto_select: false, // Set to true for automatic sign-in on subsequent visits
          cancel_on_tap_outside: true, // Dismiss the prompt when clicking outside
        });
         console.log("Step 0b: Google Identity Services initialized."); // ADDED LOG

        // If you were rendering a specific Google button div, you would use renderButton here.
        // Since you are using a custom button that calls prompt(), renderButton is not needed here.

      } else {
        console.error("Google Identity Services script not loaded or namespace not found. Retrying initialization...");
        // Retry initialization after a delay if the script wasn't ready immediately
        setTimeout(initGoogle, 500);
      }
    };

    initGoogle(); // Initial call to start the initialization process

    // No cleanup needed for this specific initialization
    // return () => { };
  }, []); // Empty dependency array means this effect runs only once after the initial render


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterClick = () => {
    setIsRegistering(true);
    setError(null);
    setSuccess(null);
    // Clear form data except possibly email
    setFormData({
      nombre: '',
      apellido: '',
      email: formData.email, // Keep email if user typed it before switching
      password: '',
      confirmPassword: '',
      especialidad: '',
      telefono: ''
    });
  };

  const handleLoginClick = () => {
    setIsRegistering(false);
    setError(null);
    setSuccess(null);
     // Clear form data except possibly email
    setFormData({
      nombre: '',
      apellido: '',
      email: formData.email, // Keep email if user typed it before switching
      password: '',
      confirmPassword: '',
      especialidad: '',
      telefono: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (isRegistering) {
        // Validation for registration fields
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          setIsLoading(false);
          return;
        }

        if (!formData.nombre || !formData.apellido || !formData.email || !formData.password || !formData.especialidad || !formData.telefono) {
          setError('Por favor, complete todos los campos obligatorios.');
          setIsLoading(false);
          return;
        }

        // 1. Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCredential.user.uid;
        console.log('Usuario registrado en Firebase Auth con correo/contraseña:', uid);

        // 2. Save user data to Realtime Database
        const userData = {
          email: formData.email,
          role: 'doctor', // Assuming manual registrations are doctors
          createdAt: new Date().toISOString()
        };

        const doctorProfileData = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          especialidad: formData.especialidad,
          telefono: formData.telefono,
          createdAt: new Date().toISOString(),
          photoURL: '' // No photoURL from email/password registration
        };

        const userRef = ref(database, 'users/' + uid);
        const doctorProfileRef = ref(database, 'doctors/' + uid + '/perfil');

        console.log("Attempting to save user and doctor profile to DB after email/password registration..."); // ADDED LOG
        await Promise.all([
            set(userRef, userData),
            set(doctorProfileRef, doctorProfileData)
        ]);
        console.log('Perfil de doctor/usuario guardado en DB tras registro con correo/contraseña.'); // ADDED LOG


        setSuccess('Registro exitoso. Redirigiendo a configuración de perfil...');
        navigate('/configuracion'); // Redirect new users to config

      } else { // This is the login flow (email/password)
        // Validation for login fields
         if (!formData.email || !formData.password) {
          setError('Por favor, ingrese correo electrónico y contraseña.');
          setIsLoading(false);
          return;
        }

        // Sign in with email and password
        console.log("Attempting email/password login..."); // ADDED LOG
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        console.log('Usuario logueado con correo/contraseña:', userCredential.user); // ADDED LOG
        setSuccess('Login exitoso. Redirigiendo...');
        navigate('/dashboard'); // Redirect logged-in users to dashboard
      }
    } catch (error: any) {
      console.error('Firebase Error (Email/Password):', error); // ADDED LOG
      if (isRegistering) {
        if (error.code === 'auth/email-already-in-use') {
          setError('El correo electrónico ya está en uso. Intente iniciar sesión.');
        } else if (error.code === 'auth/weak-password') {
          setError('La contraseña debe tener al menos 6 caracteres.');
        } else if (error.code === 'auth/invalid-email') {
          setError('El formato del correo electrónico no es válido.');
        } else {
          setError(`Error al registrar usuario: ${error.message}`);
        }
      } else { // Login error
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          setError('Correo electrónico o contraseña incorrectos.');
        } else if (error.code === 'auth/invalid-email') {
          setError('El formato del correo electrónico no es válido.');
        }
         else if (error.code === 'auth/too-many-requests') {
          setError('Demasiados intentos de inicio de sesión fallidos. Inténtalo de nuevo más tarde.');
        }
        else {
          setError(`Error al iniciar sesión: ${error.message}`);
        }
      }
    } finally {
      setIsLoading(false); // Ensure loading is turned off after any submit attempt
    }
  };

  // Function to trigger the Google Identity Services prompt
  const loginWithGoogle = () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true); // Indicate loading state immediately when the button is clicked

    // Trigger the Google Sign-In prompt/popup.
    // The result will be handled by the handleCredentialResponse callback.
    if (google && google.accounts && google.accounts.id) {
       console.log("Step Google 0: Triggering Google Identity Services prompt..."); // ADDED LOG
       google.accounts.id.prompt();
       // The rest of the process (sign-in to Firebase and saving to DB) happens
       // asynchronously in handleCredentialResponse.
    } else {
      console.error("Google Identity Services not initialized or script not loaded.");
      setError("Error: Servicio de inicio de sesión con Google no disponible. Intente recargar la página.");
      setIsLoading(false); // Turn off loading if GSI is not ready
    }
  };


  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gray-100"
      style={{
        backgroundImage: `url('/fondo.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-md flex">
        <div className="w-1/2 pr-8 border-r border-gray-200">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <img src="/logo.PNG" alt="Company Logo" className="h-20" />
          </div>
          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-teal-700 mb-6">
            {isRegistering ? 'Registro de Doctor' : 'BAMS Login'}
          </h2>
          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{success}</span>
            </div>
          )}
           {/* Loading Indicator */}
          {isLoading && (
            <div className="text-center py-4">
              <p className="text-teal-600">Procesando...</p>
            </div>
          )}

          {/* Login/Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering ? (
              // Registration Fields
              <>
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">Apellido</label>
                  <input type="text" id="apellido" name="apellido" value={formData.apellido} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700">Especialidad</label>
                  <input type="text" id="especialidad" name="especialidad" value={formData.especialidad} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="tel" id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
                  <input type="password" id="confirm-password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                {/* Register Button */}
                <button type="submit" disabled={isLoading} className="w-full px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50">
                  {isLoading ? 'Registrando...' : 'Registrar y Continuar a Perfil'}
                </button>
                 {/* Switch to Login Button */}
                <button type="button" onClick={handleLoginClick} disabled={isLoading} className="w-full px-4 py-2 text-teal-700 bg-transparent border border-teal-600 rounded-md hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50">
                  Ya tengo cuenta
                </button>
              </>
            ) : (
              // Login Fields
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
                </div>
                {/* Login Button */}
                <button type="submit" disabled={isLoading} className="w-full px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50">
                  {isLoading ? 'Iniciando sesión...' : 'Login'}
                </button>
                 {/* Switch to Register Button */}
                <button type="button" onClick={handleRegisterClick} disabled={isLoading} className="w-full px-4 py-2 text-teal-700 bg-transparent border border-teal-600 rounded-md hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50">
                  Registrarse
                </button>
              </>
            )}
            {/* Google Sign-In Button - Only show on Login tab */}
            {!isRegistering && (
              <button type="button" onClick={loginWithGoogle} disabled={isLoading} className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-4">
                {isLoading ? 'Cargando Google...' : 'Iniciar sesión con Google'}
              </button>
            )}
          </form>
        </div>
        {/* Right Section */}
        <div className="w-1/2 pl-8 flex items-center">
          <div>
            <h3 className="text-xl font-semibold text-teal-700 mb-4">Bienvenido a BAMS</h3>
            <p className="text-gray-700 leading-relaxed">
              Tu asistente clínico con Inteligencia Artificial diseñado para optimizar el juicio médico en cada etapa del ciclo asistencial.
            </p>
            <ul className="list-disc list-inside mt-4 text-gray-700 leading-relaxed space-y-1">
              <li><strong>Análisis integral del historial clínico</strong></li>
              <li><strong>Asistente clínico conversacional con IA</strong></li>
              <li><strong>Generación automatizada de reportes médicos</strong></li>
              <li><strong>Dictado médico inteligente</strong></li>
              <li><strong>Interpretación de exámenes bioquímicos asistida por IA</strong></li>
              <li><strong>Si quieres mas información pregunta a nuestro asistente con IA para usuarios nuevos en la esquina inferior derecha</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;