// src/components/AddObservationForm.tsx
import React, { useState } from 'react';

interface AddObservationFormProps {
  onSave: (formData: ObservationFormData) => void;
  onCancel: () => void;
}

// --- AÑADE 'export' AQUÍ ---
export interface ObservationFormData {
  codeText: string;
  value: string;
  unit: string;
  effectiveDateTime: string;
  noteText: string; // Para la nota, asegúrate que el handler la use con esta clave
}
// --- FIN DE LA CORRECCIÓN ---

const AddObservationForm: React.FC<AddObservationFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<ObservationFormData>({
    codeText: '',
    value: '',
    unit: '',
    effectiveDateTime: '',
    noteText: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codeText || !formData.value || !formData.unit || !formData.effectiveDateTime) {
        alert('Por favor, complete Código, Valor Medido, Unidad y Fecha de Observación.');
        return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Nueva Observación</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="codeText" className="block text-sm font-medium text-gray-700">Observación</label>
            <input
              type="text"
              name="codeText"
              id="codeText"
              value={formData.codeText}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700">Valor Medido</label>
            <input
              type="text"
              name="value"
              id="value"
              value={formData.value}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unidad</label>
            <input
              type="text"
              name="unit"
              id="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="effectiveDateTime" className="block text-sm font-medium text-gray-700">Fecha de Observación</label>
            <input
              type="datetime-local"
              name="effectiveDateTime"
              id="effectiveDateTime"
              value={formData.effectiveDateTime}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">Nota del Doctor (Opcional)</label>
            <textarea
              name="noteText" // Esta es la clave que usaremos en el handler
              id="noteText"
              rows={3}
              value={formData.noteText}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            ></textarea>
          </div>
          <div className="mt-6 text-right flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-800 mr-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Guardar Observación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddObservationForm;