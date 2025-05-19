import React, { useState } from 'react';

interface AddProcedureFormProps {
  onSave: (formData: ProcedureFormData) => void;
  onCancel: () => void;
}

interface ProcedureFormData {
  codeText: string;
  status: string;
  performedDateTime: string;
  noteText: string;
}

const AddProcedureForm: React.FC<AddProcedureFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<ProcedureFormData>({
    codeText: '',
    status: '',
    performedDateTime: '',
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
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Nuevo Procedimiento</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="codeText" className="block text-sm font-medium text-gray-700">Código (Nombre del procedimiento)</label>
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
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado del procedimiento</label>
            <select
              name="status"
              id="status"
              value={formData.status}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Seleccionar Estado</option>
              <option value="completed">Finalizado</option>
              <option value="in-progress">En curso</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
          <div>
            <label htmlFor="performedDateTime" className="block text-sm font-medium text-gray-700">Fecha del procedimiento</label>
            <input
              type="datetime-local"
              name="performedDateTime"
              id="performedDateTime"
              value={formData.performedDateTime}
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
              Guardar Procedimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProcedureForm;
