import React from 'react';
import { UserSearch } from 'lucide-react';
import type { PatientListItem } from '../types';

interface PatientSelectorProps {
  patients: PatientListItem[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const PatientSelector: React.FC<PatientSelectorProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  isLoading
})=> {
  return (
    <div className="fixed top-0 right-1/2 transform translate-x-1/2 z-50 bg-white shadow-lg rounded-b-lg px-4 py-2">
      <div className="flex items-center gap-2">
        <UserSearch className="w-5 h-5 text-blue-500" />
        <select
          className="pl-2 pr-8 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedPatientId || ''}
          onChange={(e) => onSelectPatient(e.target.value)}
          disabled={isLoading}
        >
          <option value="">Seleccionar Paciente</option>
          {patients.map((patient) => (
            <option key={patient.Id} value={patient.Id}>
              {patient.Name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PatientSelector;