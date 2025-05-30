// src/components/AddMedicationRequestForm.tsx
import React, { useState } from 'react';

// Define la interfaz para los datos del formulario
export interface MedicationRequestFormData {
  medicationName: string; // Nombre del medicamento
  dosageInstructionText: string; // Instrucciones
  routeText: string; // Vía de administración
  authoredOn: string; // Fecha de solicitud
  intent: string; // order / plan / proposal / instance-order
  status: string; // active / completed / stopped / draft / cancelled / entered-in-error
  noteText: string; // Nota opcional (inicializada como string vacío)
}

interface AddMedicationRequestFormProps {
  onSave: (formData: MedicationRequestFormData) => Promise<void>; // Accepts form data, returns Promise because saving is async
  onCancel: () => void; // Callback to close the form
}

const AddMedicationRequestForm: React.FC<AddMedicationRequestFormProps> = ({
  onSave,
  onCancel,
}) => {
  // --- State managed as a single object ---
  const [formData, setFormData] = useState<MedicationRequestFormData>({
    medicationName: '',
    dosageInstructionText: '',
    routeText: '', // Initialize optional field
    authoredOn: '',
    intent: '', // Start with empty to force selection if required
    status: '', // Start with empty to force selection if required
    noteText: '', // Initialize optional note
  });
  // --- End state management ---


  // --- Generic input change handler ---
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  // --- End handler ---


  // --- Submit handler calls onSave with formData ---
  const handleSubmit = async (event: React.FormEvent) => { // Made async because onSave is async
    event.preventDefault();
    // Basic validation (matching required fields in JSX)
    if (!formData.medicationName || !formData.dosageInstructionText || !formData.authoredOn || !formData.intent || !formData.status) {
        alert('Por favor, complete todos los campos obligatorios (Nombre del medicamento, Instrucción de dosis, Fecha, Intención, Estado).');
        return;
    }
    console.log('Submitting form data:', formData); // Log the data being sent

    // The onSave handler in the parent component (PatientDetailView) is responsible for the actual saving
    // and for calling handleCloseForm() upon successful save.
    await onSave(formData); // Call onSave with the formData object
  };
  // --- End submit handler ---


  return (
    // Outer container: Fixed, full screen, overlay, centered flex, added padding
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center p-4"> {/* Added p-4 for padding on small screens */}
      {/* Inner container: White box, max width, responsive max height, internal flex column layout */}
      {/* Added max-h-[95vh] to limit height, overflow-hidden and flex/flex-col to control internal scrolling */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col">
        {/* Título del formulario en español - flex-shrink-0 prevents it from shrinking */}
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex-shrink-0">Nueva Solicitud de Medicamento</h3>

        {/* Form element: Now also the scrollable area. Children (field divs and buttons div) are laid out in a column by space-y-4 */}
        {/* Added overflow-y-auto and flex-grow. Removed the intermediate wrapper div. */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-grow">

          {/* Individual form fields remain direct children of the form */}
          <div>
            <label htmlFor="medicationName" className="block text-sm font-medium text-gray-700">
              Nombre del medicamento
            </label>
            <input
              type="text"
              name="medicationName"
              id="medicationName"
              value={formData.medicationName}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
              placeholder="Ej: Lisinopril 10mg"
            />
          </div>

          <div>
            <label htmlFor="dosageInstructionText" className="block text-sm font-medium text-gray-700">
              Instrucción de Dosis
            </label>
            <textarea
              name="dosageInstructionText"
              id="dosageInstructionText"
              value={formData.dosageInstructionText}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
              placeholder="Ej: 1 tableta una vez al día"
            ></textarea>
          </div>

          <div>
            <label htmlFor="routeText" className="block text-sm font-medium text-gray-700">
              Vía de administración (Opcional)
            </label>
            <input
              type="text"
              name="routeText"
              id="routeText"
              value={formData.routeText}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="Ej: Oral"
             />
          </div>

          <div>
            <label htmlFor="authoredOn" className="block text-sm font-medium text-gray-700">
              Fecha de Solicitud
            </label>
            <input
              type="date"
              name="authoredOn"
              id="authoredOn"
              value={formData.authoredOn}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:gap-x-4">
  <div className="flex-1">
    <label htmlFor="intent" className="block text-sm font-medium text-gray-700">
      Intención
    </label>
    <select
      name="intent"
      id="intent"
      value={formData.intent}
      onChange={handleInputChange}
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
      required
    >
      <option value="">Seleccionar intención</option>
      <option value="order">Orden</option>
      <option value="plan">Plan</option>
      <option value="proposal">Propuesta</option>
      <option value="instance-order">Orden de Instancia</option>
    </select>
  </div>

  <div className="flex-1">
    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
      Estado
    </label>
    <select
      name="status"
      id="status"
      value={formData.status}
      onChange={handleInputChange}
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
      required
    >
      <option value="">Seleccionar estado</option>
      <option value="active">Activa</option>
      <option value="completed">Completada</option>
      <option value="stopped">Detenida</option>
      <option value="draft">Borrador</option>
      <option value="cancelled">Cancelada</option>
      <option value="entered-in-error">Ingresada con Error</option>
    </select>
  </div>
</div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              name="status"
              id="status"
              value={formData.status}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
            >
              <option value="">Seleccionar estado</option>
              <option value="active">Activa</option>
              <option value="completed">Completada</option>
              <option value="stopped">Detenida</option>
              <option value="draft">Borrador</option>
              <option value="cancelled">Cancelada</option>
              <option value="entered-in-error">Ingresada con Error</option>
            </select>
          </div>

            <div>
              <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">
                Nota del Doctor (Opcional)
              </label>
              <textarea
                name="noteText"
                id="noteText"
                rows={2}
                value={formData.noteText}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500" // Added focus styles
              ></textarea>
            </div>

            {/* Buttons container - moved back INSIDE the form */}
            {/* Removed mt-6 here as space-y-4 on the form handles spacing */}
            <div className="flex justify-end space-x-4"> {/* Removed mt-6 */}
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit" // This button type triggers the form's onSubmit
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Guardar Solicitud
                </button>
            </div>

        </form> {/* End of the scrollable form element */}

      </div> {/* End of inner container */}
    </div> // End of outer container
  );
};

export default AddMedicationRequestForm;