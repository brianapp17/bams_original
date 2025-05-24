import React, { useState } from 'react';

interface AddAllergyIntoleranceFormProps {
  onSave: (formData: AllergyIntoleranceFormData) => void;
  onCancel: () => void;
}

interface AllergyIntoleranceFormData {
  substance: string; // Corresponds to code.coding[0].display
  clinicalStatus: string; // Corresponds to clinicalStatus.coding[0].code
  note: string;
}

const AddAllergyIntoleranceForm: React.FC<AddAllergyIntoleranceFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<AllergyIntoleranceFormData>({
    substance: '',
 clinicalStatus: '',
 note: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Nueva Alergia/Intolerancia</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="substance" className="block text-sm font-medium text-gray-700">Sustancia/Código</label>
            <input
              type="text"
              name="substance"
              id="substance"
              value={formData.substance}
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
              <option value="inactive">Inactivo</option>
              <option value="resolved">Resuelto</option>
            </select>
          </div>
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700">Notas</label>
            <textarea
              name="note"
              id="note"
 value={formData.note}
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
              Guardar Alergia/Intolerancia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAllergyIntoleranceForm;
