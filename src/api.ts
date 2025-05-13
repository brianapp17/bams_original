

const PATIENT_SERVICES_URL = 'https://patientservices-127465468754.us-central1.run.app';
const ALL_PATIENTS_URL = 'https://allpatientsid-127465468754.us-central1.run.app';
const CHATBOT_API_URL = 'https://bamsgenerador-127465468754.us-central1.run.app';

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
    throw error;
  }
}

export async function searchMedicalRecords(patientId: string, query: string = '') {
  const response = await fetch(PATIENT_SERVICES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'search',
      patientId,
      query,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch medical records');
  }

  return response.json();
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


export async function fetchMarkdown(patientId: string): Promise<string> {
  try {
    const patientInfo = await searchMedicalRecords(patientId);

    const response = await fetch('https://pdfbams-127465468754.us-central1.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt:`Fhir=${JSON.stringify(patientInfo)}`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    return response.text();
  } catch (error) {
    throw new Error(`Failed to fetch markdown: ${error}`);
  }
}

export function getCategoryLabel(category: string): string {
  const categoryMap: { [key: string]: string } = {
    'laboratory': 'Laboratorio',
    'imaging': 'Imágenes Diagnósticas',
    'UA': 'Análisis de Orina',
    'CH': 'Química Clínica',
    'HM': 'Hematología',
    'RAD': 'Radiología/Imagen',
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

