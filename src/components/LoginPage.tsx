import React, { useState } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut // Importar signOut para desloguear si el usuario no es válido en la DB
} from "firebase/auth";
import { getDatabase, ref, get, DataSnapshot } from "firebase/database";
import { app } from '../firebase';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  // Ya no necesitamos 'success' si el error maneja el caso de usuario no encontrado en DB
  // const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  const fetchUserRole = async (uid: string): Promise<string | null> => {
    try {
      const userRef = ref(database, `users/${uid}/role`);
      const snapshot: DataSnapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val() !== null) { // Asegurarse que el rol exista y no sea null
        return snapshot.val();
      } else {
        console.warn(`Role not found or is null for user: ${uid} in /users node.`);
        // No establecemos error aquí directamente, lo manejará redirectToDashboard
        return null;
      }
    } catch (dbError) {
      console.error(`Error fetching user role for ${uid}:`, dbError);
      // No establecemos error aquí directamente, lo manejará redirectToDashboard
      return null; // Indicar que hubo un problema o no se encontró
    }
  };

  // Modificamos redirectToDashboard para que devuelva un booleano indicando éxito o fracaso
  const redirectToDashboard = async (uid: string): Promise<boolean> => {
    const role = await fetchUserRole(uid);

    if (role === 'superadmin') {
      console.log('Redirecting to admin dashboard');
      navigate('/admin-dashboard');
      return true; // Redirección exitosa
    } else if (role === 'doctor') {
      console.log('Redirecting to doctor dashboard');
      navigate('/dashboard');
      return true; // Redirección exitosa
    } else {
      // Si el rol es null (porque no se encontró el usuario en /users o no tiene rol)
      // o si el rol no es uno de los esperados.
      setError('Cuenta inexistente, eliminada o sin permisos asignados.');
      await signOut(auth); // Desloguear al usuario de Firebase Auth
      console.log('User signed out due to missing/invalid role in DB.');
      return false; // Redirección fallida
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    // setSuccess(null); // Ya no se usa
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      setError('Por favor, ingrese correo electrónico y contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      console.log("Attempting email/password login...");
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;
      console.log('Usuario logueado en Firebase Auth:', userCredential.user);

      // Ahora, en lugar de mostrar "Login exitoso" inmediatamente,
      // llamamos a redirectToDashboard y esta determinará si el login fue REALMENTE exitoso
      // en términos de tener un rol válido en nuestra base de datos.
      const loginAndRedirectSuccessful = await redirectToDashboard(uid);

      if (loginAndRedirectSuccessful) {
        // El success se maneja implícitamente por la redirección.
        // Podrías mostrar un mensaje breve si lo deseas, pero usualmente la redirección es suficiente.
        // setSuccess('Login y validación de rol exitosos. Redirigiendo...');
      }
      // Si loginAndRedirectSuccessful es false, redirectToDashboard ya habrá seteado el error apropiado
      // y deslogueado al usuario de Auth.

    } catch (error: any) {
      console.error('Firebase Error (Email/Password Login):', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Correo electrónico o contraseña incorrectos.');
      } else if (error.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Inténtalo más tarde.');
      } else {
        setError(`Error al iniciar sesión: ${error.message}`);
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
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-xl flex">
        <div className="w-1/2 pr-8 border-r border-gray-200 flex flex-col justify-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.PNG" alt="BAMS Logo" className="h-20" />
          </div>
          <h2 className="text-2xl font-bold text-center text-teal-700 mb-6">
            BAMS Login
          </h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {/* Eliminamos el mensaje de 'success' ya que la redirección es el éxito */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 transition duration-150 ease-in-out"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
        <div className="w-1/2 pl-8 flex flex-col justify-center">
          {/* ... (sección de bienvenida sin cambios) ... */}
          <h3 className="text-xl font-semibold text-teal-700 mb-4">Bienvenido a BAMS</h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            Tu asistente clínico con Inteligencia Artificial diseñado para optimizar el juicio médico en cada etapa del ciclo asistencial.
          </p>
          <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-1 text-sm">
            <li>Análisis integral del historial clínico</li>
            <li>Asistente clínico conversacional con IA</li>
            <li>Generación automatizada de reportes médicos</li>
            <li>Dictado médico inteligente</li>
            <li>Interpretación de exámenes bioquímicos asistida por IA</li>
            <li><strong>Cuenta demostrativa:</strong> doctordemo@gmail.com</li>
<li><strong>Contraseña demostrativa:</strong> doctor123</li>

          </ul>
          <p className="text-xs text-gray-500 mt-6">
            Si quieres más información pregunta a nuestro asistente con IA para usuarios nuevos en la esquina inferior derecha.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;