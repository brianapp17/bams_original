import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from '../firebase';

interface DoctorProfile {
  nombre?: string;
  apellido?: string;
  especialidad?: string;
  photoURL?: string;
}

const DashboardPage: React.FC = () => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for dropdown menu

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const doctorProfileRef = ref(database, `doctors/${doctorUid}/perfil`);
        const profileListener = onValue(doctorProfileRef, (snapshot) => {
          const profileData = snapshot.val() as DoctorProfile;
          setDoctorProfile(profileData);
          setIsLoadingProfile(false);
        }, (error) => {
          console.error("Error fetching doctor profile for dashboard:", error);
          setIsLoadingProfile(false);
          setDoctorProfile(null);
        });
        return () => off(doctorProfileRef, 'value', profileListener);
      } else {
        setIsLoadingProfile(false);
        setDoctorProfile(null);
        navigate('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [auth, database, navigate]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally show an error message to the user
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-teal-800">Bienvenido a BAMS: Tu Asistente Clínico de IA</h1>
          <div className="relative">
            {isLoadingProfile ? (
              <div className="w-14 h-14 bg-gray-300 rounded-full animate-pulse"></div>
            ) : (
              <div onClick={toggleDropdown} className="cursor-pointer">
                {doctorProfile && doctorProfile.photoURL ? (
                  <img 
                    src={doctorProfile.photoURL} 
                    alt={`${doctorProfile.nombre || 'Doctor'} ${doctorProfile.apellido || ''}`}
                    className="w-14 h-14 rounded-full object-cover border-2 border-teal-500 shadow-sm"
                  />
                ) : doctorProfile ? (
                  <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center text-white text-xl font-semibold shadow-sm">
                      {doctorProfile.nombre?.charAt(0).toUpperCase()}{doctorProfile.apellido?.charAt(0).toUpperCase()}
                  </div>
                ) : (
                   <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl shadow-sm">
                      👤 
                   </div>
                )}
              </div>
            )}
            {isDropdownOpen && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doctorProfile?.nombre} {doctorProfile?.apellido}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {auth.currentUser?.email}
                    </p>
                  </div>
                  <div className="border-t border-gray-100"></div>
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/expedientes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Expedientes
                  </Link>
                  <Link to="/nueva-consulta" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Nueva Consulta
                  </Link>
                  <Link to="/configuracion" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Configuración del Perfil
                  </Link>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:bg-red-50 focus:text-red-700"
                    role="menuitem"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-gray-700 text-lg mb-10">
          Llevamos la atención médica al siguiente nivel con tecnología de vanguardia y inteligencia artificial.
        </p>

        {/* Graphs Section (remains the same) */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-teal-700 mb-4">Estadísticas Clave</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-blue-200 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-blue-600 mb-3">Pacientes Atendidos (Mensual)</h3>
              <div className="w-full h-40 bg-blue-100 flex items-center justify-center text-gray-500">[Gráfico de Barras Aquí]</div>
              <p className="text-sm text-gray-600 mt-3">Datos simulados</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-green-200 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-green-600 mb-3">Promedio de Consultas (Semanal)</h3>
              <div className="w-full h-40 bg-green-100 flex items-center justify-center text-gray-500">[Gráfico de Líneas Aquí]</div>
              <p className="text-sm text-gray-600 mt-3">Datos simulados</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-yellow-200 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-yellow-700 mb-3">Tipos de Padecimientos Comunes</h3>
              <div className="w-full h-40 bg-yellow-100 flex items-center justify-center text-gray-500">[Gráfico Circular Aquí]</div>
              <p className="text-sm text-gray-600 mt-3">Datos simulados</p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons Section (remains the same) */}
        <div className="mb-12">
           <h2 className="text-2xl font-semibold text-teal-700 mb-4">Navegación Rápida</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
              <Link to="/nueva-consulta" className="block bg-teal-600 text-white text-center py-4 px-6 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 text-xl font-semibold lg:col-span-2">+ Nueva Consulta</Link>
              <Link to="/expedientes" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Expedientes</Link>
               <Link to="/reportes-medicos" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Reportes médicos</Link>
              <Link to="/tareas-pendientes" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Tareas pendientes</Link>
              <Link to="/configuracion" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Configuración del perfil</Link>
           </div>
        </div>

        {/* Features Section (remains the same) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Historial Clínico Completo</h2>
            <p className="text-gray-700 mb-4">Visualización e interpretación instantánea de datos y resultados, todo en un solo lugar. Accede a un historial médico completo y organizado para una comprensión profunda del paciente.</p>
            <p className="text-sm text-gray-600">Potenciado por: <strong>Asociacion A</strong></p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Chat con Asistente BAMS</h2>
            <p className="text-gray-700 mb-4">Obtén respuestas médicas a consultas basadas en síntomas y antecedentes del paciente. Nuestro asistente de IA te brinda soporte en tiempo real para decisiones clínicas informadas.</p>
            <p className="text-sm text-gray-600">Colaboración con: <strong>Asociacion B</strong></p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Reportes Automáticos Inteligentes</h2>
            <p className="text-gray-700 mb-4">Generación en PDF de resúmenes clínicos generados por IA, listos para compartir. Ahorra tiempo y esfuerzo en la creación de documentación médica esencial.</p>
            <p className="text-sm text-gray-600">Con tecnología de: <strong>Asociacion C</strong></p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Dictado Médico Inteligente</h2>
            <p className="text-gray-700 mb-4">Crea y almacena notas médicas importantes mediante grabaciones de audio analizadas e interpretadas por IA para generar la nota.Con solo un botón. Documenta consultas y observaciones de manera rápida y conveniente.</p>
            <p className="text-sm text-gray-600">Integración con: <strong>Asociacion D</strong></p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Análisis Bioquímico Inteligente</h2>
            <p className="text-gray-700 mb-4">Interpreta exámenes de laboratorio con contexto histórico de cada paciente. Obtén insights valiosos sobre las tendencias y cambios en los resultados a lo largo del tiempo.</p>
            <p className="text-sm text-gray-600">Con el apoyo de: <strong>Asociacion E</strong></p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Asistente IA Guía para nuevos usuarios</h2>
            <p className="text-gray-700 mb-4">En la esquina inferior derecha de tu pantalla encontrarás un botón de chat. Este es tu asistente de IA, disponible las 24 horas del día, los 7 días de la semana, para responder cualquier duda que tengas sobre la plataforma, sus procesos, funciones y más. ¡No dudes en consultarle!</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;