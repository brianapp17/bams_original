import React, { useState, useEffect } from 'react';
import { TestTube2} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { fetchMarkdown} from '../api';

interface HeaderProps {
  resetSearch: () => void;
  patientId: string | null;
}

const Header: React.FC<HeaderProps> = ({ resetSearch, patientId }): JSX.Element => {
  console.log("Header component rendering, patientId:", patientId);
  const [isDownloading, setIsDownloading] = useState(false);
  // Eliminamos loadingMessageIndex
  // const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [buttonText, setButtonText] = useState("Reporte AI");

  const loadingMessages = [
    "Reporte AI",
    "Analizando historial",
    "Leyendo expediente",
    "Resumiendo datos médicos",
    "IA en acción",
    "Generando informe",
    "Detectando diagnósticos clave",
    "Resumiendo inteligentemente",
    "Procesando paciente",
    "Ordenando información clínica",
    "Informe inteligente en camino",
  ];

  // El primer useEffect para establecer el texto inicial es redundante
  // porque buttonText ya se inicializa con ese valor. Lo eliminamos.
  // useEffect(() => {
  //   setButtonText("Generar PDF AI");
  // }, []);

  const handleDownload = async () => {
    console.log("handleDownload function called");
    if (!patientId) {
        alert("Por favor, selecciona un paciente antes de descargar.");
      return;
    }
    setIsDownloading(true); // Inicia el modo descarga/carga
    try {
      const markdownResponse: string = await fetchMarkdown(patientId);
      if (!markdownResponse) {
        throw new Error("Failed to fetch markdown");
      }
      const generatePdf = (markdown: string) => {
        const splitTextIntoLines = (text: string, pdf: jsPDF, maxLineWidth: number): string[] => {
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine + word + ' ';
            const { w } = pdf.getTextDimensions(testLine);
            if (w > maxLineWidth) {
              lines.push(currentLine.trim());
              currentLine = word + ' ';
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine.trim());
          return lines;
        };
        const pdf = new jsPDF();
        const maxLineWidth = 190;
        try {
          const parsedMarkdown = JSON.parse(markdown);
          const reportText = parsedMarkdown.response;
          const lines = reportText.split('\n').flatMap((line: string) => splitTextIntoLines(line, pdf, maxLineWidth));
          let y = 20;
          lines.forEach((line: string) => {
            if (y > 280) {
              pdf.addPage();
              y = 20;
            }
            pdf.text(line, 10, y);
            y += 10;
          });
        } catch (error) {
          console.error('Error parsing markdown:', error);
          }

        pdf.save(`medical-report-${patientId}.pdf`);
      }
      generatePdf(markdownResponse);
    } catch (error) {
      console.error('Error downloading markdown:', error);
      // Opcional: manejar el texto del botón en caso de error
      setButtonText("Error al generar PDF");
    } finally {
        setIsDownloading(false); // Finaliza el modo descarga/carga
        setButtonText(loadingMessages[0]); // Siempre restablece al texto inicial
    }
  };

  // Este useEffect ahora maneja solo el cambio de texto del botón
  // cuando isDownloading es true.
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isDownloading) {
      intervalId = setInterval(() => {
        // Encuentra el índice actual del texto mostrado
        const currentIndex = loadingMessages.indexOf(buttonText);
        // Calcula el próximo índice (cicla si llega al final)
        const nextIndex = (currentIndex + 1) % loadingMessages.length;
        // Actualiza directamente el texto del botón
        setButtonText(loadingMessages[nextIndex]);
      }, 1500);
    }

    // Función de limpieza: limpia el intervalo cuando isDownloading cambia a false
    // o cuando el componente se desmonta.
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
       // No restablecemos buttonText aquí, ya que handleDownload.finally lo hace.
    };
  }, [isDownloading, loadingMessages, buttonText]); // Añadimos buttonText a las dependencias porque lo leemos.

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-blue-600 cursor-pointer" onClick={resetSearch}>
        <TestTube2 className="w-6 h-6" /> <span className="text-lg font-medium">Búsqueda Artificial Médica Salud</span>
      </div>
      {patientId && (

<button
className={`text-white font-bold py-2 px-4 rounded flex items-center gap-2 
  ${isDownloading ? 'cursor-wait opacity-50' : ''}`}
onClick={handleDownload}
disabled={isDownloading}
style={{
  backgroundColor: isDownloading ? '#29a3ac' : '#29a3ac'
}}
onMouseEnter={(e) => {
  if (!isDownloading) {
    e.currentTarget.style.backgroundColor = '#238f96';
  }
}}
onMouseLeave={(e) => {
  if (!isDownloading) {
    e.currentTarget.style.backgroundColor = '#29a3ac';
  }
}}
>
{buttonText}
</button>



      )}
    </header>
  );
};

export default Header;