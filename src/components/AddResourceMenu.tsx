import React from 'react';

interface AddResourceMenuProps {
  onSelectResource: (resourceType: string) => void;
  onCancel: () => void;
}

const AddResourceMenu: React.FC<AddResourceMenuProps> = ({ onSelectResource, onCancel }) => {
  // Define the list of resources that can be added
  const resourceTypes = [
    { type: 'Observation', label: 'Observación' },
    // Add other resource types as you create their forms
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">Agregar Recurso</h2>
        <p className="text-gray-700 mb-4">Selecciona el tipo de recurso que deseas agregar:</p>
        <ul className="space-y-2">
          {resourceTypes.map((resource) => (
            <li key={resource.type}>
              <button
                onClick={() => onSelectResource(resource.type)}
                className="w-full text-left px-4 py-2 bg-teal-100 text-teal-800 rounded hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                {resource.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-right">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-gray-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddResourceMenu;
