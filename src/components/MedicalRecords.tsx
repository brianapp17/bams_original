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
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterResultsByCategory = (results: ApiResponse['results']) => {
    if (!selectedCategory) return results;
    
    return results.filter(result => {
      const data = result.document.structData;
      let matches = false;
      
      if (data.DiagnosticReport?.category) {
        matches = data.DiagnosticReport.category.some((cat: any) => 
          cat.text === selectedCategory || 
          cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory)
        );
      }
      
      if (data.Observation?.category) {
        matches = matches || data.Observation.category.some((cat: any) =>
          cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory)
        );
      }
      
      if (data.Condition?.category) {
        matches = matches || data.Condition.category.some((cat: any) =>
          cat.text === selectedCategory
        );
      }
      
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

  return (
    <div className="space-y-8">
      {filterResultsByCategory(results.results)
        .filter(result => result.document.structData.resource_type !== 'Patient')
        .map((result, index) => {
          const data = result.document.structData;
          const type = data.resource_type;
          
          switch(type) {
            case 'DiagnosticReport':
              return (
                <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Reporte Diagnóstico
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-gray-700">
                        {data.DiagnosticReport.category?.[0]?.text || 'Reporte General'}
                      </p>
                      {data.DiagnosticReport.conclusion && (
                        <p className="mt-2 text-gray-600">
                          {data.DiagnosticReport.conclusion}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Fecha: {formatDate(data.DiagnosticReport.effectiveDateTime)}</span>
                      {data.DiagnosticReport.performer?.[0]?.display && (
                        <span>Realizado por: {data.DiagnosticReport.performer[0].display}</span>
                      )}
                    </div>
                  </div>
                </section>
              );

            case 'Observation':
              return (
                <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TestTube2 className="w-5 h-5 text-teal-500" />
                    Observación y Resultados
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{data.Observation.code.text}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        data.Observation.status === 'final'
                          ? 'bg-green-100 text-green-800'
                          : data.Observation.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {data.Observation.status === 'final'
                          ? 'Final'
                          : data.Observation.status === 'cancelled'
                          ? 'Cancelado'
                          : 'Pendiente'}
                      </span>
                    </div>
                    {data.Observation.valueQuantity && (
                      <div className="mt-2">
                        <span className="text-2xl font-semibold">{data.Observation.valueQuantity.value}</span>
                        <span className="ml-1 text-gray-600">{data.Observation.valueQuantity.unit}</span>
                      </div>
                    )}
                    {data.Observation.valueString && (
                      <div className="mt-2">
                        <span className="text-xl font-semibold">{data.Observation.valueString}</span>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Fecha: {formatDate(data.Observation.effectiveDateTime)}</span>
                        {data.Observation.performer?.[0]?.display && (
                          <span>Realizado por: {data.Observation.performer[0].display}</span>
                        )}
                      </div>
                    </div>
                    {data.Observation.note && data.Observation.note.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">{data.Observation.note[0].text}</p>
                      </div>
                    )}
                  </div>
                </section>
              );

            case 'ServiceRequest':
              return (
                <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-purple-500" />
                    Solicitud de Servicio
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{data.ServiceRequest.code.text}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        data.ServiceRequest.status === 'active'
                          ? 'bg-yellow-100 text-yellow-800'
                          : data.ServiceRequest.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {data.ServiceRequest.status === 'active'
                          ? 'Activo'
                          : data.ServiceRequest.status === 'completed'
                          ? 'Completado'
                          : 'Pendiente'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Fecha: {formatDate(data.ServiceRequest.authoredOn)}</span>
                        {data.ServiceRequest.requester?.display && (
                          <span>Solicitado por: {data.ServiceRequest.requester.display}</span>
                        )}
                      </div>
                      {data.ServiceRequest.category?.[0]?.text && (
                        <p className="mt-2">Categoría: {data.ServiceRequest.category[0].text}</p>
                      )}
                      {data.ServiceRequest.priority && (
                        <p className="mt-1">Prioridad: {data.ServiceRequest.priority === 'routine' ? 'Rutina' : 'Urgente'}</p>
                      )}
                    </div>
                  </div>
                </section>
              );

            case 'MedicationRequest':
              return (
                <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-orange-500" />
                    Prescripción Médica
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">
                        {data.reference.medication.text}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        data.MedicationRequest.status === 'active'
                          ? 'bg-yellow-100 text-yellow-800'
                          : data.MedicationRequest.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {data.MedicationRequest.status === 'active'
                          ? 'Activo'
                          : data.MedicationRequest.status === 'completed'
                          ? 'Completado'
                          : 'Pendiente'}
                      </span>
                    </div>
                    {data.MedicationRequest.dosageInstruction && data.MedicationRequest.dosageInstruction[0] && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                          {data.MedicationRequest.dosageInstruction[0].text}
                        </p>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Fecha: {formatDate(data.MedicationRequest.authoredOn)}</span>
                        {data.MedicationRequest.requester?.display && (
                          <span>Prescrito por: {data.MedicationRequest.requester.display}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );

            case 'MedicationDispense':
              return (
                <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    Entrega de Medicamento
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">
                        {data.reference.medication.text}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        data.MedicationDispense.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {data.MedicationDispense.status === 'completed'
                          ? 'Entregado'
                          : 'Pendiente'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-semibold">
                        {data.MedicationDispense.quantity.value}
                      </span>
                      <span className="ml-1 text-gray-600">
                        {data.MedicationDispense.quantity.unit}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span>Fecha de entrega: {formatDate(data.MedicationDispense.whenHandedOver)}</span>
                    </div>
                  </div>
                </section>
              );

            case 'Condition':
              return (
                <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    Condición Médica
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">
                        {data.Condition.code.text}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        data.Condition.clinicalStatus?.coding?.[0]?.code === 'active'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {data.Condition.clinicalStatus?.coding?.[0]?.code === 'active'
                          ? 'Activo'
                          : 'Inactivo'}
                      </span>
                    </div>
                    {data.Condition.category?.[0]?.text && (
                      <p className="text-sm text-gray-600">
                        Categoría: {data.Condition.category[0].text}
                      </p>
                    )}
                    {data.Condition.note && data.Condition.note.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                          {data.Condition.note[0].text}
                        </p>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Fecha de inicio: {formatDate(data.Condition.onsetDateTime)}</span>
                        <span>Registrado: {formatDate(data.Condition.recordedDate)}</span>
                      </div>
                    </div>
                  </div>
                </section>
              );

            default:
              return null;
          }
        })}
    </div>
  );
};

export default MedicalRecords;