// api.ts

const PATIENT_SERVICES_URL = 'https://patientservices-127465468754.us-central1.run.app';
const ALL_PATIENTS_URL = 'https://allpatientsid-127465468754.us-central1.run.app';
const CHATBOT_API_URL = 'https://bamsgenerador-127465468754.us-central1.run.app';
const PDFBAMS_API_URL = 'https://pdfbams-127465468754.us-central1.run.app';

export async function fetchAllPatients() {
  try {
    const response = await fetch(ALL_PATIENTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        action: 'allpatientsid'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to the patient service. Please check your network connection or try again later.');
    }
    // Re-lanzar el error para que sea manejado por el llamador
    throw error;
  }
}

export async function fetchPatientInfo(patientId: string) {
  const response = await fetch(PATIENT_SERVICES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patientId,
      action: 'fetchPatientInfo'
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch patient info');
  }

  return response.json();
}

export async function sendChatMessage(fhirData: string, consulta: string) {
  const response = await fetch(CHATBOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `fhir=${fhirData}, consulta_actual=${consulta}`
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get chatbot response: ${errorText}`);
  }

  return response.json();
}

/**
 * Fetches markdown content for a patient report using their ID and current medical records.
 * @param patientId The ID of the patient.
 * @param resultsData A JSON string of the patient's current medical records (e.g., fhirDataString).
 * @returns A promise that resolves to a string, which is expected to be a JSON string
 *          containing a "response" property with the report text.
 */
export async function fetchMarkdown(patientId: string, resultsData: string | null): Promise<string> {
  if (!resultsData) {
    // Este error será capturado por el .catch en Header.tsx
    throw new Error("Medical records data (resultsData) is required to generate the report.");
  }

  try {
    const promptPayload = `Fhir=${resultsData}`;

    const response = await fetch(PDFBAMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: promptPayload
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error response from ${PDFBAMS_API_URL}:`, response.status, errorBody);
      throw new Error(`Report generation service failed with status ${response.status}: ${errorBody || 'No error details provided'}`);
    }

    const responseText = await response.text();
    console.log(`Raw response from ${PDFBAMS_API_URL} (length ${responseText.length}):`, responseText);

    // Trim para remover espacios en blanco al inicio/final que podrían invalidar el JSON
    const trimmedResponseText = responseText.trim();

    // Validar que la respuesta trimeada realmente parece un objeto JSON
    if (!trimmedResponseText.startsWith('{') || !trimmedResponseText.endsWith('}')) {
      console.error("Trimmed response from report service does not appear to be a JSON object:", trimmedResponseText);
      throw new Error("Invalid format: Report service did not return a JSON object string. Check for unexpected characters or an empty response.");
    }

    // Intentar parsear el JSON aquí para una validación temprana.
    // Si esto falla, el error será más específico sobre el problema de parseo.
    try {
      const parsedJson = JSON.parse(trimmedResponseText);
      // Verificar si la propiedad "response" existe y es una cadena
      if (typeof parsedJson.response !== 'string') {
        console.error("Parsed JSON from report service is missing 'response' property or it's not a string:", parsedJson);
        throw new Error("Invalid content: Report data is missing the 'response' text field or it's not in the expected format.");
      }
      console.log("Response from report service successfully validated and parsed in api.ts.");
      // Devolvemos la cadena JSON original (trimeada), ya que Header.tsx espera parsearla.
      return trimmedResponseText;
    } catch (parseError) {
      console.error("Failed to parse JSON response from report service in api.ts:", parseError);
      console.error("Problematic JSON string (trimmed):", trimmedResponseText);
      throw new Error("Invalid structure: Report service returned malformed JSON. Check console for the problematic string.");
    }

  } catch (error) {
    // Este catch maneja errores de red (fetch mismo falla) o los errores lanzados arriba.
    console.error(`Error during fetchMarkdown for patient ${patientId}:`, error);
    if (error instanceof Error) {
      // Propagar el mensaje de error ya formateado si es uno de los nuestros,
      // o crear uno nuevo si es un error genérico.
      throw new Error(error.message.includes("Report service") || error.message.includes("Medical records data") ? error.message : `Failed to generate report: ${error.message}`);
    }
    throw new Error(`Failed to generate report for patient ${patientId}: An unknown error occurred.`);
  }
}

export function getCategoryLabel(category: string): string {
  const categoryMap: { [key: string]: string } = {
    'laboratory': 'Laboratorio',
    'imaging': 'Imágenes Diagnósticas',
    'ua': 'Análisis de Orina',
    'ch': 'Química Clínica',
    'hm': 'Hematología',
    'rad': 'Radiología/Imagen',
    'social-history': 'Historia Social',
    'procedure': 'Procedimientos',
    'vital-signs': 'Signos Vitales',
    'survey': 'Encuestas',
    'medication': 'Medicamentos',
    'condition': 'Condiciones Médicas',
    'immunization': 'Inmunizaciones',
    'allergy': 'Alergias',
    'encounter': 'Consultas',
    'diagnostic-report': 'Reportes Diagnósticos',
    'observation': 'Observaciones',
    'clinical-note': 'Notas Clínicas',
    'care-plan': 'Plan de Cuidado',
    'referral': 'Referencias',
    'family-history': 'Historia Familiar'
  };

  return categoryMap[category.toLowerCase()] || category;
}