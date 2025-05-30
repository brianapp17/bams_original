import React, { useState } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getDatabase, ref, get, DataSnapshot } from "firebase/database";
import { app } from '../firebase';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  const fetchUserRole = async (uid: string): Promise<string | null> => {
    try {
      const userRef = ref(database, `users/${uid}/role`);
      const snapshot: DataSnapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val() !== null) {
        return snapshot.val();
      } else {
        console.warn(`Role not found or is null for user: ${uid}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching user role for ${uid}:`, error);
      return null;
    }
  };

  const redirectToDashboard = async (uid: string): Promise<boolean> => {
    const role = await fetchUserRole(uid);
    if (role === 'superadmin') {
      navigate('/admin-dashboard');
      return true;
    } else if (role === 'doctor') {
      navigate('/dashboard');
      return true;
    } else {
      setError('Cuenta inexistente, eliminada o sin permisos asignados.');
      await signOut(auth);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      setError('Por favor, ingrese correo electrónico y contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;
      await redirectToDashboard(uid);
    } catch (error: any) {
      console.error('Firebase Error:', error);
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
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
      className="flex items-center justify-center min-h-screen bg-gray-100 p-4"
      style={{
        backgroundImage: `url('/fondo.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-5xl p-6 md:p-10 bg-white/70 backdrop-blur-md rounded-lg shadow-xl flex flex-col md:flex-row border border-white/30">
        <div className="w-full md:w-1/2 md:pr-8 md:border-r border-gray-200 flex flex-col justify-center">
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
        <div className="w-full md:w-1/2 md:pl-8 flex flex-col justify-center mt-8 md:mt-0">
          <h3 className="text-xl font-semibold text-teal-700 mb-4 text-center md:text-left">Bienvenido a BAMS</h3>
          <p className="text-gray-600 leading-relaxed mb-4 text-sm md:text-base">
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
          <p className="text-xs text-gray-500 mt-6 text-center md:text-left">
            Si quieres más información pregunta a nuestro asistente con IA para usuarios nuevos en la esquina inferior derecha.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
