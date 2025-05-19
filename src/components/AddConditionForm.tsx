import React, { useState } from 'react';

interface AddConditionFormProps {
  onSave: (formData: ConditionFormData) => void;
  onCancel: () => void;
}

interface ConditionFormData {
  codeText: string;
  clinicalStatus: string;
  verificationStatus: string;
  onsetDateTime: string;
  noteText: string;
}

const AddConditionForm: React.FC<AddConditionFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<ConditionFormData>({
    codeText: '',
    clinicalStatus: '',
    verificationStatus: '',
    onsetDateTime: '',
    noteText: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Nueva Condición</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="codeText" className="block text-sm font-medium text-gray-700">Código (¿Qué condición fue diagnosticada?)</label>
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
            <label htmlFor="clinicalStatus" className="block text-sm font-medium text-gray-700">Estado clínico</label>
            <select
              name="clinicalStatus"
              id="clinicalStatus"
              value={formData.clinicalStatus}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Seleccionar Estado</option>
              <option value="active">Activo</option>
              <option value="remission">Remisión</option>
              <option value="resolved">Resuelto</option>
            </select>
          </div>
          <div>
            <label htmlFor="verificationStatus" className="block text-sm font-medium text-gray-700">Estado de verificación</label>
            <select
              name="verificationStatus"
              id="verificationStatus"
              value={formData.verificationStatus}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Seleccionar Estado</option>
              <option value="confirmed">Confirmado</option>
              <option value="suspect">Sospechoso</option>
            </select>
          </div>
          <div>
            <label htmlFor="onsetDateTime" className="block text-sm font-medium text-gray-700">Fecha de inicio de la condición</label>
            <input
              type="datetime-local" // Using datetime-local for combined date and time
              name="onsetDateTime"
              id="onsetDateTime"
              value={formData.onsetDateTime}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">Nota del Doctor (Opcional)</label>
            <textarea
              name="noteText"
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
              Guardar Condición
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddConditionForm;
