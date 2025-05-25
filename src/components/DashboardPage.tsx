// DashboardPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue, off, get } from 'firebase/database'; // Import 'get'
import { app } from '../firebase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { FileText } from 'lucide-react'; // Para el botón de reportes

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DoctorProfile {
  nombre?: string;
  apellido?: string;
  especialidad?: string;
  photoURL?: string;
}

// Interfaz simplificada para el dashboard, ajusta según tus necesidades reales
interface PatientForStats {
  id: string;
  // otras propiedades si las necesitas para algún filtro futuro
}

interface EncounterForStats {
  id: string;
  patientId: string; // Necesario para contar pacientes únicos
  date: string; // Fecha del encuentro, ej. encounter.period.start
  // No necesitamos 'conditions' anidadas aquí si las leemos por separado
}

interface ConditionForStats {
  id: string;
  patientId: string;
  code?: {
    text?: string; // Nombre de la condición
  };
  // otras propiedades si las necesitas
}


const DashboardPage: React.FC = () => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<{
    patientsPerMonth?: { labels: string[]; data: number[] };
    consultationsPerWeek?: { labels: string[]; data: number[] };
    commonConditions?: { labels: string[]; data: number[] };
  }>({
    patientsPerMonth: { labels: [], data: [] },
    consultationsPerWeek: { labels: [], data: [] },
    commonConditions: { labels: [], data: [] },
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  useEffect(() => {
    let profileListenerUnsubscribe: (() => void) | undefined;
    let patientsListenerUnsubscribe: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const doctorProfileRef = ref(database, `doctors/${doctorUid}/perfil`);
        profileListenerUnsubscribe = onValue(doctorProfileRef, (snapshot) => {
          setDoctorProfile(snapshot.val() as DoctorProfile);
          setIsLoadingProfile(false);
        }, (error) => {
          console.error("Error fetching doctor profile:", error);
          setIsLoadingProfile(false);
        });

        // Fetch statistics data
        setIsLoadingStats(true);
        const patientsRef = ref(database, `doctors/${doctorUid}/patients`);

        patientsListenerUnsubscribe = onValue(patientsRef, async (patientsSnapshot) => {
          const patientsData = patientsSnapshot.val() as Record<string, PatientForStats> | null;
          
          let allEncounters: EncounterForStats[] = [];
          let allConditions: ConditionForStats[] = [];

          if (patientsData) {
            const patientIds = Object.keys(patientsData);

            for (const patientId of patientIds) {
              // Fetch encounters for this patient
              const encountersPatientRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/encounters`);
              const encountersSnap = await get(encountersPatientRef);
              const encountersPatientData = encountersSnap.val() as Record<string, { period?: { start?: string } }> | null;
              if (encountersPatientData) {
                const encountersArray = Object.values(encountersPatientData).map((enc, index) => ({
                  id: Object.keys(encountersPatientData)[index], // Get the encounter ID (Firebase key)
                  patientId: patientId,
                  date: enc.period?.start || new Date(0).toISOString(), // Use encounter start date, fallback to a very old date if undefined
                }));
                allEncounters = allEncounters.concat(encountersArray);
              }

              // Fetch conditions for this patient
              const conditionsPatientRef = ref(database, `doctors/${doctorUid}/patients/${patientId}/conditions`);
              const conditionsSnap = await get(conditionsPatientRef);
              const conditionsPatientData = conditionsSnap.val() as Record<string, ConditionForStats> | null;
              if (conditionsPatientData) {
                 const conditionsArray = Object.values(conditionsPatientData).map((cond, index) => ({
                    ...cond,
                    id: Object.keys(conditionsPatientData)[index], // Get condition ID
                    patientId: patientId,
                 }));
                allConditions = allConditions.concat(conditionsArray);
              }
            }
          }
            
          // Process statistics
          // 1. Patients Attended (Monthly for the last 6 months)
          const monthlyPatients: Record<string, Set<string>> = {};
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
          sixMonthsAgo.setDate(1);
          sixMonthsAgo.setHours(0, 0, 0, 0);


          allEncounters.forEach(encounter => {
            if (encounter.date && encounter.patientId) {
              const encounterDate = new Date(encounter.date);
              if (encounterDate >= sixMonthsAgo) {
                const monthYear = encounterDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }); // ej. "may. 2025"
                if (!monthlyPatients[monthYear]) {
                  monthlyPatients[monthYear] = new Set();
                }
                monthlyPatients[monthYear].add(encounter.patientId);
              }
            }
          });
           // Ensure labels are sorted chronologically for the last 6 months
          const patientLabelsSorted: string[] = [];
          for (let i = 5; i >= 0; i--) {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              patientLabelsSorted.push(d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
          }
          const patientData = patientLabelsSorted.map(label => monthlyPatients[label]?.size || 0);


          // 2. Consultations (Weekly for the last 4 weeks)
          const weeklyConsultations: Record<string, number> = {};
          const today = new Date();
          const fourWeeksAgo = new Date(today);
          fourWeeksAgo.setDate(today.getDate() - 27); // 28 days total, including today
          fourWeeksAgo.setHours(0,0,0,0);

          allEncounters.forEach(encounter => {
            if (encounter.date) {
              const encounterDate = new Date(encounter.date);
              if (encounterDate >= fourWeeksAgo && encounterDate <= today) {
                const startOfWeek = new Date(encounterDate);
                startOfWeek.setDate(encounterDate.getDate() - encounterDate.getDay() + (encounterDate.getDay() === 0 ? -6 : 1)); // Monday as start of week
                startOfWeek.setHours(0,0,0,0);
                const weekLabel = `Sem. ${startOfWeek.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
                weeklyConsultations[weekLabel] = (weeklyConsultations[weekLabel] || 0) + 1;
              }
            }
          });
          // Ensure labels are sorted for the last 4 weeks
          const consultationLabelsSorted: string[] = [];
          for (let i = 3; i >= 0; i--) {
              const weekStartDate = new Date(today);
              weekStartDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1) - (i * 7) );
              weekStartDate.setHours(0,0,0,0);
              consultationLabelsSorted.push(`Sem. ${weekStartDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`);
          }
          const consultationData = consultationLabelsSorted.map(label => weeklyConsultations[label] || 0);

          // 3. Common Conditions (Top 5 from all standalone conditions)
          const conditionCounts: Record<string, number> = {};
          allConditions.forEach(condition => {
            const name = condition.code?.text?.trim() || "Desconocido";
            if (name !== "Desconocido") { // Optionally filter out 'Desconocido'
                 conditionCounts[name] = (conditionCounts[name] || 0) + 1;
            }
          });
          const sortedConditions = Object.entries(conditionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
          const conditionLabels = sortedConditions.map(([name]) => name);
          const conditionData = sortedConditions.map(([, count]) => count);

          setStats({
            patientsPerMonth: { labels: patientLabelsSorted, data: patientData },
            consultationsPerWeek: { labels: consultationLabelsSorted, data: consultationData },
            commonConditions: { labels: conditionLabels, data: conditionData },
          });
          setIsLoadingStats(false);

        }, (error) => {
          console.error("Error fetching patients for stats:", error);
          setIsLoadingStats(false);
          setStats({
            patientsPerMonth: { labels: [], data: [] },
            consultationsPerWeek: { labels: [], data: [] },
            commonConditions: { labels: [], data: [] },
          });
        });

        return () => {
          if (profileListenerUnsubscribe) off(doctorProfileRef, 'value', profileListenerUnsubscribe);
          if (patientsListenerUnsubscribe) off(patientsRef, 'value', patientsListenerUnsubscribe);
        };
      } else {
        setIsLoadingProfile(false);
        setDoctorProfile(null);
        setIsLoadingStats(false);
        setStats({ // Clear stats if user logs out
            patientsPerMonth: { labels: [], data: [] },
            consultationsPerWeek: { labels: [], data: [] },
            commonConditions: { labels: [], data: [] },
        });
        navigate('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [auth, database, navigate]);

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
    }
  };
  
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
            color: '#4A5568', // Tailwind gray-700
            font: {
                size: 12,
                family: 'Inter, sans-serif' // Example font
            }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: {
            size: 14,
            family: 'Inter, sans-serif'
        },
        bodyFont: {
            size: 12,
            family: 'Inter, sans-serif'
        },
        callbacks: {
            label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += context.parsed.y;
                }
                return label;
            }
        }
      }
    },
    scales: {
        x: {
            ticks: {
                color: '#718096', // Tailwind gray-600
                 font: {
                    size: 11,
                    family: 'Inter, sans-serif'
                }
            },
            grid: {
                display: false, // Opcional: remover líneas de grid X
            }
        },
        y: {
            beginAtZero: true,
            ticks: {
                color: '#718096', // Tailwind gray-600
                 font: {
                    size: 11,
                    family: 'Inter, sans-serif'
                },
                stepSize: 1 // Forzar ticks a ser enteros si aplica
            },
             grid: {
                color: '#E2E8F0' // Tailwind gray-300
            }
        }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
         labels: {
            color: '#4A5568',
            font: { size: 12, family: 'Inter, sans-serif'},
            padding: 15
        }
      },
      title: {
        display: false,
      },
      tooltip: {
         backgroundColor: 'rgba(0, 0, 0, 0.7)',
         titleFont: { size: 14, family: 'Inter, sans-serif' },
         bodyFont: { size: 12, family: 'Inter, sans-serif' },
         callbacks: {
            label: function(context: any) {
                let label = context.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed !== null) {
                    label += context.parsed;
                }
                return label;
            }
        }
      }
    },
  };


  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto"> {/* Slightly wider max-width for better spacing */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-teal-700">Bienvenido a BAMS</h1>
          <div className="relative">
            {isLoadingProfile ? (
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-300 rounded-full animate-pulse"></div>
            ) : (
              <div onClick={toggleDropdown} className="cursor-pointer">
                {doctorProfile && doctorProfile.photoURL ? (
                  <img 
                    src={doctorProfile.photoURL} 
                    alt={`${doctorProfile.nombre || 'Doctor'} ${doctorProfile.apellido || ''}`}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-teal-500 shadow-md"
                  />
                ) : doctorProfile ? (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-teal-600 flex items-center justify-center text-white text-lg md:text-xl font-semibold shadow-md">
                      {doctorProfile.nombre?.charAt(0).toUpperCase()}{doctorProfile.apellido?.charAt(0).toUpperCase()}
                  </div>
                ) : (
                   <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-400 flex items-center justify-center text-gray-700 text-lg md:text-xl shadow-md">
                      👤 
                   </div>
                )}
              </div>
            )}
            {isDropdownOpen && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl z-20 ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doctorProfile?.nombre} {doctorProfile?.apellido}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {auth.currentUser?.email}
                    </p>
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/expedientes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Expedientes
                  </Link>
                  <Link to="/nueva-consulta" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Nueva Consulta
                  </Link>
                   <Link to="/reportes-medicos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                     Mis Reportes AI
                   </Link>
                  <Link to="/configuracion" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Configuración
                  </Link>
                  <div className="border-t border-gray-200"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:bg-red-50 focus:text-red-700"
                    role="menuitem"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-gray-600 text-md mb-10">
          Su asistente clínico de IA, llevando la atención médica al siguiente nivel.
        </p>

        <div className="mb-10">
          <h2 className="text-xl font-semibold text-teal-600 mb-5 text-center">Estadísticas Clave</h2>
          {isLoadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center h-72 md:h-80">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
                  <p className="text-teal-500 mt-4 text-sm">Cargando Gráfico...</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col items-center h-80">
                <h3 className="text-lg font-semibold text-blue-700 mb-3 text-center">Pacientes (Últimos 6 Meses)</h3>
                <div className="w-full flex-grow">
                  {stats.patientsPerMonth && stats.patientsPerMonth.data.length > 0 && stats.patientsPerMonth.data.some(d => d > 0) ? (
                    <Bar options={commonChartOptions} data={{
                      labels: stats.patientsPerMonth.labels,
                      datasets: [{
                        label: 'Pacientes Únicos',
                        data: stats.patientsPerMonth.data,
                        backgroundColor: 'rgba(59, 130, 246, 0.6)', // Tailwind blue-500
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                      }],
                    }} />
                  ) : <div className="flex items-center justify-center h-full"><p className="text-center text-gray-500">No hay datos suficientes.</p></div>}
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col items-center h-80">
                <h3 className="text-lg font-semibold text-green-700 mb-3 text-center">Consultas (Últimas 4 Semanas)</h3>
                <div className="w-full flex-grow">
                {stats.consultationsPerWeek && stats.consultationsPerWeek.data.length > 0 && stats.consultationsPerWeek.data.some(d => d > 0) ? (
                  <Line options={commonChartOptions} data={{
                    labels: stats.consultationsPerWeek.labels,
                    datasets: [{
                      label: 'Consultas',
                      data: stats.consultationsPerWeek.data,
                      borderColor: 'rgba(16, 185, 129, 1)', // Tailwind green-500
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      tension: 0.3,
                      fill: true,
                      pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                      pointBorderColor: '#fff',
                      pointHoverRadius: 6,
                    }],
                  }} />
                ) : <div className="flex items-center justify-center h-full"><p className="text-center text-gray-500">No hay datos suficientes.</p></div>}
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col items-center h-80">
                <h3 className="text-lg font-semibold text-amber-700 mb-3 text-center">Padecimientos Comunes (Top 5)</h3>
                <div className="w-full flex-grow">
                  {stats.commonConditions && stats.commonConditions.data.length > 0 && stats.commonConditions.data.some(d => d > 0) ? (
                    <Pie options={pieChartOptions} data={{
                      labels: stats.commonConditions.labels,
                      datasets: [{
                        label: 'Padecimientos',
                        data: stats.commonConditions.data,
                        backgroundColor: [
                          'rgba(255, 99, 132, 0.7)', // Red
                          'rgba(54, 162, 235, 0.7)', // Blue
                          'rgba(255, 206, 86, 0.7)', // Yellow
                          'rgba(75, 192, 192, 0.7)', // Teal
                          'rgba(153, 102, 255, 0.7)',// Purple
                          'rgba(255, 159, 64, 0.7)' // Orange
                        ],
                        hoverOffset: 8
                      }],
                    }} />
                  ) : <div className="flex items-center justify-center h-full"><p className="text-center text-gray-500">No hay datos de padecimientos.</p></div>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-10">
           <h2 className="text-xl font-semibold text-teal-600 mb-5 text-center">Acciones Rápidas</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to="/nueva-consulta" className="bg-teal-500 text-white text-center py-6 px-4 rounded-lg shadow-md hover:bg-teal-600 transition-colors text-lg font-medium flex items-center justify-center">
                 + Nueva Consulta
              </Link>
              <Link to="/expedientes" className="bg-sky-500 text-white text-center py-6 px-4 rounded-lg shadow-md hover:bg-sky-600 transition-colors text-lg font-medium flex items-center justify-center">
                Ver Expedientes
              </Link>
               <Link to="/reportes-medicos" className="bg-indigo-500 text-white text-center py-6 px-4 rounded-lg shadow-md hover:bg-indigo-600 transition-colors text-lg font-medium flex items-center justify-center">
                  <FileText className="w-5 h-5 mr-2" /> Mis Reportes AI
               </Link>
           </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-teal-600 mb-5 text-center">Funcionalidades Destacadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {[
             { 
              title: "Historial Clínico Inteligente", 
              description: "Explora una revolución en el seguimiento médico. Nuestra IA reconstruye y comprende el historial clínico de cada paciente, interpretando datos de forma contextual y precisa para ofrecer una vista 360° jamás antes lograda en la medicina digital.",
              partner: "Asociación A" 
            },
            { 
              title: "Diagnóstico del Futuro con BAMS", 
              description: "Bienvenido a la era del diagnóstico inteligente. BAMS no es solo un asistente, es una IA médica que anticipa complicaciones, propone diagnósticos diferenciales con precisión quirúrgica y recomienda tratamientos personalizados en tiempo real. Tu nuevo copiloto clínico ha llegado.",
              partner: "Asociación B" 
            },
            { 
              title: "Reportes Médicos Autogenerados", 
              description: "La documentación médica evoluciona. Esta IA transforma grandes volúmenes de datos clínicos en reportes claros, comprensibles y listos para compartir, todo en cuestión de segundos.",
              partner: "Asociación C" 
            },
            { 
              title: "Notas Médicas por Voz con IA", 
              description: "Simplemente habla. Nuestra IA especializada en lenguaje médico convierte tu voz en notas clínicas estructuradas, destacando la información más relevante automáticamente. Ahorra tiempo y aumenta la precisión sin mover un dedo.",
              partner: "Asociación D" 
            },
            { 
              title: "Exámenes de Laboratorio con Análisis Predictivo", 
              description: "No más interpretación manual. Esta IA cruza resultados bioquímicos con todo el historial del paciente, detectando patrones ocultos, anomalías emergentes y riesgos invisibles para actuar antes de que sea demasiado tarde.",
              partner: "Asociación E" 
            },
            { 
              title: "Asistente IA de Plataforma", 
              description: "Una guía proactiva en cada clic. Nuestro asistente IA integrado te acompaña desde la esquina inferior derecha para resolver dudas, enseñarte funciones y adaptarse a tu forma de trabajar. Es más que soporte, es un copiloto digital.",
              partner: null 
            }
            
            ].map((feature, index) => (
                 <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                    <h3 className="text-xl font-semibold text-teal-700 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{feature.description}</p>
                    {feature.partner && <p className="text-xs text-gray-500">Potenciado por: <strong>{feature.partner}</strong></p>}
                 </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;