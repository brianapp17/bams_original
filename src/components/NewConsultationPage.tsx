import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const NewConsultationPage: React.FC = () => {
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  const handleNewPatientClick = () => {
    setShowNewPatientForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex p-8">
      <div className="max-w-8xl mx-auto flex w-full space-x-8">
        {/* Left Section: Nuevo Paciente / Form */}
        <div className="flex-1 bg-white p-8 rounded-lg shadow-md flex flex-col items-center justify-center">
          {!showNewPatientForm ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Nuevo Paciente</h2>
              <p className="text-gray-600 mb-6">Iniciar una consulta con un paciente que no está registrado.</p>
              <button
                onClick={handleNewPatientClick}
                className="block w-full bg-teal-600 text-white py-3 px-6 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 text-lg font-semibold"
              >
                Crear Nuevo Paciente
              </button>
            </div>
          ) : (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Registrar Nuevo Paciente</h2>
              {/* New Patient Form Goes Here */}
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                  <input type="text" name="name" id="name" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
                  <input type="date" name="dob" id="dob" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                 <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">Número de Identificación (DUI)</label>
                  <input type="text" name="identifier" id="identifier" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                 <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Género</label>
                  <select id="gender" name="gender" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">Seleccionar...</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                {/* Add more fields as needed */}
                <button 
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-semibold"
                >
                  Registrar y Continuar
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Section: Paciente Registrado */}
        <div className="flex-1 bg-white p-8 rounded-lg shadow-md flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Paciente Registrado</h2>
            <p className="text-gray-600 mb-6">Continuar con una consulta para un paciente existente.</p>
            <Link 
              to="/" // Link to the main patient records page
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-lg font-semibold"
            >
              Seleccionar Paciente
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewConsultationPage;