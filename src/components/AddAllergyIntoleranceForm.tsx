// src/components/AddAllergyIntoleranceForm.tsx
import React, { useState } from 'react';

interface AddAllergyIntoleranceFormProps {
  onSave: (formData: AllergyIntoleranceFormData) => void;
  onCancel: () => void;
}

export interface AllergyIntoleranceFormData {
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
    // Basic validation (added for robustness)
    if (!formData.substance || !formData.clinicalStatus) {
        alert('Por favor, complete Sustancia/Alergia y Estado clínico.');
        return;
    }
    // The core save logic remains untouched
    onSave(formData);
  };

  return (
    // Outer container: Fixed, full screen, overlay, centered flex, added padding
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"> {/* Added p-4 */}
      {/* Inner container: White box, max width, responsive max height, internal flex column layout */}
      {/* Added max-h-[95vh] to limit height, overflow-hidden and flex/flex-col to control internal scrolling */}
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm max-h-[95vh] overflow-hidden flex flex-col"> {/* Adjusted p-8 to p-6, added max-h-[95vh], overflow-hidden, flex, flex-col */}
        {/* Título del formulario - added flex-shrink-0 */}
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2 flex-shrink-0">Nueva Alergia/Intolerancia</h2> {/* Added flex-shrink-0 */}

        {/* Form element: Now also the scrollable area. Its children (field divs and buttons div) are laid out in a column by space-y-4 */}
        {/* Added overflow-y-auto and flex-grow */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-grow"> {/* Added overflow-y-auto, flex-grow */}

          {/* Individual form fields are direct children of the form */}
          <div>
            <label htmlFor="substance" className="block text-sm font-medium text-gray-700">Sustancia/Alergia</label>
            <input
              type="text"
              name="substance"
              id="substance"
              value={formData.substance}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              rows={3} // Added default rows for textarea
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
            ></textarea>
          </div>

           {/* Buttons container - moved back INSIDE the form */}
          {/* Relies on space-y-4 on the form for spacing from the last field */}
          <div className="text-right flex justify-end flex-shrink-0"> {/* Removed mt-6, added flex-shrink-0 */}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-800 mr-2"
            >
              Cancelar
            </button>
            <button
              type="submit" // This button type triggers the form's onSubmit
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Guardar Alergia/Intolerancia
            </button>
          </div>
        </form> {/* End of the scrollable form element */}

      </div> {/* End of inner container */}
    </div> // End of outer container
  );
};

export default AddAllergyIntoleranceForm;