import React from 'react';
import { User } from 'lucide-react';
import { PatientInfo } from '../types';

interface PatientSidebarProps {
  patientInfo: PatientInfo | null;
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

const PatientSidebar: React.FC<PatientSidebarProps> = ({
  patientInfo,
  categories,
  selectedCategory,
  setSelectedCategory
}) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 fixed h-full">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-800">
          <User className="w-5 h-5" />
          <span className="font-medium">Información del Paciente</span>
        </div>
        {patientInfo && (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">{patientInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">DUI</p>
              <p className="font-medium">{patientInfo.identifier}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
              <p className="font-medium">{new Date(patientInfo.birthDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Género</p>
              <p className="font-medium">{patientInfo.gender === 'female' ? 'Femenino' : 'Masculino'}</p>
            </div>
          </div>
        )}
        
        {/* Categories */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Categorías</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  category === selectedCategory
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default PatientSidebar;