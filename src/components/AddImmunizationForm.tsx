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
    noteText: '',
  });

  // Type signature is already correct here: HTMLTextAreaElement
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    // The core save logic remains untouched
    onSave(formData);
  };

  return (
    // Outer container: Fixed, full screen, overlay, centered flex, added padding
    // Removed h-full w-full as inset-0 covers this
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto z-50 flex justify-center items-center p-4"> {/* Added p-4 */}
      {/* Inner container: White box, max width, responsive max height, internal flex column layout */}
      {/* Added max-h-[95vh] to limit height, overflow-hidden and flex/flex-col to control internal scrolling */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col"> {/* Added max-h-[95vh], overflow-hidden, flex, flex-col */}
        {/* Título del formulario - added flex-shrink-0 */}
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex-shrink-0">Agregar Inmunización/Vacuna</h3> {/* Added flex-shrink-0 */}

        {/* Form element: Now also the scrollable area. Its children (field divs and buttons div) are laid out in a column by space-y-4 */}
        {/* Added overflow-y-auto and flex-grow */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-grow"> {/* Added overflow-y-auto, flex-grow */}

          {/* Individual form fields are direct children of the form */}
          <div>
            <label htmlFor="vaccineCode" className="block text-sm font-medium text-gray-700">
              Vacuna (Nombre/Tipo)
            </label>
            <input
              type="text"
              name="vaccineCode"
              id="vaccineCode"
              value={formData.vaccineCode}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
            >
                {/* The default value 'completed' is set in state, no blank option needed unless desired */}
                <option value="completed">Completado</option>
                <option value="entered-in-error">Ingresado por Error</option>
                <option value="not-done">No Realizado</option>
              </select>
            </div>
            <div>
              <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">
                Nota del Doctor (Opcional)
              </label>
              <textarea
                name="noteText"
                id="noteText"
                value={formData.noteText}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
              ></textarea>
            </div>

          {/* Buttons container - moved back INSIDE the form */}
          {/* Relies on space-y-4 on the form for spacing from the last field */}
          <div className="flex justify-end space-x-3 flex-shrink-0"> {/* Removed mt-6, added flex-shrink-0 */}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit" // This button type triggers the form's onSubmit
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Guardar Inmunización
            </button>
          </div>
        </form> {/* End of the scrollable form element */}

      </div> {/* End of inner container */}
    </div> // End of outer container
  );
};

export default AddImmunizationForm;