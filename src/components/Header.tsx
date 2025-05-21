// Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TestTube2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { fetchMarkdown } from '../api';

// Firebase imports
import { getAuth } from "firebase/auth";
import { getDatabase, ref as dbRef, push, set } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from '../firebase'; // Asegúrate de que tu instancia de app de Firebase esté exportada aquí

interface HeaderProps {
  resetSearch: () => void;
  patientId: string | null;
  resultsData: string | null;
  patientName: string | null; // Importante para la metadata del reporte
}

const Header: React.FC<HeaderProps> = ({ resetSearch, patientId, resultsData, patientName }): JSX.Element => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [buttonText, setButtonText] = useState("Reporte AI");
  const intervalIdRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const storage = getStorage(app);

  const loadingMessages = [
    "Reporte AI",
    "Analizando historial...",
    "Leyendo expediente...",
    "Resumiendo datos médicos...",
    "IA en acción...",
    "Generando informe...",
    "Detectando diagnósticos...",
    "Resumiendo inteligentemente...",
    "Procesando paciente...",
    "Ordenando información...",
    "Informe en camino...",
  ];

  const handleDownload = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para generar reportes.");
      return;
    }
    if (!patientId) {
      alert("Por favor, selecciona un paciente antes de generar el reporte.");
      return;
    }
    if (!resultsData) {
      alert("No hay datos del paciente (registros médicos) para generar el reporte.");
      return;
    }

    setIsDownloading(true);
    let currentLoadingIndex = 1;
    setButtonText(loadingMessages[currentLoadingIndex]);

    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    intervalIdRef.current = setInterval(() => {
      currentLoadingIndex = (currentLoadingIndex + 1) % (loadingMessages.length - 1);
      if (currentLoadingIndex === 0) currentLoadingIndex = 1;
      setButtonText(loadingMessages[currentLoadingIndex]);
    }, 2000);

    try {
      console.log("Calling fetchMarkdown with patientId:", patientId);
      const markdownResponse: string = await fetchMarkdown(patientId, resultsData);
      console.log("Received markdownResponse from API:", markdownResponse);

      if (intervalIdRef.current) clearInterval(intervalIdRef.current);

      const generatePdfBlob = (markdownString: string): Blob | null => {
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4'
        });
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const maxLineWidth = pageWidth - (margin * 2);
        let y = margin;
        const lineHeight = 7;
        const fontSize = 11;

        pdf.setFontSize(fontSize);

        try {
          const parsedContent = JSON.parse(markdownString);
          const reportText = parsedContent.response;

          if (typeof reportText !== 'string') {
            console.error('La propiedad "response" en el markdown parseado no es una cadena de texto:', reportText);
            throw new Error('Formato de respuesta inesperado del servicio de reportes.');
          }

          const lines = reportText.split('\n').reduce((acc: string[], paragraph: string) => {
            const paragraphLines = pdf.splitTextToSize(paragraph, maxLineWidth);
            return acc.concat(paragraphLines);
          }, []);

          lines.forEach((line: string) => {
            if (y + lineHeight > pageHeight - margin) {
              pdf.addPage();
              y = margin;
            }
            pdf.text(line, margin, y);
            y += lineHeight;
          });

          return pdf.output('blob');

        } catch (error) {
          console.error('Error parsing markdown or generating PDF content:', error);
          alert(`Hubo un error al procesar el contenido del reporte: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      };

      const pdfBlob = generatePdfBlob(markdownResponse);

      if (pdfBlob) {
        // 1. Subir a Firebase Storage (ruta del Storage se mantiene igual, por doctor)
        const doctorUid = user.uid;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `reporte-medico-${patientId}-${timestamp}.pdf`;
        const storagePath = `doctor_reports/${doctorUid}/${fileName}`;
        const pdfStorageRef = storageRef(storage, storagePath);

        console.log("Uploading PDF to Storage:", storagePath);
        const uploadResult = await uploadBytes(pdfStorageRef, pdfBlob);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        console.log("PDF uploaded. Download URL:", downloadURL);

        // 2. Guardar metadata en Firebase Realtime Database (¡CAMBIO CLAVE AQUÍ!)
        // La referencia ahora es directamente bajo `medicalReports` del doctor
        const medicalReportsRef = dbRef(database, `doctors/${doctorUid}/medicalReports`);
        const newReportRef = push(medicalReportsRef); // Genera una key única para el reporte

        const reportData = {
          id: newReportRef.key,
          patientId: patientId,
          patientName: patientName || 'Paciente Desconocido', // Asegura que el nombre del paciente se guarde
          fileName: fileName,
          downloadURL: downloadURL,
          timestamp: new Date().toISOString(),
          reportDate: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        };

        await set(newReportRef, reportData);
        console.log("Report metadata saved to Realtime Database:", reportData);

        setButtonText("Reporte Guardado");
        setTimeout(() => setButtonText(loadingMessages[0]), 3000);

      } else {
        throw new Error("No se pudo generar el PDF.");
      }

    } catch (error) {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      console.error('Error during report generation/upload process:', error);
      alert(`Error al generar o guardar el reporte: ${error instanceof Error ? error.message : String(error)}`);
      setButtonText("Error al Generar");
      setTimeout(() => setButtonText(loadingMessages[0]), 3000);
    } finally {
      setIsDownloading(false);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-blue-600 cursor-pointer" onClick={resetSearch}>
        <TestTube2 className="w-6 h-6" />
        <span className="text-lg font-medium">Búsqueda Artificial Médica Salud</span>
      </div>
      {patientId && (
        <button
          className={`text-white font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors duration-150 ${isDownloading ? 'cursor-wait opacity-75' : 'hover:bg-teal-700'}`}
          onClick={handleDownload}
          disabled={isDownloading}
          style={{ backgroundColor: '#29a3ac' }}
        >
          {buttonText}
        </button>
      )}
    </header>
  );
};

export default Header;