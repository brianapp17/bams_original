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
  Name: string;
  Id: string;
}