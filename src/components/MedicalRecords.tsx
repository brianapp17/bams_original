import React from 'react';
import { TestTube2, FileText, Pill, ClipboardList, FileSpreadsheet } from 'lucide-react';
import { ApiResponse } from '../types';
import { getCategoryLabel } from '../api';

interface MedicalRecordsProps {
  results: ApiResponse | null;
  isLoading: boolean;
  selectedCategory: string | null;
}

const MedicalRecords: React.FC<MedicalRecordsProps> = ({ 
  results, 
  isLoading, 
  selectedCategory 
}) => {
  const formatDate = (dateString: string) => {
    // Ensure dateString is valid before formatting
    if (!dateString) return 'Fecha desconocida';
    try {
        return new Date(dateString).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return 'Fecha inválida';
    }
  };

  const filterResultsByCategory = (results: ApiResponse['results']) => {
    if (!selectedCategory) return results;

    return results.filter(result => {
      const data = result.document.structData;
      let matches = false;

      // Check category based on the resource type present in structData
      if (data.DiagnosticReport?.category) {
        matches = data.DiagnosticReport.category.some((cat: any) => 
          cat.text === selectedCategory || 
          cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory || getCategoryLabel(code.display) === selectedCategory)
        );
      }

      // Check category for Observation
      if (data.Observation?.category) {
        matches = matches || data.Observation.category.some((cat: any) =>
           cat.text === selectedCategory || // Also check text for Observation category
           cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory || getCategoryLabel(code.display) === selectedCategory)
        );
      }

      // Check category for Condition
      if (data.Condition?.category) {
        matches = matches || data.Condition.category.some((cat: any) =>
          cat.text === selectedCategory ||
          cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory || getCategoryLabel(code.display) === selectedCategory)
        );
      }

      // TODO: Add category checking for other resource types if needed

      return matches;
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">Cargando resultados...</p>
      </div>
    );
  }

  if (!results?.results || results.results.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">No se encontraron resultados.</p>
      </div>
    );
  }

  const filteredAndFormattedResults = filterResultsByCategory(results.results)
    .map((result, index) => {
      const data = result.document.structData;
      let renderedContent = null;
      let resourceKey = null; // To identify which resource type is present

      // Determine the resource type based on the keys in structData
      if (data.Observation) { resourceKey = 'Observation'; }
      else if (data.DiagnosticReport) { resourceKey = 'DiagnosticReport'; }
      else if (data.ServiceRequest) { resourceKey = 'ServiceRequest'; }
      else if (data.MedicationRequest) { resourceKey = 'MedicationRequest'; }
      else if (data.MedicationDispense) { resourceKey = 'MedicationDispense'; }
      else if (data.Condition) { resourceKey = 'Condition'; }
      // TODO: Add checks for other resource types you might add

      if (!resourceKey) {
          // Skip if no known resource type is found in structData
          console.warn('Skipping record with unknown resource type in structData:', data);
          return null; 
      }

      const resourceData = data[resourceKey]; // Get the actual resource data

      // Render based on the determined resource type
      switch(resourceKey) {
        case 'DiagnosticReport':
          renderedContent = (
            <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Reporte Diagnóstico
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-700">
                    {resourceData.category?.[0]?.text || 'Reporte General'}
                  </p>
                  {resourceData.conclusion && (
                    <p className="mt-2 text-gray-600">
                      {resourceData.conclusion}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Fecha: {formatDate(resourceData.effectiveDateTime)}</span>
                  {resourceData.performer?.[0]?.display && (
                    <span>Realizado por: {resourceData.performer[0].display}</span>
                  )}
                </div>
              </div>
            </section>
          );
          break;

        case 'Observation':
          renderedContent = (
            <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TestTube2 className="w-5 h-5 text-teal-500" />
                Observación y Resultados
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{resourceData.code.text}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resourceData.status === 'final'
                      ? 'bg-green-100 text-green-800'
                      : resourceData.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {resourceData.status === 'final'
                      ? 'Final'
                      : resourceData.status === 'cancelled'
                      ? 'Cancelado'
                      : 'Pendiente'}
                  </span>
                </div>
                {resourceData.valueQuantity && (
                  <div className="mt-2">
                    <span className="text-2xl font-semibold">{resourceData.valueQuantity.value}</span>
                    <span className="ml-1 text-gray-600">{resourceData.valueQuantity.unit}</span>
                  </div>
                )}
                {resourceData.valueString && (
                  <div className="mt-2">
                    <span className="text-xl font-semibold">{resourceData.valueString}</span>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    {/* Ensure effectiveDateTime exists before formatting */}
                    {resourceData.effectiveDateTime && (
                        <span>Fecha: {formatDate(resourceData.effectiveDateTime)}</span>
                    )}
                    {resourceData.performer?.[0]?.display && (
                      <span>Realizado por: {resourceData.performer[0].display}</span>
                    )}
                  </div>
                </div>
                {resourceData.note && resourceData.note.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">{resourceData.note[0].text}</p>
                  </div>
                )}
              </div>
            </section>
          );
           break;

        case 'ServiceRequest':
          renderedContent = (
            <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-500" />
                Solicitud de Servicio
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{resourceData.code.text}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resourceData.status === 'active'
                      ? 'bg-yellow-100 text-yellow-800'
                      : resourceData.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {resourceData.status === 'active'
                      ? 'Activo'
                      : resourceData.status === 'completed'
                      ? 'Completado'
                      : 'Pendiente'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                     {/* Ensure authoredOn exists before formatting */}
                    {resourceData.authoredOn && (
                         <span>Fecha: {formatDate(resourceData.authoredOn)}</span>
                    )}
                    {resourceData.requester?.display && (
                      <span>Solicitado por: {resourceData.requester.display}</span>
                    )}
                  </div>
                   {resourceData.category?.[0]?.text && (
                    <p className="mt-2">Categoría: {resourceData.category[0].text}</p>
                  )}
                  {resourceData.priority && (
                    <p className="mt-1">Prioridad: {resourceData.priority === 'routine' ? 'Rutina' : 'Urgente'}</p>
                  )}
                </div>
              </div>
            </section>
          );
           break;

        case 'MedicationRequest':
          renderedContent = (
            <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-500" />
                Prescripción Médica
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    {resourceData.medication?.text} {/* Use resourceData.medication.text */}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resourceData.status === 'active'
                      ? 'bg-yellow-100 text-yellow-800'
                      : resourceData.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {resourceData.status === 'active'
                      ? 'Activo'
                      : resourceData.status === 'completed'
                      ? 'Completado'
                      : 'Pendiente'}
                  </span>
                </div>
                {resourceData.dosageInstruction && resourceData.dosageInstruction[0] && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      {resourceData.dosageInstruction[0].text}
                    </p>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    {/* Ensure authoredOn exists before formatting */}
                    {resourceData.authoredOn && (
                        <span>Fecha: {formatDate(resourceData.authoredOn)}</span>
                    )}
                    {resourceData.requester?.display && (
                      <span>Prescrito por: {resourceData.requester.display}</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
           break;

        case 'MedicationDispense':
          renderedContent = (
            <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                Entrega de Medicamento
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    {resourceData.medication?.text} {/* Use resourceData.medication.text */}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resourceData.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {resourceData.status === 'completed'
                      ? 'Entregado'
                      : 'Pendiente'}
                  </span>
                </div>
                {resourceData.quantity && (
                   <div className="mt-2">
                      <span className="text-xl font-semibold">
                        {resourceData.quantity.value}
                      </span>
                      <span className="ml-1 text-gray-600">
                        {resourceData.quantity.unit}
                      </span>
                    </div>
                )}
                <div className="text-sm text-gray-500">
                   {/* Ensure whenHandedOver exists before formatting */}
                   {resourceData.whenHandedOver && (
                       <span>Fecha de entrega: {formatDate(resourceData.whenHandedOver)}</span>
                   )}
                </div>
              </div>
            </section>
          );
           break;

        case 'Condition':
          renderedContent = (
            <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                Condición Médica
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    {resourceData.code.text}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resourceData.clinicalStatus?.coding?.[0]?.code === 'active'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {resourceData.clinicalStatus?.coding?.[0]?.code === 'active'
                      ? 'Activo'
                      : 'Inactivo'}
                  </span>
                </div>
                {resourceData.category?.[0]?.text && (
                  <p className="text-sm text-gray-600">
                    Categoría: {resourceData.category[0].text}
                  </p>
                )}
                {resourceData.note && resourceData.note.length > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      {resourceData.note[0].text}
                    </p>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    {/* Ensure onsetDateTime and recordedDate exist before formatting */}
                    {resourceData.onsetDateTime && (
                         <span>Fecha de inicio: {formatDate(resourceData.onsetDateTime)}</span>
                    )}
                    {resourceData.recordedDate && (
                        <span>Registrado: {formatDate(resourceData.recordedDate)}</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
           break;

        default:
          // If resourceKey is found but not matched in switch, log a warning
          console.warn('No rendering template for resource type:', resourceKey, 'with data:', resourceData);
          renderedContent = null;
      }

      return renderedContent; // Return the rendered content or null
    });

  return (
    <div className="space-y-8">
      {/* Render the filtered and formatted results */}
      {filteredAndFormattedResults}
    </div>
  );
};

export default MedicalRecords;