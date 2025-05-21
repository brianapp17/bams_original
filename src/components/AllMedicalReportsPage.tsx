// AllMedicalReportPages.tsx
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
import { app } from '../firebase';
import { FileText, Download, Eye, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MedicalReport {
  id: string; // La key única de Firebase
  patientId: string;
  patientName: string;
  fileName: string;
  downloadURL: string;
  timestamp: string;
  reportDate: string;
}

const AllMedicalReportPages: React.FC = () => {
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);

  const auth = getAuth(app);
  const database = getDatabase(app);

  useEffect(() => {
    let unsubscribeReports: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        // ¡CAMBIO CLAVE AQUÍ! Referencia al nodo principal de reportes del doctor
        const reportsRef = ref(database, `doctors/${doctorUid}/medicalReports`);

        setIsLoading(true);
        setError(null);

        unsubscribeReports = onValue(reportsRef, (snapshot) => {
          const reportsData = snapshot.val();
          const loadedReports: MedicalReport[] = [];
          if (reportsData) {
            // Itera sobre las claves (IDs únicos) de los reportes
            Object.keys(reportsData).forEach(key => {
              loadedReports.push({
                id: key,
                ...reportsData[key]
              });
            });
          }
          // Ordena los reportes por fecha (más reciente primero)
          loadedReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setMedicalReports(loadedReports);
          setIsLoading(false);
        }, (dbError) => {
          console.error("Error fetching medical reports:", dbError);
          setError('Error al cargar los reportes médicos.');
          setIsLoading(false);
        });
      } else {
        setMedicalReports([]);
        setIsLoading(false);
        setError('Debe iniciar sesión para ver sus reportes.');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeReports) {
        unsubscribeReports();
      }
    };
  }, [auth, database]);

  const handleViewReport = (url: string) => {
    setSelectedReportUrl(url);
  };

  const handleCloseModal = () => {
    setSelectedReportUrl(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600 text-lg">
        Cargando reportes médicos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-teal-800">Mis Reportes Médicos</h1>
          {/* Botón para volver a la lista de expedientes (dashboard) */}
          <Link to="/expedientes" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Volver a Expedientes
          </Link>
        </div>

        {medicalReports.length === 0 ? (
          <p className="text-center text-gray-600">No hay reportes médicos guardados aún.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicalReports.map((report) => (
              <div key={report.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center text-blue-600 mb-2">
                    <FileText className="w-5 h-5 mr-2" />
                    {/* Muestra el nombre del archivo o un título más amigable */}
                    <h3 className="font-semibold text-lg">Reporte de {report.patientName}</h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    <span className="font-medium">ID Paciente:</span> {report.patientId}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Fecha:</span> {report.reportDate}
                  </p>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <a
                    href={report.downloadURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-1" /> Descargar
                  </a>
                  <button
                    onClick={() => handleViewReport(report.downloadURL)}
                    className="flex items-center px-3 py-1 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" /> Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para ver el PDF */}
      {selectedReportUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
            <button
              onClick={handleCloseModal}
              className="absolute top-3 right-3 text-gray-800 hover:text-gray-600 focus:outline-none"
            >
              <XCircle className="w-7 h-7" />
            </button>
            <iframe
              src={selectedReportUrl}
              title="Reporte Médico"
              className="w-full flex-1 rounded-b-lg"
              style={{ border: 'none' }}
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMedicalReportPages;