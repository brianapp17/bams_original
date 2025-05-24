// src/components/AddImmunizationForm.tsx
import React, { useState } from 'react';

export interface ImmunizationFormData {
  vaccineCode: string;
  occurrenceDateTime: string;
  status: 'completed' | 'entered-in-error' | 'not-done';
  noteText: string; // Aseguramos que sea string
}

interface AddImmunizationFormProps {
  onSave: (formData: ImmunizationFormData) => void;
  onCancel: () => void;
}

const AddImmunizationForm: React.FC<AddImmunizationFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<ImmunizationFormData>({
    vaccineCode: '',
    occurrenceDateTime: '',
    status: 'completed',
    noteText: '', // <-- ¡CORRECCIÓN 1: Inicializa noteText aquí!
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { // <-- Añadimos HTMLTextAreaElement aquí
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.vaccineCode || !formData.occurrenceDateTime) {
      alert('Por favor, complete el código de vacuna y la fecha.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Agregar Inmunización/Vacuna</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="vaccineCode" className="block text-sm font-medium text-gray-700">
                Código de Vacuna (Nombre/Tipo)
              </label>
              <input
                type="text"
                name="vaccineCode"
                id="vaccineCode"
                value={formData.vaccineCode}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="Ej: MMR, COVID-19, Influenza"
              />
            </div>
            <div>
              <label htmlFor="occurrenceDateTime" className="block text-sm font-medium text-gray-700">
                Fecha de Ocurrencia (Administración)
              </label>
              <input
                type="date"
                name="occurrenceDateTime"
                id="occurrenceDateTime"
                value={formData.occurrenceDateTime}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="completed">Completado</option>
                <option value="entered-in-error">Ingresado por Error</option>
                <option value="not-done">No Realizado</option>
              </select>
            </div>
            {/* <-- ¡CORRECCIÓN 2: Añade este campo de nota al JSX! --> */}
            <div>
              <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">
                Nota del Doctor (Opcional)
              </label>
              <textarea
                name="noteText"
                id="noteText"
                value={formData.noteText}
                onChange={handleChange}
                rows={2} // Puedes ajustar el número de filas
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              ></textarea>
            </div>
            {/* <-- Fin de la Corrección 2 --> */}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
            >
              Guardar Inmunización
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddImmunizationForm;