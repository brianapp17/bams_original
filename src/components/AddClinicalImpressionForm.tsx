// src/components/AddClinicalImpressionForm.tsx
import React, { useState } from 'react';

interface AddClinicalImpressionFormProps {
  onSave: (formData: ClinicalImpressionFormData) => void;
  onCancel: () => void;
}

// ¡Añade 'export' aquí! Y tipo 'string' para noteText
export interface ClinicalImpressionFormData {
  date: string;
  description: string;
  status: string; // completed / draft / entered-in-error
  noteText: string; // <--- Tipo corregido a 'string'
}

const AddClinicalImpressionForm: React.FC<AddClinicalImpressionFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<ClinicalImpressionFormData>({
    date: '',
    description: '',
    status: '',
    noteText: '', // <--- Inicializado correctamente
  });

  // Asegúrate de que el handler también pueda manejar HTMLTextAreaElement
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validaciones básicas para campos requeridos
    if (!formData.date || !formData.description || !formData.status) {
      alert('Por favor, complete la Fecha, Descripción y Estado.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Nuevo Diagnóstico Médico</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              name="date"
              id="date"
              value={formData.date}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              name="description"
              id="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            ></textarea>
          </div>
          {/* --- AÑADIDO: Campo para noteText --- */}
          <div>
            <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">Nota Adicional (Opcional)</label>
            <textarea
              name="noteText"
              id="noteText"
              rows={2}
              value={formData.noteText}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            ></textarea>
          </div>
          {/* --- FIN CAMPO AÑADIDO --- */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              name="status"
              id="status"
              value={formData.status}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Seleccionar Estado</option>
              <option value="completed">Completado</option>
              <option value="draft">Borrador</option>
              <option value="entered-in-error">Ingresado por error</option>
            </select>
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
              Guardar Diagnóstico Médico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClinicalImpressionForm;