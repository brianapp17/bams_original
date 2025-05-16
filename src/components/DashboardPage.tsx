import React from 'react';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-teal-800 mb-8">Bienvenido a BAMS: Tu Asistente Clínico de IA</h1>

        <p className="text-center text-gray-700 text-lg mb-10">
          Llevamos la atención médica al siguiente nivel con tecnología de vanguardia y inteligencia artificial.
        </p>

        {/* Graphs Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-teal-700 mb-4">Estadísticas Clave</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Simulated Graph 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-blue-200 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-blue-600 mb-3">Pacientes Atendidos (Mensual)</h3>
              {/* Placeholder for a chart */}
              <div className="w-full h-40 bg-blue-100 flex items-center justify-center text-gray-500">
                [Gráfico de Barras Aquí]
              </div>
              <p className="text-sm text-gray-600 mt-3">Datos simulados</p>
            </div>

            {/* Simulated Graph 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-green-200 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-green-600 mb-3">Promedio de Consultas (Semanal)</h3>
               {/* Placeholder for a chart */}
              <div className="w-full h-40 bg-green-100 flex items-center justify-center text-gray-500">
                [Gráfico de Líneas Aquí]
              </div>
              <p className="text-sm text-gray-600 mt-3">Datos simulados</p>
            </div>

            {/* Simulated Graph 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-yellow-200 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-yellow-700 mb-3">Tipos de Padecimientos Comunes</h3>
               {/* Placeholder for a chart */}
              <div className="w-full h-40 bg-yellow-100 flex items-center justify-center text-gray-500">
                [Gráfico Circular Aquí]
              </div>
              <p className="text-sm text-gray-600 mt-3">Datos simulados</p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons Section */}
        <div className="mb-12">
           <h2 className="text-2xl font-semibold text-teal-700 mb-4">Navegación Rápida</h2>
           {/* Adjusted grid layout for buttons */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
              {/* Nueva Consulta button - spans 2 columns */}
              <Link to="/nueva-consulta" className="block bg-teal-600 text-white text-center py-4 px-6 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 text-xl font-semibold lg:col-span-2">
                 + Nueva Consulta
              </Link>

              {/* Expedientes button */}
              <Link to="/" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                 Expedientes
              </Link>

              {/* Reportes médicos button */}
               <Link to="/reportes-medicos" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                 Reportes médicos
              </Link>

              {/* Tareas pendientes button */}
              <Link to="/tareas-pendientes" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                 Tareas pendientes
              </Link>

              {/* Configuración del perfil button */}
              <Link to="/configuracion" className="block bg-teal-600 text-white text-center py-3 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                 Configuración del perfil
              </Link>
           </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1: Historial clínico completo */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Historial Clínico Completo</h2>
            <p className="text-gray-700 mb-4">
              Visualización e interpretación instantánea de datos y resultados, todo en un solo lugar.
              Accede a un historial médico completo y organizado para una comprensión profunda del paciente.
            </p>
            <p className="text-sm text-gray-600">Potenciado por: <strong>Asociacion A</strong></p>
          </div>

          {/* Feature 2: Chat con asistente IA */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Chat con Asistente BAMS</h2>
            <p className="text-gray-700 mb-4">
              Obtén respuestas médicas a consultas basadas en síntomas y antecedentes del paciente.
              Nuestro asistente de IA te brinda soporte en tiempo real para decisiones clínicas informadas.
            </p>
            <p className="text-sm text-gray-600">Colaboración con: <strong>Asociacion B</strong></p>
          </div>

          {/* Feature 3: Reportes automáticos */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Reportes Automáticos Inteligentes</h2>
            <p className="text-gray-700 mb-4">
              Generación en PDF de resúmenes clínicos generados por IA, listos para compartir.
              Ahorra tiempo y esfuerzo en la creación de documentación médica esencial.
            </p>
            <p className="text-sm text-gray-600">Con tecnología de: <strong>Asociacion C</strong></p>
          </div>

          {/* Feature 4: Notas por voz */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Dictado Médico Inteligente</h2>
            <p className="text-gray-700 mb-4">
              Crea y almacena notas médicas importantes mediante grabaciones de audio analizadas e interpretadas por IA para generar la nota.Con solo un botón.
              Documenta consultas y observaciones de manera rápida y conveniente.
            </p>
            <p className="text-sm text-gray-600">Integración con: <strong>Asociacion D</strong></p>
          </div>

          {/* Feature 5: Análisis bioquímico inteligente */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Análisis Bioquímico Inteligente</h2>
            <p className="text-gray-700 mb-4">
              Interpreta exámenes de laboratorio con contexto histórico de cada paciente.
              Obtén insights valiosos sobre las tendencias y cambios en los resultados a lo largo del tiempo.
            </p>
            <p className="text-sm text-gray-600">Con el apoyo de: <strong>Asociacion E</strong></p>
          </div>

          {/* New Feature: Asistente IA Guía para nuevos usuarios */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-2xl font-semibold text-teal-700 mb-3">Asistente IA Guía para nuevos usuarios</h2>
            <p className="text-gray-700 mb-4">
              En la esquina inferior derecha de tu pantalla encontrarás un botón de chat.
              Este es tu asistente de IA, disponible las 24 horas del día, los 7 días de la semana,
              para responder cualquier duda que tengas sobre la plataforma, sus procesos, funciones y más.
              ¡No dudes en consultarle!
            </p>
            {/* No specific technology partner mentioned for the guide itself, so omitted. */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;