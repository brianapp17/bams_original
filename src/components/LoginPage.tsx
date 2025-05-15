import React from 'react';

const LoginPage: React.FC = () => {
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
          <h2 className="text-2xl font-bold text-center text-teal-700 mb-6">BAMS Login</h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Nombre de usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Login
            </button>
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
</ul>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;