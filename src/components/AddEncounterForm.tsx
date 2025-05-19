import React, { useState } from 'react';

interface AddEncounterFormProps {
  onSave: (formData: EncounterFormData) => void;
  onCancel: () => void;
}

interface EncounterFormData {
  type: string;
  reason: string;
  periodStart: string;
  periodEnd: string;
  noteText: string;
}

const AddEncounterForm: React.FC<AddEncounterFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<EncounterFormData>({
    type: '',
    reason: '',
    periodStart: '',
    periodEnd: '',
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
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Nuevo Encuentro</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo de encuentro</label>
            <input
              type="text"
              name="type"
              id="type"
              value={formData.type}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo del encuentro</label>
            <input
              type="text"
              name="reason"
              id="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="periodStart" className="block text-sm font-medium text-gray-700">Fecha de inicio del encuentro</label>
            <input
              type="datetime-local"
              name="periodStart"
              id="periodStart"
              value={formData.periodStart}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700">Fecha de fin del encuentro (Opcional)</label>
            <input
              type="datetime-local"
              name="periodEnd"
              id="periodEnd"
              value={formData.periodEnd}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
              Guardar Encuentro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEncounterForm;
