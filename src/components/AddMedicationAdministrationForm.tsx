// src/components/AddMedicationAdministrationForm.tsx
import React, { useState } from 'react';

interface AddMedicationAdministrationFormProps {
  onSave: (formData: MedicationAdministrationFormData) => void;
  onCancel: () => void;
}

export interface MedicationAdministrationFormData { // Added export
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

   // Corrected the type here: React.TextAreaElement -> HTMLTextAreaElement
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     // Basic validation (added for robustness, won't break logic)
    if (!formData.medicationName || !formData.dosageValue || !formData.dosageUnit || !formData.route || !formData.effectiveDateTime) {
        alert('Por favor, complete todos los campos obligatorios (Nombre, Dosis, Unidad, Vía, Fecha).');
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
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2 flex-shrink-0">Nuevo Medicamento Administrado</h2> {/* Added flex-shrink-0 */}

        {/* Form element: Now also the scrollable area. Its children (field divs and buttons div) are laid out in a column by space-y-4 */}
        {/* Added overflow-y-auto and flex-grow */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-grow"> {/* Added overflow-y-auto, flex-grow */}

          {/* Individual form fields are direct children of the form */}
          <div>
            <label htmlFor="medicationName" className="block text-sm font-medium text-gray-700">Nombre del medicamento</label>
            <input
              type="text"
              name="medicationName"
              id="medicationName"
              value={formData.medicationName}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
               className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
              required
            />
          </div>
          <div>
            <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">Nota del Doctor</label>
            <textarea
              name="noteText"
              id="noteText"
              rows={3}
              value={formData.noteText}
              onChange={handleInputChange}
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
              Guardar Medicamento Administrado
            </button>
          </div>
        </form> {/* End of the scrollable form element */}

      </div> {/* End of inner container */}
    </div> // End of outer container
  );
};

export default AddMedicationAdministrationForm;