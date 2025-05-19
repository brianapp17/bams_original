import React from 'react';
import { TestTube2, FileText, Pill, ClipboardList, FileSpreadsheet, HeartPulse, Stethoscope, CalendarClock, Scissors, Syringe } from 'lucide-react'; // Import Syringe or another icon for MedicationAdministration
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

   const getClinicalStatusDisplay = (status: string) => {
       switch(status) {
           case 'active': return 'Activo';
           case 'remission': return 'Remisión';
           case 'resolved': return 'Resuelto';
           default: return status;
       }
   };

   const getVerificationStatusDisplay = (status: string) => {
       switch(status) {
           case 'confirmed': return 'Confirmado';
           case 'suspect': return 'Sospechoso';
           default: return status;
       }
   };

    const getEncounterStatusDisplay = (status: string) => {
        return status;
    };

    const getProcedureStatusDisplay = (status: string) => {
        switch(status) {
            case 'completed': return 'Finalizado';
            case 'in-progress': return 'En curso';
            case 'suspended': return 'Suspendido';
            default: return status;
        }
    };

    const getMedicationAdministrationStatusDisplay = (status: string) => {
        switch(status) {
            case 'completed': return 'Completado';
            case 'in-progress': return 'En progreso';
            case 'on-hold': return 'En espera';
            case 'stopped': return 'Detenido';
            case 'entered-in-error': return 'Ingresado por error';
            default: return status;
        }
    };

    const getMedicationRouteDisplay = (route: string) => {
         switch(route?.toLowerCase()) {
            case 'oral': return 'Oral';
            case 'intravenous': return 'Intravenosa';
            case 'topical': return 'Tópica';
            case 'subcutaneous': return 'Subcutánea';
            default: return route;
        }
    };


  const filterResultsByCategory = (results: ApiResponse['results']) => {
    if (!selectedCategory) return results;

    return results.filter(result => {
      const data = result.document.structData;
      let matches = false;

      if (data.DiagnosticReport?.category) {
        matches = data.DiagnosticReport.category.some((cat: any) => 
          cat.text === selectedCategory || 
          cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory || getCategoryLabel(code.display) === selectedCategory)
        );
      }

      if (data.Observation?.category) {
        matches = matches || data.Observation.category.some((cat: any) =>
           cat.text === selectedCategory ||
           cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory || getCategoryLabel(code.display) === selectedCategory)
        );
      }

      if (data.Condition?.category) {
        matches = matches || data.Condition.category.some((cat: any) =>
          cat.text === selectedCategory ||
          cat.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory || getCategoryLabel(code.display) === selectedCategory)
        );
      }

      if (data.Encounter?.type) { 
          matches = matches || data.Encounter.type.some((typeObj: any) =>
              typeObj.text === selectedCategory ||
              typeObj.coding?.some((code: any) => getCategoryLabel(code.code) === selectedCategory || getCategoryLabel(code.display) === selectedCategory)
          );
      }

      if(data.Procedure?.code?.text) {
           if(getCategoryLabel(data.Procedure.code.text) === selectedCategory || getCategoryLabel('Procedimiento') === selectedCategory) { 
               matches = true;
           }
      }

       if (data.MedicationAdministration?.medication?.text) {
           if (getCategoryLabel(data.MedicationAdministration.medication.text) === selectedCategory || getCategoryLabel('Medication') === selectedCategory) {
               matches = true;
           }
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

  const filteredAndFormattedResults = filterResultsByCategory(results.results)
    .map((result, index) => {
      const data = result.document.structData;
      let renderedContent = null;
      let resourceKey = null; 

      if (data.Observation) { resourceKey = 'Observation'; }
      else if (data.Condition) { resourceKey = 'Condition'; }
      else if (data.Encounter) { resourceKey = 'Encounter'; }
      else if (data.Procedure) { resourceKey = 'Procedure'; } 
      else if (data.MedicationAdministration) { resourceKey = 'MedicationAdministration'; } // Check for MedicationAdministration
      else if (data.DiagnosticReport) { resourceKey = 'DiagnosticReport'; }
      else if (data.ServiceRequest) { resourceKey = 'ServiceRequest'; }
      else if (data.MedicationRequest) { resourceKey = 'MedicationRequest'; }
      else if (data.MedicationDispense) { resourceKey = 'MedicationDispense'; }
      
      if (!resourceKey) {
          console.warn('Skipping record with unknown resource type in structData:', data);
          return null; 
      }

      const resourceData = data[resourceKey]; 

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
                  {resourceData.effectiveDateTime && (
                      <span>Fecha: {formatDate(resourceData.effectiveDateTime)}</span>
                  )}
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
                  <span className="font-medium text-gray-700">{resourceData.code?.text}</span>
                  {resourceData.status && (
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
                   )}
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

        case 'Condition':
            renderedContent = (
              <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-red-500" />
                  Condición Médica
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {resourceData.code?.text}
                    </span>
                    {resourceData.clinicalStatus?.coding?.[0]?.code && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                          resourceData.clinicalStatus.coding[0].code === 'active'
                            ? 'bg-yellow-100 text-yellow-800'
                            : resourceData.clinicalStatus.coding[0].code === 'remission'
                            ? 'bg-blue-100 text-blue-800'
                            : resourceData.clinicalStatus.coding[0].code === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {getClinicalStatusDisplay(resourceData.clinicalStatus.coding[0].code)}
                      </span>
                    )}
                  </div>
                  {resourceData.verificationStatus?.coding?.[0]?.code && (
                       <div className="text-sm text-gray-600">
                           Estado de verificación: {getVerificationStatusDisplay(resourceData.verificationStatus.coding[0].code)}
                       </div>
                  )}
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
                    {resourceData.onsetDateTime && (
                       <span>Fecha de inicio: {formatDate(resourceData.onsetDateTime)}</span>
                    )}
                    {resourceData.recordedDate && (
                        <span>Registrado: {formatDate(resourceData.recordedDate)}</span>
                    )}
                  </div>
                </div>
              </section>
            );
            break;

        case 'Encounter':
            renderedContent = (
              <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-purple-700" />
                  Encuentro
                </h2>
                <div className="space-y-4">
                   {resourceData.type?.[0]?.text && (
                       <div>
                           <span className="font-medium text-gray-700">Tipo: {resourceData.type[0].text}</span>
                       </div>
                   )}

                  {resourceData.reason?.[0]?.text && (
                      <div>
                          <span className="font-medium text-gray-700">Motivo: {resourceData.reason[0].text}</span>
                      </div>
                  )}

                  <div className="text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      {resourceData.period?.start && (
                          <span>Fecha de inicio: {formatDate(resourceData.period.start)}</span>
                      )}
                      {resourceData.period?.end && (
                          <span>Fecha de fin: {formatDate(resourceData.period.end)}</span>
                      )}
                    </div>
                  </div>
                  {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note[0].text}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
            break;

        case 'Procedure': 
             renderedContent = (
               <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                 <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <Scissors className="w-5 h-5 text-orange-700" />
                   Procedimiento
                 </h2>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="font-medium text-gray-700">
                         {resourceData.code?.text}
                       </span>
                       {resourceData.status && (
                         <span className={`px-2 py-1 text-xs rounded-full ${
                           resourceData.status === 'completed'
                             ? 'bg-green-100 text-green-800'
                             : resourceData.status === 'in-progress'
                             ? 'bg-yellow-100 text-yellow-800'
                             : resourceData.status === 'suspended'
                             ? 'bg-red-100 text-red-800'
                             : 'bg-gray-100 text-gray-800'
                         }`}>
                         {getProcedureStatusDisplay(resourceData.status)}
                        </span>
                       )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {resourceData.performedDateTime && (
                         <span>Fecha del procedimiento: {formatDate(resourceData.performedDateTime)}</span>
                      )}
                    </div>
                    {resourceData.note && resourceData.note.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                          {resourceData.note[0].text}
                        </p>
                      </div>
                    )}
                 </div>
               </section>
             );
            break;

        case 'MedicationAdministration': // Add case for MedicationAdministration
            renderedContent = (
              <section key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-blue-700" /> {/* Use Syringe icon */}
                  Medicamento Administrado
                </h2>
                <div className="space-y-4">
                  {resourceData.medication?.text && (
                       <div>
                           <span className="font-medium text-gray-700">Medicamento: {resourceData.medication.text}</span>
                       </div>
                  )}
                  {resourceData.dosage?.dose && (
                    <p className="text-sm text-gray-700">
                        Dosis: {resourceData.dosage.dose.value} {resourceData.dosage.dose.unit}
                    </p>
                  )}
                  {resourceData.dosage?.route?.text && (
                    <p className="text-sm text-gray-600">
                        Vía: {getMedicationRouteDisplay(resourceData.dosage.route.text)}
                    </p>
                  )}
                   {resourceData.status && (
                     <p className="text-sm text-gray-600">
                        Estado: {getMedicationAdministrationStatusDisplay(resourceData.status)}
                     </p>
                   )}
                  <div className="text-sm text-gray-500">
                    {resourceData.effectiveDateTime && (
                        <span>Fecha de administración: {formatDate(resourceData.effectiveDateTime)}</span>
                    )}
                  </div>
                  {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note[0].text}
                      </p>
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
                    {resourceData.medication?.text}
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
                    {resourceData.medication?.text}
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
                   {resourceData.whenHandedOver && (
                       <span>Fecha de entrega: {formatDate(resourceData.whenHandedOver)}</span>
                   )}
                </div>
              </div>
            </section>
          );
           break;

        default:
          console.warn('No rendering template for resource type:', resourceKey, 'with data:', resourceData);
          renderedContent = null;
      }

      return renderedContent;
    });

  return (
    <div className="space-y-8">
      {filteredAndFormattedResults.filter(Boolean)}
    </div>
  );
};

export default MedicalRecords;