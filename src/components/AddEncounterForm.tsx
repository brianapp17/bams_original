// src/components/AddEncounterForm.tsx
import React, { useState } from 'react';

interface AddEncounterFormProps {
  onSave: (formData: EncounterFormData) => void;
  onCancel: () => void;
}

export interface EncounterFormData { // Added export for potential external use
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

  // Type signature is already correct here: HTMLTextAreaElement
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { // Added HTMLSelectElement in case it's ever needed
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation (added for robustness, won't break logic)
    if (!formData.type || !formData.reason || !formData.periodStart) {
        alert('Por favor, complete Tipo, Motivo y Fecha de inicio del encuentro.');
        return;
    }
    // The core save logic remains untouched
    onSave(formData);
  };

  return (
    // Outer container: Fixed, full screen, overlay, centered flex, added padding
    // Removed overflow-y-auto h-full w-full as inset-0 handles this
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"> {/* Added p-4 */}
      {/* Inner container: White box, max width, responsive max height, internal flex column layout */}
      {/* Added max-h-[95vh] to limit height, overflow-hidden and flex/flex-col to control internal scrolling */}
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm max-h-[95vh] overflow-hidden flex flex-col"> {/* Adjusted p-8 to p-6, added max-h-[95vh], overflow-hidden, flex, flex-col */}
        {/* Título del formulario - added flex-shrink-0 */}
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2 flex-shrink-0">Nuevo Encuentro</h2> {/* Added flex-shrink-0 */}

        {/* Form element: Now also the scrollable area. Its children (field divs and buttons div) are laid out in a column by space-y-4 */}
        {/* Added overflow-y-auto and flex-grow */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-grow"> {/* Added overflow-y-auto, flex-grow */}

          {/* Individual form fields are direct children of the form */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo de encuentro</label>
            <input
              type="text"
              name="type"
              id="type"
              value={formData.type}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
              placeholder="Ej: Consulta General,Control de Enfermedad Cronica."
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
              required
            />
          </div>
          <div>
            <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700">Fecha de fin del encuentro</label>
            <input
              type="datetime-local"
              name="periodEnd"
              id="periodEnd"
              value={formData.periodEnd}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              Guardar Encuentro
            </button>
          </div>
        </form> {/* End of the scrollable form element */}

      </div> {/* End of inner container */}
    </div> // End of outer container
  );
};

export default AddEncounterForm;