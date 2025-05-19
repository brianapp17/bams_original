import React, { useState } from 'react';

interface AddMedicationAdministrationFormProps {
  onSave: (formData: MedicationAdministrationFormData) => void;
  onCancel: () => void;
}

interface MedicationAdministrationFormData {
  medicationName: string;
  dosageValue: string;
  dosageUnit: string; // Using string for now, could be a selector later
  route: string;
  effectiveDateTime: string;
  noteText: string;
}

const AddMedicationAdministrationForm: React.FC<AddMedicationAdministrationFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<MedicationAdministrationFormData>({
    medicationName: '',
    dosageValue: '',
    dosageUnit: '',
    route: '',
    effectiveDateTime: '',
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
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Nuevo Medicamento Administrado</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="medicationName" className="block text-sm font-medium text-gray-700">Nombre del medicamento</label>
            <input
              type="text"
              name="medicationName"
              id="medicationName"
              value={formData.medicationName}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="dosageValue" className="block text-sm font-medium text-gray-700">Dosis administrada</label>
            <input
              type="text"
              name="dosageValue"
              id="dosageValue"
              value={formData.dosageValue}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="dosageUnit" className="block text-sm font-medium text-gray-700">Unidad de dosis</label>
            <input
               type="text"
               name="dosageUnit"
               id="dosageUnit"
               value={formData.dosageUnit}
               onChange={handleInputChange}
               className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
               required
            />
            {/* Could be a select with options like tableta, ml, mg, cápsula */}
          </div>
          <div>
            <label htmlFor="route" className="block text-sm font-medium text-gray-700">Vía de administración</label>
            <select
              name="route"
              id="route"
              value={formData.route}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Seleccionar Vía</option>
              <option value="oral">Oral</option>
              <option value="intravenous">Intravenosa</option>
              <option value="topical">Tópica</option>
              <option value="subcutaneous">Subcutánea</option>
              {/* Add other common routes */}
            </select>
          </div>
          <div>
            <label htmlFor="effectiveDateTime" className="block text-sm font-medium text-gray-700">Fecha de administración</label>
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
              Guardar Medicamento Administrado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicationAdministrationForm;
