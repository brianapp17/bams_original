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
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2 flex-shrink-0">Nuevo Diagnóstico Médico</h2> {/* Added flex-shrink-0 */}

        {/* Form element: Now also the scrollable area. Its children (field divs and buttons div) are laid out in a column by space-y-4 */}
        {/* Added overflow-y-auto and flex-grow */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-grow"> {/* Added overflow-y-auto, flex-grow */}

          {/* Individual form fields are direct children of the form */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              name="date"
              id="date"
              value={formData.date}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
              required
            >
              <option value="">Seleccionar Estado</option>
              <option value="completed">Completado</option>
              <option value="draft">Borrador</option>
              <option value="entered-in-error">Ingresado por error</option>
            </select>
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
              Guardar Diagnóstico Médico
            </button>
          </div>
        </form> {/* End of the scrollable form element */}

      </div> {/* End of inner container */}
    </div> // End of outer container
  );
};

export default AddClinicalImpressionForm;