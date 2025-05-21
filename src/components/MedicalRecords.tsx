import React from 'react';
import {
  TestTube2,
  FileText,
  Pill,
  ClipboardList,
  FileSpreadsheet,
  Stethoscope,
  CalendarClock,
  Scissors,
  Syringe,
  AlertTriangle,
  FilePenLine,
  ShieldCheck // <-- Import new icon for Immunization
} from 'lucide-react';
import { ApiResponse } from '../types'; // Asegúrate que esta ruta es correcta
import { getCategoryLabel } from '../api'; // Asegúrate que esta ruta es correcta

interface MedicalRecordsProps {
  results: ApiResponse | null;
  isLoading: boolean;
  selectedCategory: string | null;
  searchQuery: string;
}

const MedicalRecords: React.FC<MedicalRecordsProps> = ({
  ...props // Keep all props here, destructure inside
}) => {
  const formatDate = (dateString: string | undefined | null) => { // Acepta undefined/null
    if (!dateString) return 'Fecha desconocida';
    try {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        if (dateString.includes('T') || dateString.includes(' ')) {
             options.hour = '2-digit';
             options.minute = '2-digit';
        }
        return new Date(dateString).toLocaleDateString('es-ES', options);
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return 'Fecha inválida';
    }
  };

   const getClinicalStatusDisplay = (status: string | undefined) => {
       switch(status?.toLowerCase()) {
           case 'active': return 'Activo';
           case 'remission': return 'Remisión';
           case 'resolved': return 'Resuelto';
           default: return status || 'Desconocido';
       }
   };

   const getVerificationStatusDisplay = (status: string | undefined) => {
       switch(status?.toLowerCase()) {
           case 'confirmed': return 'Confirmado';
           case 'unconfirmed': return 'No Confirmado'; // Añadido por si acaso
           case 'refuted': return 'Refutado'; // Añadido por si acaso
           case 'entered-in-error': return 'Ingresado por Error'; // Añadido por si acaso
           case 'suspect': return 'Sospechoso'; // FHIR no usa 'suspect' para verificationStatus directamente, pero mantenido por tu código
           default: return status || 'Desconocido';
       }
   };

    // getEncounterStatusDisplay no parece usarse, pero si se usara:
    const getEncounterStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()){
            case 'planned': return 'Planeado';
            case 'arrived': return 'Llegó';
            case 'triaged': return 'Triaje';
            case 'in-progress': return 'En curso';
            case 'onleave': return 'De permiso';
            case 'finished': return 'Finalizado';
            case 'cancelled': return 'Cancelado';
            case 'entered-in-error': return 'Ingresado por error';
            case 'unknown': return 'Desconocido';
            default: return status || 'Desconocido';
        }
    };

    const getProcedureStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'preparation': return 'Preparación';
            case 'in-progress': return 'En curso';
            case 'not-done': return 'No realizado';
            case 'on-hold': return 'En espera';
            case 'stopped': return 'Detenido';
            case 'completed': return 'Finalizado';
            case 'entered-in-error': return 'Ingresado por error';
            case 'unknown': return 'Desconocido';
            default: return status || 'Desconocido';
        }
    };

    const getMedicationAdministrationStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'in-progress': return 'En progreso';
            case 'not-done': return 'No realizado';
            case 'on-hold': return 'En espera';
            case 'completed': return 'Completado';
            case 'entered-in-error': return 'Ingresado por error';
            case 'stopped': return 'Detenido';
            case 'unknown': return 'Desconocido';
            default: return status || 'Desconocido';
        }
    };

    const getMedicationRouteDisplay = (route: string | undefined) => {
         switch(route?.toLowerCase()) {
            case 'oral': return 'Oral';
            case 'intravenous': return 'Intravenosa';
            case 'iv': return 'Intravenosa (IV)';
            case 'topical': return 'Tópica';
            case 'subcutaneous': return 'Subcutánea';
            case 'sc': return 'Subcutánea (SC)';
            case 'intramuscular': return 'Intramuscular';
            case 'im': return 'Intramuscular (IM)';
            default: return route || 'Ruta desconocida';
        }
    };

    const getAllergyIntoleranceClinicalStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'active': return 'Activa';
            case 'inactive': return 'Inactiva';
            case 'resolved': return 'Resuelta';
            default: return status || 'Desconocido';
        }
    };

     const getClinicalImpressionStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'in-progress': return 'En progreso';
            case 'completed': return 'Completada';
            case 'entered-in-error': return 'Ingresada por error';
            case 'draft': return 'Borrador'; // Mantenido de tu código original
            default: return status || 'Desconocido';
        }
    };

    const getImmunizationStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'completed': return 'Completada';
            case 'entered-in-error': return 'Ingresada por error';
            case 'not-done': return 'No realizada';
            default: return status || 'Desconocido';
        }
    };

    const getServiceRequestStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'draft': return 'Borrador';
            case 'active': return 'Activo';
            case 'on-hold': return 'En espera';
            case 'revoked': return 'Revocado';
            case 'completed': return 'Completado';
            case 'entered-in-error': return 'Ingresado por error';
            case 'unknown': return 'Desconocido';
            default: return status || 'Desconocido';
        }
    };

    const getMedicationRequestStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'active': return 'Activo';
            case 'on-hold': return 'En espera';
            case 'cancelled': return 'Cancelado';
            case 'completed': return 'Completado';
            case 'entered-in-error': return 'Ingresado por error';
            case 'stopped': return 'Detenido';
            case 'draft': return 'Borrador';
            case 'unknown': return 'Desconocido';
            default: return status || 'Desconocido';
        }
    };

    const getMedicationDispenseStatusDisplay = (status: string | undefined) => {
        switch(status?.toLowerCase()) {
            case 'preparation': return 'Preparación';
            case 'in-progress': return 'En progreso';
            case 'cancelled': return 'Cancelado';
            case 'on-hold': return 'En espera';
            case 'completed': return 'Entregado'; // Cambiado para ser más claro
            case 'entered-in-error': return 'Ingresado por error';
            case 'stopped': return 'Detenido';
            case 'declined': return 'Rechazado';
            case 'unknown': return 'Desconocido';
            default: return status || 'Desconocido';
        }
    };

    const filterResults = (resultsToFilter: ApiResponse['results'], category: string | null, query: string) => {
      const lowerCaseQuery = query.toLowerCase();
      const currentCategoryLabel = category ? getCategoryLabel(category) : null;
      const isFilteringByCategory = currentCategoryLabel && currentCategoryLabel.toLowerCase() !== 'todo' && currentCategoryLabel.toLowerCase() !== 'todos';
  
      return resultsToFilter.filter(result => {
        const data = result?.document?.structData;
        if (!data) return false;
  
        let matchesCategory = true;
        let matchesSearchQuery = true;
  
        // 1. Filter by Category
        if (isFilteringByCategory) {
            matchesCategory = false; // Assume no match initially
  
            // Helper to check categories for resource types that have a 'category' array
            const checkResourceCategory = (resourceCategories: any[] | undefined) => {
                if (!resourceCategories) return false;
                return resourceCategories.some((cat: any) =>
                    getCategoryLabel(cat.text) === currentCategoryLabel ||
                    cat.coding?.some((code: any) => getCategoryLabel(code.code) === currentCategoryLabel || getCategoryLabel(code.display) === currentCategoryLabel)
                );
            };
  
            if (data.DiagnosticReport) {
                matchesCategory = checkResourceCategory(data.DiagnosticReport.category);
                if (!matchesCategory && (getCategoryLabel('DiagnosticReport') === currentCategoryLabel || getCategoryLabel('Reporte Diagnóstico') === currentCategoryLabel)) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && data.Observation) {
                matchesCategory = checkResourceCategory(data.Observation.category);
                 if (!matchesCategory && (getCategoryLabel('Observation') === currentCategoryLabel || getCategoryLabel('Observación y Resultados') === currentCategoryLabel)) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && data.Condition) {
                matchesCategory = checkResourceCategory(data.Condition.category);
                if (!matchesCategory && (getCategoryLabel('Condition') === currentCategoryLabel || getCategoryLabel('Condición Médica') === currentCategoryLabel)) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && data.Encounter) {
                // Encounter.type is similar to category for other resources
                matchesCategory = checkResourceCategory(data.Encounter.type);
                if (!matchesCategory && (getCategoryLabel('Encounter') === currentCategoryLabel || getCategoryLabel('Encuentro') === currentCategoryLabel)) {
                    matchesCategory = true;
                }
            }
  
            // For resources that don't have an explicit 'category' field but match a category name
            if (!matchesCategory && data.Procedure) {
                if (getCategoryLabel('Procedimiento') === currentCategoryLabel || getCategoryLabel('procedure') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && (data.MedicationAdministration || data.MedicationAdministrationDuplicate)) {
                if (getCategoryLabel('Medication') === currentCategoryLabel || getCategoryLabel('Medicación') === currentCategoryLabel || getCategoryLabel('Medicamento Administrado') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && data.AllergyIntolerance) {
                if (getCategoryLabel('allergy') === currentCategoryLabel || getCategoryLabel('Alergias') === currentCategoryLabel || getCategoryLabel('Alergia') === currentCategoryLabel || getCategoryLabel('Alergia/Intolerancia') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && data.ClinicalImpression) {
                if (getCategoryLabel('clinical-note') === currentCategoryLabel || getCategoryLabel('Diagnóstico Médico') === currentCategoryLabel || getCategoryLabel('ClinicalImpression') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && data.Immunization) {
                if (getCategoryLabel('immunization') === currentCategoryLabel || getCategoryLabel('Vacunación') === currentCategoryLabel || getCategoryLabel('Inmunización') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
  
            if (!matchesCategory && data.ServiceRequest) {
                if (getCategoryLabel('ServiceRequest') === currentCategoryLabel || getCategoryLabel('Solicitud de Servicio') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
            if (!matchesCategory && data.MedicationRequest) {
                if (getCategoryLabel('MedicationRequest') === currentCategoryLabel || getCategoryLabel('Prescripción Médica') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
            if (!matchesCategory && data.MedicationDispense) {
                if (getCategoryLabel('MedicationDispense') === currentCategoryLabel || getCategoryLabel('Entrega de Medicamento') === currentCategoryLabel) {
                    matchesCategory = true;
                }
            }
        }
  
        // If filtering by category is active and it doesn't match, exclude immediately
        if (isFilteringByCategory && !matchesCategory) {
            return false;
        }
  
        // 2. Filter by Search Query
        if (lowerCaseQuery) {
            matchesSearchQuery = false; // Assume no match initially
  
            // Collect all potentially searchable text from the resource data
            let specificSearchFields = '';
            let resourceDisplayName = ''; // Nuevo: para almacenar el título del registro

            if (data.DiagnosticReport) {
                specificSearchFields += (data.DiagnosticReport.conclusion || '') + ' ' + (data.DiagnosticReport.category?.[0]?.text || '');
                specificSearchFields += ' ' + (data.DiagnosticReport.code?.coding?.[0]?.display || '') + ' ' + (data.DiagnosticReport.code?.coding?.[0]?.code || '');
                resourceDisplayName = 'Reporte Diagnóstico';
            } else if (data.Observation) {
                specificSearchFields += (data.Observation.code?.text || '') + ' ' + (data.Observation.valueString || '') + ' ' + (data.Observation.note?.[0]?.text || '');
                // Añadir búsqueda en display y code para Observation code
                 specificSearchFields += ' ' + (data.Observation.code?.coding?.[0]?.display || '') + ' ' + (data.Observation.code?.coding?.[0]?.code || '');
                resourceDisplayName = 'Observación y Resultados';
            } else if (data.Condition) {
                specificSearchFields += (data.Condition.code?.text || '') + ' ' + (data.Condition.note?.[0]?.text || '');
                // Añadir búsqueda en display y code para Condition code
                specificSearchFields += ' ' + (data.Condition.code?.coding?.[0]?.display || '') + ' ' + (data.Condition.code?.coding?.[0]?.code || '');
                resourceDisplayName = 'Condición Médica';
            } else if (data.Encounter) {
                 specificSearchFields += (data.Encounter.type?.[0]?.text || '') + ' ' + (data.Encounter.reasonCode?.[0]?.text || '') + ' ' + (data.Encounter.note?.[0]?.text || '');
                 // Añadir búsqueda en display para Encounter type y reasonCode
                 specificSearchFields += ' ' + (data.Encounter.type?.[0]?.coding?.[0]?.display || '') + ' ' + (data.Encounter.reasonCode?.[0]?.coding?.[0]?.display || '');
                resourceDisplayName = 'Encuentro';
            } else if (data.Procedure) {
                specificSearchFields += (data.Procedure.code?.text || '') + ' ' + (data.Procedure.note?.[0]?.text || '');
                 // Añadir búsqueda en display para Procedure code
                specificSearchFields += ' ' + (data.Procedure.code?.coding?.[0]?.display || '');
                resourceDisplayName = 'Procedimiento';
            } else if (data.MedicationAdministration || data.MedicationAdministrationDuplicate) {
                 const medAdminData = data.MedicationAdministration || data.MedicationAdministrationDuplicate;
                 const medName = (medAdminData?.medicationCodeableConcept?.text || medAdminData?.medicationReference?.display || '');
                 specificSearchFields += medName + ' ' + (medAdminData?.note?.[0]?.text || '');
                 // **Campos adicionales para búsqueda de medicamentos:**
                 specificSearchFields += ' ' + (medAdminData?.medicationCodeableConcept?.coding?.[0]?.display || ''); // display del coding
                 specificSearchFields += ' ' + (medAdminData?.medicationCodeableConcept?.coding?.[0]?.code || ''); // code del coding
                 if (medAdminData?.dosage?.route?.text) {
                     specificSearchFields += ' ' + getMedicationRouteDisplay(medAdminData.dosage.route.text); // Nombre de la ruta
                 }
                 if (medAdminData?.dosage?.dose?.unit) {
                     specificSearchFields += ' ' + medAdminData.dosage.dose.unit; // Unidad de la dosis
                 }
                resourceDisplayName = 'Medicamento Administrado';
            } else if (data.ServiceRequest) {
                specificSearchFields += (data.ServiceRequest.code?.text || data.ServiceRequest.code?.coding?.[0]?.display || '') + ' ' + (data.ServiceRequest.note?.[0]?.text || '');
                 // Añadir búsqueda en display y code para ServiceRequest code
                specificSearchFields += ' ' + (data.ServiceRequest.code?.coding?.[0]?.code || '');
                resourceDisplayName = 'Solicitud de Servicio';
            } else if (data.MedicationRequest) {
                 const medRequestData = data.MedicationRequest;
                 const medName = (medRequestData.medicationCodeableConcept?.text || medRequestData.medicationCodeableConcept?.coding?.[0]?.display || medRequestData.medicationReference?.display || '');
                 specificSearchFields += medName + ' ' + (medRequestData.dosageInstruction?.[0]?.text || '') + ' ' + (medRequestData.note?.[0]?.text || '');
                  // **Campos adicionales para búsqueda de medicamentos (Request):**
                 specificSearchFields += ' ' + (medRequestData.medicationCodeableConcept?.coding?.[0]?.code || ''); // code del coding
                 if (medRequestData.dosageInstruction?.[0]?.route?.text) {
                      specificSearchFields += ' ' + getMedicationRouteDisplay(medRequestData.dosageInstruction[0].route.text); // Nombre de la ruta
                 }
                resourceDisplayName = 'Prescripción Médica';
            } else if (data.MedicationDispense) {
                 const medDispenseData = data.MedicationDispense;
                 const dispenseMedicationName = (medDispenseData.medicationCodeableConcept?.text || medDispenseData.medicationCodeableConcept?.coding?.[0]?.display || medDispenseData.medicationReference?.display || '');
                 specificSearchFields += dispenseMedicationName + ' ' + (medDispenseData.note?.[0]?.text || '');
                 // **Campos adicionales para búsqueda de medicamentos (Dispense):**
                 specificSearchFields += ' ' + (medDispenseData.medicationCodeableConcept?.coding?.[0]?.code || ''); // code del coding
                  if (medDispenseData.quantity?.unit) {
                      specificSearchFields += ' ' + medDispenseData.quantity.unit; // Unidad de la cantidad
                  }
                resourceDisplayName = 'Entrega de Medicamento';
            } else if (data.AllergyIntolerance) {
                specificSearchFields += (data.AllergyIntolerance.code?.text || data.AllergyIntolerance.code?.coding?.[0]?.display || '') + ' ' + (data.AllergyIntolerance.note?.[0]?.text || '');
                // Añadir búsqueda en code para AllergyIntolerance code
                specificSearchFields += ' ' + (data.AllergyIntolerance.code?.coding?.[0]?.code || '');
                resourceDisplayName = 'Alergia/Intolerancia';
            } else if (data.ClinicalImpression) {
                 specificSearchFields += (data.ClinicalImpression.description || '') + ' ' + (data.ClinicalImpression.summary || '') + ' ' + (data.ClinicalImpression.note?.[0]?.text || '');
                resourceDisplayName = 'Diagnóstico Médico';
            } else if (data.Immunization) {
                specificSearchFields += (data.Immunization.vaccineCode?.text || data.Immunization.vaccineCode?.coding?.[0]?.display || '') + ' ' + (data.Immunization.note?.[0]?.text || '');
                 // Añadir búsqueda en code para Immunization vaccineCode
                specificSearchFields += ' ' + (data.Immunization.vaccineCode?.coding?.[0]?.code || '');
                 if (data.Immunization.route?.text) {
                     specificSearchFields += ' ' + getMedicationRouteDisplay(data.Immunization.route.text); // Nombre de la ruta de administración de la vacuna
                 }
                  if (data.Immunization.doseQuantity?.unit) {
                     specificSearchFields += ' ' + data.Immunization.doseQuantity.unit; // Unidad de la dosis de la vacuna
                 }
                resourceDisplayName = 'Inmunización';
            }
  
            // AÑADE EL NOMBRE VISIBLE DEL RECURSO A LA BÚSQUEDA
            specificSearchFields += ' ' + resourceDisplayName;
  
            // Realizar la búsqueda insensible a mayúsculas y acentos en los campos específicos y en el JSON completo
            const textToSearch = (specificSearchFields + ' ' + JSON.stringify(data)).toLowerCase();
            const normalizedQuery = lowerCaseQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos de la query
            const normalizedText = textToSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos del texto a buscar
  
            matchesSearchQuery = normalizedText.includes(normalizedQuery);
        }
  
        // Combine filters: Must match category (if filtering by category) AND search query (if query exists)
        return (!isFilteringByCategory || matchesCategory) && (!lowerCaseQuery || matchesSearchQuery);
      });
    };

  const { results, isLoading, selectedCategory, searchQuery } = props; // Destructure searchQuery here

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

  const filteredResults = filterResults(results.results, selectedCategory, searchQuery);

  if (filteredResults.length === 0) {
    // Adjust message based on whether a search query is active
    if (searchQuery) {
         return (
             <div className="text-center py-4">
                 <p className="text-gray-600">No se encontraron resultados para la búsqueda "{searchQuery}" en la categoría seleccionada.</p>
             </div>
         );
    } else if (selectedCategory && selectedCategory.toLowerCase() !== 'todo' && selectedCategory.toLowerCase() !== 'todos') {
        return (
          <div className="text-center py-4">
            <p className="text-gray-600">No se encontraron resultados para la categoría seleccionada.</p>
          </div>
        );
    } else {
         return (
             <div className="text-center py-4">
                 <p className="text-gray-600">No se encontraron resultados que coincidan con la búsqueda.</p>
             </div>
         );
    }
  }

  if (!results?.results || results.results.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">No se encontraron resultados.</p>
      </div>
    );
  }


  const formattedResults = filteredResults.map((result) => {
      // Es importante tener un ID único para la key.
      // Si el documento tiene un ID, úsalo. Si el recurso FHIR tiene un ID, úsalo.
      // Como fallback, podrías generar uno o usar el índice si es realmente necesario (pero menos ideal).
      const docId = result?.document?.id; // Asumiendo que `document` puede tener un `id`
      let resourceKey: string | null = null;
      let resourceData: any = null; // Para almacenar el objeto del recurso

      // Determinar el resourceKey y resourceData
      if (result?.document?.structData) {
        const data = result.document.structData;
        if (data.Observation) { resourceKey = 'Observation'; resourceData = data.Observation; }
        else if (data.Condition) { resourceKey = 'Condition'; resourceData = data.Condition; }
        else if (data.Encounter) { resourceKey = 'Encounter'; resourceData = data.Encounter; }
        else if (data.Procedure) { resourceKey = 'Procedure'; resourceData = data.Procedure; }
        else if (data.MedicationAdministration) { resourceKey = 'MedicationAdministration'; resourceData = data.MedicationAdministration; }
        else if (data.MedicationAdministrationDuplicate) { resourceKey = 'MedicationAdministrationDuplicate'; resourceData = data.MedicationAdministrationDuplicate; }
        else if (data.DiagnosticReport) { resourceKey = 'DiagnosticReport'; resourceData = data.DiagnosticReport; }
        else if (data.ServiceRequest) { resourceKey = 'ServiceRequest'; resourceData = data.ServiceRequest; }
        else if (data.MedicationRequest) { resourceKey = 'MedicationRequest'; resourceData = data.MedicationRequest; }
        else if (data.MedicationDispense) { resourceKey = 'MedicationDispense'; resourceData = data.MedicationDispense; }
        else if (data.AllergyIntolerance) { resourceKey = 'AllergyIntolerance'; resourceData = data.AllergyIntolerance; }
        else if (data.ClinicalImpression) { resourceKey = 'ClinicalImpression'; resourceData = data.ClinicalImpression; }
        else if (data.Immunization) { resourceKey = 'Immunization'; resourceData = data.Immunization; }
      }

      if (!resourceKey || !resourceData) {
          console.warn('Skipping record with unknown or incomplete resource type in structData:', result?.document?.structData);
          return null;
      }
      // Usar el ID del recurso FHIR si está disponible, sino el ID del documento, o un UUID si es necesario
      const uniqueKey = resourceData.id || docId || `item-${Math.random().toString(36).substr(2, 9)}`;
      let renderedContent = null;


      switch(resourceKey) {
        case 'DiagnosticReport':
          renderedContent = (
            <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
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
            <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TestTube2 className="w-5 h-5 text-teal-500" />
                Observación y Resultados
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{resourceData.code?.text || 'Observación sin nombre'}</span>
                  {resourceData.status && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resourceData.status === 'final'
                      ? 'bg-green-100 text-green-800'
                      : resourceData.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800' // O usa un helper como getObservationStatusDisplay
                  }`}>
                    {resourceData.status === 'final'
                      ? 'Final'
                      : resourceData.status === 'cancelled'
                      ? 'Cancelado'
                      : resourceData.status // Podrías usar un helper aquí también
                    }
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
                {/* Podrías añadir más value[x] como valueCodeableConcept, valueBoolean, etc. */}
                <div className="text-sm text-gray-500">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
                    <p className="text-sm text-gray-600">{resourceData.note.map((n:any) => n.text).join('; ')}</p>
                  </div>
                )}
              </div>
            </section>
          );
           break;

        case 'Condition':
            renderedContent = (
              <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-red-500" />
                  Condición Médica
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {resourceData.code?.text || 'Condición sin especificar'}
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
                        {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
                  <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
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
            const encounterStatus = resourceData.status ? getEncounterStatusDisplay(resourceData.status) : 'Estado desconocido';
            renderedContent = (
              <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
                   {resourceData.status && (
                        <div className="text-sm text-gray-600">
                            Estado: {encounterStatus}
                        </div>
                   )}
                  {resourceData.reasonCode?.[0]?.text && ( // FHIR R4 usa reasonCode
                      <div>
                          <span className="font-medium text-gray-700">Motivo: {resourceData.reasonCode[0].text}</span>
                      </div>
                  )}
                  {/* Fallback para tu estructura original si 'reason' existe y 'reasonCode' no */}
                  {!resourceData.reasonCode && resourceData.reason?.[0]?.text && (
                      <div>
                          <span className="font-medium text-gray-700">Motivo: {resourceData.reason[0].text}</span>
                      </div>
                  )}
                  <div className="text-sm text-gray-500">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {resourceData.period?.start && (
                          <span>Inicio: {formatDate(resourceData.period.start)}</span>
                      )}
                      {resourceData.period?.end && (
                          <span>Fin: {formatDate(resourceData.period.end)}</span>
                      )}
                    </div>
                  </div>
                  {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
            break;

        case 'Procedure':
             renderedContent = (
               <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                 <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <Scissors className="w-5 h-5 text-orange-700" />
                   Procedimiento
                 </h2>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="font-medium text-gray-700">
                         {resourceData.code?.text || 'Procedimiento sin especificar'}
                       </span>
                       {resourceData.status && (
                         <span className={`px-2 py-1 text-xs rounded-full ${
                           resourceData.status === 'completed'
                             ? 'bg-green-100 text-green-800'
                             : resourceData.status === 'in-progress'
                             ? 'bg-yellow-100 text-yellow-800'
                             : resourceData.status === 'stopped' // 'suspended' no es un status FHIR común para Procedure, 'stopped' sí.
                             ? 'bg-red-100 text-red-800'
                             : 'bg-gray-100 text-gray-800'
                         }`}>
                         {getProcedureStatusDisplay(resourceData.status)}
                        </span>
                       )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {resourceData.performedDateTime && (
                         <span>Fecha: {formatDate(resourceData.performedDateTime)}</span>
                      )}
                       {/* También podría ser performedPeriod */}
                    </div>
                    {resourceData.note && resourceData.note.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                          {resourceData.note.map((n:any) => n.text).join('; ')}
                        </p>
                      </div>
                    )}
                 </div>
               </section>
             );
            break;

        case 'MedicationAdministration':
        case 'MedicationAdministrationDuplicate': // Asume que la estructura es la misma
            const medAdminStatus = resourceData.status ? getMedicationAdministrationStatusDisplay(resourceData.status) : 'Estado desconocido';
            const medAdminMedicationName = resourceData.medicationCodeableConcept?.text || resourceData.medicationReference?.display || resourceData.medication?.text || 'Medicamento sin especificar';

            renderedContent = (
              <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-blue-700" />
                  Medicamento Administrado
                </h2>
                <div className="space-y-4">
                  {medAdminMedicationName && (
                       <div>
                           <span className="font-medium text-gray-700">Medicamento: {medAdminMedicationName}</span>
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
                        Estado: {medAdminStatus}
                     </p>
                   )}
                  <div className="text-sm text-gray-500">
                    {/* FHIR usa effectivePeriod o effectiveDateTime */}
                    {resourceData.effectiveDateTime && (
                        <span>Fecha administración: {formatDate(resourceData.effectiveDateTime)}</span>
                    )}
                    {resourceData.effectivePeriod?.start && (
                        <span>Inicio administración: {formatDate(resourceData.effectivePeriod.start)}</span>
                    )}
                     {resourceData.effectivePeriod?.end && (
                        <span className="ml-2">Fin administración: {formatDate(resourceData.effectivePeriod.end)}</span>
                    )}
                  </div>
                  {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
            break;

        case 'ServiceRequest':
          const srStatus = resourceData.status ? getServiceRequestStatusDisplay(resourceData.status) : 'Estado desconocido';
          renderedContent = (
            <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-500" />
                Solicitud de Servicio
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{resourceData.code?.text || resourceData.code?.coding?.[0]?.display || 'Servicio sin especificar'}</span>
                  {resourceData.status && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      resourceData.status === 'active'
                        ? 'bg-yellow-100 text-yellow-800'
                        : resourceData.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {srStatus}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
                    <p className="mt-1">Prioridad: {resourceData.priority === 'routine' ? 'Rutina' : resourceData.priority === 'urgent' ? 'Urgente' : resourceData.priority === 'asap' ? 'Tan pronto como sea posible' : resourceData.priority === 'stat' ? 'Inmediato' : resourceData.priority}</p>
                  )}
                </div>
                 {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
              </div>
            </section>
          );
           break;

        case 'MedicationRequest':
          const mrStatus = resourceData.status ? getMedicationRequestStatusDisplay(resourceData.status) : 'Estado desconocido';
          // CORRECCIÓN AQUÍ:
          const medicationName = resourceData.medicationCodeableConcept?.coding?.[0]?.display ||
                                 resourceData.medicationCodeableConcept?.text ||
                                 resourceData.medicationReference?.display || // Otra forma común en FHIR
                                 resourceData.medication?.text || // Tu intento original, podría existir en otras variantes
                                 'Medicamento sin especificar';

          renderedContent = (
            <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-500" />
                Prescripción Médica
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    {medicationName}
                  </span>
                  {resourceData.status && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      resourceData.status === 'active'
                        ? 'bg-yellow-100 text-yellow-800'
                        : resourceData.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {mrStatus}
                    </span>
                  )}
                </div>
                {resourceData.dosageInstruction && resourceData.dosageInstruction.length > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      Instrucciones: {resourceData.dosageInstruction.map((instr: any) => instr.text || instr.timing?.code?.display || instr.route?.text).join('; ')}
                    </p>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {resourceData.authoredOn && (
                        <span>Fecha: {formatDate(resourceData.authoredOn)}</span>
                    )}
                    {resourceData.requester?.display && (
                      <span>Prescrito por: {resourceData.requester.display}</span>
                    )}
                  </div>
                </div>
                {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        Nota: {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
              </div>
            </section>
          );
           break;

        case 'MedicationDispense':
          const mdStatus = resourceData.status ? getMedicationDispenseStatusDisplay(resourceData.status) : 'Estado desconocido';
          const dispenseMedicationName = resourceData.medicationCodeableConcept?.coding?.[0]?.display ||
                                         resourceData.medicationCodeableConcept?.text ||
                                         resourceData.medicationReference?.display ||
                                         resourceData.medication?.text ||
                                         'Medicamento sin especificar';
          renderedContent = (
            <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                Entrega de Medicamento
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    {dispenseMedicationName}
                  </span>
                  {resourceData.status && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      resourceData.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {mdStatus}
                    </span>
                  )}
                </div>
                {resourceData.quantity && (
                   <div className="mt-2">
                      <span className="text-xl font-semibold">
                        {resourceData.quantity.value}
                      </span>
                      <span className="ml-1 text-gray-600">
                        {resourceData.quantity.unit || ''}
                      </span>
                    </div>
                )}
                <div className="text-sm text-gray-500">
                   {resourceData.whenHandedOver && (
                       <span>Fecha de entrega: {formatDate(resourceData.whenHandedOver)}</span>
                   )}
                </div>
                 {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
              </div>
            </section>
          );
           break;

        case 'AllergyIntolerance':
            const allergySubstance = resourceData.code?.text || resourceData.code?.coding?.[0]?.display || 'Sustancia desconocida';
            renderedContent = (
              <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Alergia/Intolerancia
                </h2>
                <div className="space-y-4">
                  {allergySubstance && (
                       <div>
                           <span className="font-medium text-gray-700">Sustancia: {allergySubstance}</span>
                       </div>
                  )}
                   {resourceData.clinicalStatus?.coding?.[0]?.code && (
                       <div className="text-sm text-gray-600">
                           Estado clínico: {getAllergyIntoleranceClinicalStatusDisplay(resourceData.clinicalStatus.coding[0].code)}
                       </div>
                   )}
                   {resourceData.verificationStatus?.coding?.[0]?.code && (
                       <div className="text-sm text-gray-600">
                           Estado de verificación: {getVerificationStatusDisplay(resourceData.verificationStatus.coding[0].code)}
                       </div>
                   )}
                   {resourceData.recordedDate && (
                       <div className="text-sm text-gray-500">
                           Fecha de registro: {formatDate(resourceData.recordedDate)}
                       </div>
                   )}
                   {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
            break;

        case 'ClinicalImpression':
            renderedContent = (
              <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FilePenLine className="w-5 h-5 text-blue-600" />
                  Diagnóstico Médico
                </h2>
                <div className="space-y-4">
                  {resourceData.date && ( // `date` es común, también puede ser `effectiveDateTime` o `effectivePeriod`
                       <div>
                           <span className="font-medium text-gray-700">Fecha: {formatDate(resourceData.date)}</span>
                       </div>
                  )}
                  {resourceData.description && (
                      <div>
                          <span className="font-medium text-gray-700">Descripción:</span>
                          <p className="mt-1 text-gray-600">{resourceData.description}</p>
                      </div>
                  )}
                   {resourceData.status && (
                       <div className="text-sm text-gray-600">
                           Estado: {getClinicalImpressionStatusDisplay(resourceData.status)}
                       </div>
                   )}
                   {resourceData.summary && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                             <p className="text-sm text-gray-600">Resumen: {resourceData.summary}</p>
                        </div>
                   )}
                   {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        {resourceData.note.map((n:any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
            break;

        case 'Immunization':
            const vaccineName = resourceData.vaccineCode?.text || resourceData.vaccineCode?.coding?.[0]?.display || 'Vacuna desconocida';
            renderedContent = (
              <section key={uniqueKey} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  Inmunización
                </h2>
                <div className="space-y-4">
                  {vaccineName && (
                       <div>
                           <span className="font-medium text-gray-700">Vacuna: {vaccineName}</span>
                       </div>
                  )}
                  {resourceData.occurrenceDateTime && (
                       <div className="text-sm text-gray-500">
                           Fecha: {formatDate(resourceData.occurrenceDateTime)}
                       </div>
                  )}
                   {resourceData.status && (
                       <div className="text-sm text-gray-600">
                           Estado: {getImmunizationStatusDisplay(resourceData.status)}
                       </div>
                   )}
                   {resourceData.lotNumber && (
                       <div className="text-sm text-gray-600">
                           Lote: {resourceData.lotNumber}
                       </div>
                   )}
                   {resourceData.route?.text && (
                        <div className="text-sm text-gray-600">
                            Vía: {getMedicationRouteDisplay(resourceData.route.text)}
                        </div>
                   )}
                   {resourceData.doseQuantity?.value && (
                        <div className="text-sm text-gray-600">
                            Dosis: {resourceData.doseQuantity.value} {resourceData.doseQuantity.unit || ''}
                        </div>
                   )}
                   {resourceData.note && resourceData.note.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        Nota: {resourceData.note.map((n: any) => n.text).join('; ')}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
            break;

        default:
          console.warn('No rendering template for resource type:', resourceKey, 'con datos:', resourceData);
          renderedContent = null;
      }

      return renderedContent;
    }).filter(Boolean); // Filtra cualquier elemento null que pueda haber resultado

  return (
    <div className="space-y-8">
      {formattedResults}
    </div>
  );
};

export default MedicalRecords;