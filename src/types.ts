// Type definitions for the medical records application

export interface ApiResponse {
  results: ApiResult[];
}

export interface ApiResult {
  document: {
    id: any; // Consider using a more specific type if possible, e.g., string
    structData: any; // FHIR resources are complex, 'any' is practical here unless you type them individually
  };
}

// --- Tipos para NotasConsulta ---
export interface NotaConsultaItem {
  response: string; // El texto de la nota
}

export interface NotasConsultaType {
  [dateKey: string]: NotaConsultaItem; // La clave es la fecha/timestamp (string), el valor es el objeto de la nota
}
// --- Fin Tipos para NotasConsulta ---


export interface PatientInfo {
  name: string;
  id: string;
  birthDate: string;
  gender: string;
  identifier: string; // Usualmente el DUI para la UI
  NotasConsulta?: NotasConsultaType; // Notas de consulta para el paciente, opcional
}

// Define a comprehensive Patient type based on Firebase structure
export interface Patient {
  id: string;
  resourceType: "Patient"; // Typically "Patient"
  name: {
    family: string;
    given: string[];
    use: string; // e.g., "official"
  }[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string; // YYYY-MM-DD
  dui: string; // Manteniendo DUI como campo principal si es usado así en la DB
  identifier: {
    system: string; // e.g., "urn:elsalvador:dui"
    value: string;
  }[];
  createdAt?: string; // Optional: timestamp of creation

  // --- Campo añadido para NotasConsulta ---
  NotasConsulta?: NotasConsultaType; // Este es el nuevo campo
  // --- Fin Campo añadido ---

  // Estructura para los diferentes tipos de recursos médicos anidados bajo el paciente
  // Estos son opcionales porque un nuevo paciente podría no tenerlos.
  // La clave es el ID del recurso específico.
  observations?: { [key: string]: any }; // Reemplazar 'any' con el tipo FHIR Observation si lo tienes
  conditions?: { [key: string]: any }; // Reemplazar 'any' con el tipo FHIR Condition
  procedures?: { [key: string]: any };
  encounters?: { [key: string]: any };
  medicationAdministrations?: { [key: string]: any };
  medicationAdministrationsDuplicate?: { [key: string]: any }; // Si es un tipo separado
  allergyIntolerances?: { [key: string]: any };
  clinicalImpressions?: { [key: string]: any };
  immunizations?: { [key: string]: any };
  medicationRequests?: { [key: string]: any };
  // Añadir otros tipos de recursos si los tienes (DiagnosticReport, ServiceRequest, etc.)
}


export interface Category {
  text?: string;
  coding?: {
    code: string;
    system?: string;
    display?: string;
  }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PatientListItem {
  id: string;
  Name: string; // Derivado de patient.name
  dui?: string; // Opcional si lo necesitas en la lista
}