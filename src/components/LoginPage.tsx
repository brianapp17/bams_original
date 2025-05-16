import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { app } from '../firebase'; // Import the initialized app
import { useNavigate } from 'react-router-dom'; // Import useNavigate

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterClick = () => {
    setIsRegistering(true);
    setError(null);
    setSuccess(null);
    setFormData({ // Clear form data when switching
      nombre: '',
      apellido: '',
      email: '',
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
     setFormData({ // Clear sensitive data, keep email/password for convenience
      nombre: '',
      apellido: '',
      email: formData.email,
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
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          setIsLoading(false);
          return;
        }

        // Basic validation for required registration fields
         if (!formData.nombre || !formData.apellido || !formData.email || !formData.password || !formData.confirmPassword || !formData.especialidad || !formData.telefono) {
             setError('Por favor, complete todos los campos obligatorios.');
             setIsLoading(false);
             return;
         }

        // 1. Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCredential.user.uid;
        console.log('Usuario registrado en Auth:', uid);

        // 2. Guardar en /users/{uid}
        const userRef = ref(database, 'users/' + uid);
        await set(userRef, {
          email: formData.email,
          role: 'doctor'
        });
        console.log('Usuario guardado en /users:');

        // 3. Guardar en /doctors/{uid}/perfil
        const doctorProfileRef = ref(database, 'doctors/' + uid + '/perfil');
        await set(doctorProfileRef, {
          nombre: formData.nombre,
          apellido: formData.apellido,
          especialidad: formData.especialidad,
          telefono: formData.telefono,
          createdAt: new Date().toISOString()
        });
        console.log('Perfil de doctor guardado en /doctors/{uid}/perfil:');

        setSuccess('Registro exitoso. Ahora puede iniciar sesión.');
        // Optionally switch back to login form after successful registration
        setIsRegistering(false);
        setFormData({ // Clear form data after successful registration
          nombre: '',
          apellido: '',
          email: '',
          password: '',
          confirmPassword: '',
          especialidad: '',
          telefono: ''
        });

      } else {
         // Basic validation for required login fields
         if (!formData.email || !formData.password) {
             setError('Por favor, ingrese correo electrónico y contraseña.');
             setIsLoading(false);
             return;
         }

        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        console.log('Usuario logueado:', userCredential.user);
        setSuccess('Login exitoso. Redirigiendo...');
         // Redirect to dashboard on successful login
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Firebase Error:', error);
      // Handle specific Firebase errors for user feedback
      if (isRegistering) {
          if (error.code === 'auth/email-already-in-use') {
              setError('El correo electrónico ya está en uso.');
          } else if (error.code === 'auth/weak-password') {
              setError('La contraseña debe tener al menos 6 caracteres.');
          }
           else if (error.code === 'auth/invalid-email') {
               setError('El formato del correo electrónico no es válido.');
           }
          else {
               setError(`Error al registrar usuario: ${error.message}`);
          }
      } else { // Login errors
           if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
               setError('Correo electrónico o contraseña incorrectos.');
           } else if (error.code === 'auth/invalid-email') {
                setError('El formato del correo electrónico no es válido.');
           }
           else {
                setError(`Error al iniciar sesión: ${error.message}`);
           }
      }
    } finally {
      setIsLoading(false);
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
        {/* Left Section: Logo and Form */}
        <div className="w-1/2 pr-8 border-r border-gray-200">
          <div className="flex justify-center mb-6">
            <img src="/logo.PNG" alt="Company Logo" className="h-20" />
          </div>
          <h2 className="text-2xl font-bold text-center text-teal-700 mb-6">
            {isRegistering ? 'Registro de Doctor' : 'BAMS Login'}
          </h2>

           {/* Display error or success messages */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering ? (
              <>
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">Apellido</label>
                  <input
                    type="text"
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                 <div>
                  <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700">Especialidad</label>
                   {/* You can change this to a select dropdown if you have a predefined list */}
                  <input
                    type="text"
                    id="especialidad"
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                 <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                     required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
                  <input
                    type="password"
                    id="confirm-password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  {isLoading ? 'Registrando...' : 'Registrar'}
                </button>
                <button
                  type="button"
                  onClick={handleLoginClick}
                   disabled={isLoading}
                  className="w-full px-4 py-2 text-teal-700 bg-transparent border border-teal-600 rounded-md hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  Ya tengo cuenta
                </button>
              </>
            ) : (
              <>
                {/* Login Form */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                  {/* Assuming username for login is email based on registration field */}
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  {isLoading ? 'Iniciando sesión...' : 'Login'}
                </button>
                 <button
                  type="button"
                  onClick={handleRegisterClick}
                   disabled={isLoading}
                  className="w-full px-4 py-2 text-teal-700 bg-transparent border border-teal-600 rounded-md hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  Registrarse
                </button>
              </>
            )}
          </form>
        </div>

        {/* Right Section: Informational Text */}
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