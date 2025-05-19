// Type definitions for the medical records application

export interface ApiResponse {
  results: ApiResult[];
}

export interface ApiResult {
  document: {
    structData: any;
  };
}

export interface PatientInfo {
  name: string;
  id: string;
  birthDate: string;
  gender: string;
  identifier: string;
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
  dui: string;
  identifier: {
    system: string; // e.g., "urn:elsalvador:dui"
    value: string;
  }[];
  createdAt?: string; // Optional: timestamp of creation
  // Add any other fields you store directly under the patient node
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
  // This was defined for the PatientSelector, let's align it with the Patient type
  // Or create a mapping function if the source for PatientListItem is different
  id: string; // Align with Patient.id
  Name: string; // This would be derived from patient.name
  // Consider if other fields like DUI are needed for the list item
  dui?: string;
}
