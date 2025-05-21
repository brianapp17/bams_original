// Header.tsx
import React, { useState, useEffect, useRef } from 'react'; // Añadido useRef
import { TestTube2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { fetchMarkdown } from '../api'; // Ajusta la ruta si es necesario

interface HeaderProps {
  resetSearch: () => void;
  patientId: string | null;
  resultsData: string | null; // fhirDataString es string | null
}

const Header: React.FC<HeaderProps> = ({ resetSearch, patientId, resultsData }): JSX.Element => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [buttonText, setButtonText] = useState("Reporte AI");
  const intervalIdRef = useRef<NodeJS.Timeout | undefined>(undefined); // Para manejar el intervalo

  const loadingMessages = [
    "Reporte AI", // Estado inicial o después de éxito/error
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
    if (!patientId) {
      alert("Por favor, selecciona un paciente antes de descargar.");
      return;
    }
    if (!resultsData) {
      alert("No hay datos del paciente (registros médicos) para generar el reporte.");
      return;
    }

    setIsDownloading(true);
    let currentLoadingIndex = 1; // Empezar con el primer mensaje de carga
    setButtonText(loadingMessages[currentLoadingIndex]);

    // Limpiar intervalo anterior si existe
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    
    intervalIdRef.current = setInterval(() => {
      currentLoadingIndex = (currentLoadingIndex + 1) % (loadingMessages.length -1) ; // Ciclar solo mensajes de carga
      if (currentLoadingIndex === 0) currentLoadingIndex = 1; // Saltar el mensaje inicial "Reporte AI"
      setButtonText(loadingMessages[currentLoadingIndex]);
    }, 2000);

    try {
      console.log("Calling fetchMarkdown with patientId:", patientId);
      const markdownResponse: string = await fetchMarkdown(patientId, resultsData);
      console.log("Received markdownResponse from API:", markdownResponse);

      // Limpiar intervalo al recibir respuesta
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);

      const generatePdf = (markdownString: string) => {
        const pdf = new jsPDF({
          orientation: 'p', // portrait
          unit: 'mm', // milímetros
          format: 'a4' // tamaño A4
        });
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15; // Margen de 15mm en todos los lados
        const maxLineWidth = pageWidth - (margin * 2);
        let y = margin; // Posición Y inicial
        const lineHeight = 7; // Altura de línea (ajustar según tamaño de fuente)
        const fontSize = 11;

        pdf.setFontSize(fontSize);

        try {
          // Se espera que markdownString sea una cadena JSON que contiene una propiedad "response".
          const parsedContent = JSON.parse(markdownString);
          const reportText = parsedContent.response;

          if (typeof reportText !== 'string') {
            console.error('La propiedad "response" en el markdown parseado no es una cadena de texto:', reportText);
            throw new Error('Formato de respuesta inesperado del servicio de reportes.');
          }

          // Dividir el texto en líneas, manejando saltos de línea y ajuste de texto
          const lines = reportText.split('\n').reduce((acc: string[], paragraph: string) => {
            // Usar splitTextToSize para el ajuste automático de línea según el ancho
            const paragraphLines = pdf.splitTextToSize(paragraph, maxLineWidth);
            return acc.concat(paragraphLines);
          }, []);


          lines.forEach((line: string) => {
            if (y + lineHeight > pageHeight - margin) { // Si la línea excede la página
              pdf.addPage();
              y = margin; // Resetear Y a la posición inicial en la nueva página
            }
            pdf.text(line, margin, y);
            y += lineHeight;
          });

        } catch (error) {
          console.error('Error parsing markdown or generating PDF content:', error);
          alert(`Hubo un error al procesar el contenido del reporte: ${error instanceof Error ? error.message : String(error)}`);
          setButtonText("Error Procesando");
          setTimeout(() => setButtonText(loadingMessages[0]), 3000);
          return; // No intentar guardar
        }
        pdf.save(`reporte-medico-${patientId}.pdf`);
      };

      generatePdf(markdownResponse);
      setButtonText("Reporte Descargado");
      setTimeout(() => setButtonText(loadingMessages[0]), 3000);

    } catch (error) {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      console.error('Error during report generation process:', error);
      alert(`Error al generar el reporte: ${error instanceof Error ? error.message : String(error)}`);
      setButtonText("Error al Generar");
      setTimeout(() => setButtonText(loadingMessages[0]), 3000);
    } finally {
      setIsDownloading(false);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current); // Asegurar limpieza final
    }
  };

  // Efecto para limpiar el intervalo si el componente se desmonta mientras se descarga
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
          className={`text-white font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors duration-150 ${
            isDownloading ? 'cursor-wait opacity-75' : 'hover:bg-teal-700'
          }`}
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