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
  // --- Prop name corrected and type updated to expect formData ---
  onSave: (formData: MedicationRequestFormData) => Promise<void>; // Accepts form data, returns Promise because saving is async
  // --- End prop correction ---
  onCancel: () => void; // Callback to close the form
}

const AddMedicationRequestForm: React.FC<AddMedicationRequestFormProps> = ({
  onSave, // --- Prop name corrected ---
  onCancel,
}) => {
  // --- State managed as a single object ---
  const [formData, setFormData] = useState<MedicationRequestFormData>({
    medicationName: '',
    dosageInstructionText: '',
    routeText: '', // Initialize optional field
    authoredOn: '',
    intent: 'order', // Common default
    status: 'active', // Common default
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Nueva Solicitud de Medicamento</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="medicationName" className="block text-sm font-medium text-gray-700">
              Nombre del medicamento
            </label>
            <input
              type="text"
              name="medicationName" // --- Added name attribute to match formData key ---
              id="medicationName"
              value={formData.medicationName} // --- Use formData state ---
              onChange={handleInputChange} // --- Use generic handler ---
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required // --- Make required ---
              placeholder="Ej: Lisinopril 10mg"
            />
          </div>

          <div>
            <label htmlFor="dosageInstructionText" className="block text-sm font-medium text-gray-700">
              Instrucción de Dosis
            </label>
            <textarea
              name="dosageInstructionText" // --- Added name attribute ---
              id="dosageInstructionText"
              value={formData.dosageInstructionText} // --- Use formData state ---
              onChange={handleInputChange} // --- Use generic handler ---
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required // --- Make required ---
              placeholder="Ej: 1 tableta una vez al día"
            ></textarea>
          </div>

          <div>
            <label htmlFor="routeText" className="block text-sm font-medium text-gray-700">
              Vía de administración (Opcional)
            </label>
             {/* Using input type="text" as defined in your previous formData structure */}
            <input
              type="text"
              name="routeText" // --- Added name attribute ---
              id="routeText"
              value={formData.routeText} // --- Use formData state ---
              onChange={handleInputChange} // --- Use generic handler ---
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="Ej: Oral"
             />
            {/* If you prefer a select, uncomment this and adjust handleInputChange if needed */}
            {/*
            <select
              name="routeText" // --- Added name attribute ---
              id="routeText"
              value={formData.routeText}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Seleccionar vía</option> // Ensure value matches what you want to save/display
              <option value="Oral route">Oral</option>
              <option value="Intravenosa">Intravenosa</option>
              <option value="Tópica">Tópica</option>
              <option value="Subcutánea">Subcutánea</option>
            </select>
            */}
          </div>

          <div>
            <label htmlFor="authoredOn" className="block text-sm font-medium text-gray-700">
              Fecha de Solicitud
            </label>
            <input
              type="date" // Or 'datetime-local' if including time
              name="authoredOn" // --- Added name attribute ---
              id="authoredOn"
              value={formData.authoredOn} // --- Use formData state ---
              onChange={handleInputChange} // --- Use generic handler ---
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required // --- Make required ---
            />
          </div>

          <div>
            <label htmlFor="intent" className="block text-sm font-medium text-gray-700">
              Intención
            </label>
            <select
              name="intent" // --- Added name attribute ---
              id="intent"
              value={formData.intent} // --- Use formData state ---
              onChange={handleInputChange} // --- Use generic handler ---
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required // --- Make required ---
            >
              <option value="">Seleccionar intención</option> {/* Added empty default option */}
              <option value="order">Order</option>
              <option value="plan">Plan</option>
              <option value="proposal">Proposal</option>
              <option value="instance-order">Instance Order</option> {/* Added display text */}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              name="status" // --- Added name attribute ---
              id="status"
              value={formData.status} // --- Use formData state ---
              onChange={handleInputChange} // --- Use generic handler ---
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required // --- Make required ---
            >
              <option value="">Seleccionar estado</option> {/* Added empty default option */}
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="stopped">Stopped</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
              <option value="entered-in-error">Entered in Error</option> {/* Added display text */}
            </select>
          </div>

           {/* --- Added optional note field --- */}
             <div>
              <label htmlFor="noteText" className="block text-sm font-medium text-gray-700">
                Nota del Doctor (Opcional)
              </label>
              <textarea
                name="noteText" // --- Added name attribute ---
                id="noteText"
                rows={2}
                value={formData.noteText} // --- Use formData state ---
                onChange={handleInputChange} // --- Use generic handler ---
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              ></textarea>
            </div>
           {/* --- End optional note field --- */}


          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Guardar Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicationRequestForm;