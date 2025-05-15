import React, { useState, useRef, useEffect } from 'react';
import { PatientInfo } from '../types'; // Asegúrate de que esta ruta sea correcta
import { User, Mic } from 'lucide-react';
import { FileUp, Scan } from 'lucide-react'; // Importamos iconos para los botones de archivo/análisis
import ReactMarkdown from 'react-markdown';

// Interfaz para las notas guardadas
interface SavedNote {
  id: string;
  title: string;
}

interface PatientSidebarProps {
  patientInfo: PatientInfo | null;
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  fhirData: string | null;
}

const PatientSidebar: React.FC<PatientSidebarProps> = ({
  patientInfo,
  categories,
  selectedCategory,
  setSelectedCategory,
  fhirData
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioStream = useRef<MediaStream | null>(null);

  const savedNotesPlaceholder: SavedNote[] = [
    { id: 'note-1', title: 'Consulta inicial - 2023-10-26' },
    { id: 'note-2', title: 'Seguimiento - 2023-11-15' },
    { id: 'note-3', title: 'Resultados de laboratorio - 2024-01-10' },
    { id: 'note-4', title: 'Evaluación post-tratamiento - 2024-03-01' },
  ];
  const [selectedSavedNote, setSelectedSavedNote] = useState<string>('');

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisResultsRef = useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      const options = { mimeType: 'audio/webm; codecs=opus' };
      mediaRecorder.current = new MediaRecorder(stream, options);
      audioChunks.current = [];
      setAudioBlob(null);

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: mediaRecorder.current?.mimeType || 'audio/webm' });
        setAudioBlob(audioBlob);
        if (audioStream.current) {
           audioStream.current.getTracks().forEach(track => track.stop());
           audioStream.current = null;
        }
        setIsRecording(false);
        console.log("Grabación detenida y blob creado:", audioBlob);
      };

      mediaRecorder.current.onerror = (event: Event) => {
          const error = (event as any).error as DOMException | undefined;
          console.error('MediaRecorder error:', error);
          setRecordingError(`Error de grabación: ${error?.name || 'Desconocido'} - ${error?.message || 'Sin mensaje'}`);
          setIsRecording(false);
          if (audioStream.current) {
            audioStream.current.getTracks().forEach(track => track.stop());
            audioStream.current = null;
          }
          mediaRecorder.current = null;
          audioChunks.current = [];
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      console.log("Grabación iniciada...");

    } catch (error: any) {
      console.error('Error starting recording:', error);
      setRecordingError(`No se pudo iniciar la grabación: ${error.message || 'Error desconocido'}. Asegúrate de dar permiso al micrófono.`);
      setIsRecording(false);
      if (audioStream.current) {
         audioStream.current.getTracks().forEach(track => track.stop());
         audioStream.current = null;
      }
      mediaRecorder.current = null;
      audioChunks.current = [];
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      console.log("Deteniendo grabación...");
      mediaRecorder.current.stop();
      setRecordingError(null);
    }
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setRecordingError(null);
      setAudioBlob(null);
      startRecording();
    }
  };

   const handleGenerateNotes = () => {
      if (!audioBlob) {
          console.warn("No hay audio grabado para generar notas.");
          setRecordingError("Por favor, graba audio antes de generar notas.");
          return;
      }
      console.log("Generando notas AI con el audio:", audioBlob);
      setRecordingError(null);
      const formData = new FormData();
      const fileExtension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
      formData.append('audio', audioBlob, `grabacion_${Date.now()}.${fileExtension}`);
      formData.append('patientId', patientInfo?.id || '');
      console.log("Simulando envío a la API para generar notas...");
   };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedCategory(value === '' ? null : value);
  };

  const handleSavedNoteChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const noteId = event.target.value;
    setSelectedSavedNote(noteId);
    console.log("Nota guardada seleccionada (simulado):", noteId);
  };

  const handleUploadButtonClick = () => {
    setAnalysisResults(null);
    setAnalysisError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
      setUploadedImages(validFiles.length > 0 ? validFiles : []);
      console.log("Archivos seleccionados:", validFiles);
      event.target.value = '';
    } else {
        setUploadedImages([]);
        console.log("Selección de archivos cancelada.");
    }
  };

  const handleAnalyzeExams = async () => {
    if (uploadedImages.length === 0) {
        setAnalysisError("Por favor, sube al menos una imagen para analizar.");
        return;
    }
     if (!fhirData) {
        setAnalysisError("No hay datos FHIR disponibles para el análisis.");
        return;
    }
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisResults(null);
    setAnalysisError(null);

    const apiUrl = 'https://bamsimage-127465468754.us-central1.run.app';
    const formData = new FormData();
    formData.append('prompt', fhirData);
    formData.append('image_file', uploadedImages[0]);

    console.log("Enviando datos para análisis de imagen a:", apiUrl);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        const resultText = await response.text();
        console.log("Respuesta cruda de la API:", resultText);

        try {
            const outerResult = JSON.parse(resultText);
            if (outerResult && typeof outerResult.response === 'string') {
                let contentFromApi = outerResult.response;
                console.log("Contenido dentro de 'response' (crudo):", contentFromApi);

                // Limpieza de delimitadores ``` (json, etc.)
                contentFromApi = contentFromApi.replace(/^```(?:\w*\n)?/, '').replace(/```$/, '');
                console.log("Contenido después de quitar delimitadores ```:", contentFromApi);

                let finalDisplayContent = "";

                try {
                    // Intenta parsear el contenido como JSON
                    const jsonData = JSON.parse(contentFromApi);

                    // Si es un objeto JSON, formatéalo como Markdown
                    if (typeof jsonData === 'object' && jsonData !== null) {
                        let markdownOutput = "### Resultados del Análisis:\n\n";
                        for (const key in jsonData) {
                            if (Object.prototype.hasOwnProperty.call(jsonData, key)) {
                                const value = jsonData[key];
                                const readableKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Ej: some_key -> Some Key

                                markdownOutput += `**${readableKey}:**\n`;
                                if (Array.isArray(value)) {
                                    value.forEach(item => {
                                        if (typeof item === 'object' && item !== null) {
                                            markdownOutput += `- ${JSON.stringify(item)}\n`; // Si el item es objeto, stringify
                                        } else {
                                            markdownOutput += `- ${item}\n`;
                                        }
                                    });
                                } else if (typeof value === 'object' && value !== null) {
                                    // Para objetos anidados, podrías iterar o simplemente mostrar como JSON
                                    markdownOutput += `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
                                }
                                else {
                                    markdownOutput += `${value}\n`;
                                }
                                markdownOutput += "\n"; // Espacio extra entre propiedades
                            }
                        }
                        finalDisplayContent = markdownOutput;
                        console.log("Contenido JSON parseado y formateado a Markdown:", finalDisplayContent);
                    } else {
                        // Si no es un objeto (ej. solo un string "hola" que fue parseado) o ya era Markdown
                        finalDisplayContent = contentFromApi; // Usar como está
                        console.log("Contenido no es un objeto JSON, usando como Markdown/texto:", finalDisplayContent);
                    }
                } catch (innerJsonError) {
                    // Si falla el parseo interno, significa que `contentFromApi` no era JSON válido.
                    // Así que asumimos que ya es Markdown o texto plano.
                    console.warn("El contenido de 'response' no es JSON válido, se tratará como Markdown/texto:", contentFromApi);
                    finalDisplayContent = contentFromApi;
                }
                setAnalysisResults(finalDisplayContent);

            } else {
                throw new Error("Estructura de respuesta de la API inesperada o 'response' no es un string.");
            }
        } catch (jsonError: any) {
            console.error('Error al procesar la respuesta de la API (parseo exterior o estructura):', jsonError);
            // Si el error es por parseo de `resultText` y este no es JSON, pero podría ser Markdown directamente
            if (resultText && !resultText.startsWith('{') && !resultText.startsWith('[')) {
                console.log("La respuesta no es JSON, pero podría ser Markdown. Mostrando directamente:", resultText);
                setAnalysisResults(resultText); // Intentar mostrar como Markdown si no es JSON
            } else {
                setAnalysisError(`Error al procesar la respuesta del análisis: ${jsonError.message}. Intenta de nuevo.`);
            }
        }

    } catch (error: any) {
        console.error('Error al analizar la imagen con la API (fetch):', error);
        setAnalysisError(`Error al realizar el análisis: ${error.message}. Asegúrate de que la API está accesible.`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    console.log("PatientSidebar montado. Valor inicial de fhirData:", fhirData);
    return () => {
      console.log("Limpiando al desmontar PatientSidebar...");
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        if (mediaRecorder.current.onerror) mediaRecorder.current.onerror = null;
        try { mediaRecorder.current.stop(); } catch (e) { console.warn("Error stopping MediaRecorder during cleanup:", e); }
      }
       if (audioStream.current) {
         audioStream.current.getTracks().forEach(track => track.stop());
         audioStream.current = null;
       }
       mediaRecorder.current = null;
       audioChunks.current = [];
    };
  }, []);

  useEffect(() => {
      if (patientInfo) {
          setUploadedImages([]);
          setAnalysisResults(null);
          setAnalysisError(null);
          setIsAnalyzing(false);
      }
  }, [patientInfo]);

  useEffect(() => {
      if (analysisResultsRef.current && analysisResults !== null) {
          setTimeout(() => {
             if (analysisResultsRef.current) {
                analysisResultsRef.current.scrollTop = 0;
             }
          }, 0);
      }
  }, [analysisResults]);


  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 fixed h-full overflow-y-auto">
      <div className="space-y-4">
        {/* Patient Info Section */}
        <div className="flex items-center gap-2 text-gray-800">
          <User className="w-5 h-5" />
          <span className="font-medium">Información del Paciente</span>
        </div>
        {patientInfo && (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">{patientInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">DUI</p>
              <p className="font-medium">{patientInfo.identifier}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
              <p className="font-medium">{new Date(patientInfo.birthDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Género</p>
              <p className="font-medium">{patientInfo.gender === 'female' ? 'Femenino' : patientInfo.gender === 'male' ? 'Masculino' : 'Otro'}</p>
            </div>
          </div>
        )}

        {/* Categories Dropdown */}
        {patientInfo && (
          <>
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Categorías</h3>
              <select
                value={selectedCategory || ''}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
              >
                <option value="">Todas las Categorías</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <hr className="my-4 border-gray-200" />

        {/* AI Notes Section (Generation) */}
        {patientInfo && (
          <div className="mt-8 flex flex-col items-center">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Notas AI</h3>
            <button
              onClick={handleMicButtonClick}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors 
                ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
              aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
              title={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
              disabled={recordingError !== null}
              style={{ backgroundColor: !isRecording ? '#29a3ac' : undefined }}
              onMouseEnter={(e) => { if (!isRecording) e.currentTarget.style.backgroundColor = '#238f96'; }}
              onMouseLeave={(e) => { if (!isRecording) e.currentTarget.style.backgroundColor = '#29a3ac'; }}
            >
              <Mic className="w-8 h-8" />
            </button>
             {isRecording && <p className="mt-2 text-sm text-red-600">Grabando...</p>}
             {recordingError && <p className="mt-2 px-3 text-sm text-red-600 text-center">{recordingError}</p>}
            <button
                onClick={handleGenerateNotes}
                disabled={!audioBlob || isRecording}
                className={`mt-4 text-sm py-2 px-4 rounded-md transition-colors ${!audioBlob || isRecording ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              Generar notas AI
            </button>
             {audioBlob && (
                <p className="mt-2 text-xs text-gray-500">Audio grabado ({Math.round(audioBlob.size / 1024)} KB) - Tipo: {audioBlob.type}</p>
             )}
          </div>
        )}

        {/* Saved AI Notes Dropdown */}
        {patientInfo && (
            <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Notas AI Guardadas</h3>
                <select
                  value={selectedSavedNote}
                  onChange={handleSavedNoteChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                >
                    <option value="" disabled>Seleccionar nota guardada</option>
                    {savedNotesPlaceholder.map((note) => (
                        <option key={note.id} value={note.id}>
                            {note.title}
                        </option>
                    ))}
                     {savedNotesPlaceholder.length === 0 && (
                        <option value="" disabled>No hay notas guardadas</option>
                     )}
                </select>
            </div>
        )}

        <hr className="my-4 border-gray-200" />

         {/* AI Exam Analysis Section */}
         {patientInfo && (
          <div className="flex flex-col">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Análisis de Exámenes AI</h3>
              <div
                  ref={analysisResultsRef}
                  className="mt-2 p-3 text-sm bg-gray-100 rounded-md min-h-[100px] max-h-[300px] overflow-y-auto text-gray-800" // Aumenté max-h para mejor visualización
              >
                  {isAnalyzing ? (
                      <p className="text-blue-600 italic">Analizando imagen con IA...</p>
                  ) : analysisError ? (
                      <p className="text-red-600">{analysisError}</p>
                  ) : analysisResults ? (
                      // Usamos ReactMarkdown para renderizar el contenido, que ahora puede ser Markdown formateado
                      <div className="prose prose-sm max-w-none"> {/* prose para estilos de markdown */}
                        <ReactMarkdown>{analysisResults}</ReactMarkdown>
                      </div>
                  ) : uploadedImages.length > 0 ? (
                      <p className="text-gray-600">{uploadedImages.length} imagen(es) seleccionada(s). Listas para analizar.</p>
                  ) : (
                      <p className="text-gray-600">Sube una imagen de examen para análisis AI.</p>
                  )}
              </div>

              <div className="flex space-x-2 items-center justify-end mt-4">
                 <input
                    type="file"
                    accept="image/*"
                    multiple={false}
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                 />
                 <button
                    onClick={handleUploadButtonClick}
                    className={`text-sm py-2 px-3 rounded-md ${uploadedImages.length > 0 ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors flex items-center justify-center`}
                    aria-label="Subir imagen de examen"
                    title="Subir imagen de examen"
                    disabled={isAnalyzing}
                 >
                    <FileUp className="w-4 h-4 mr-1"/> Subir
                </button>
                <button
                  onClick={handleAnalyzeExams}
                  disabled={uploadedImages.length === 0 || !fhirData || isAnalyzing}
                  className={`text-sm py-2 px-3 rounded-md transition-colors flex items-center 
                    ${uploadedImages.length === 0 || !fhirData || isAnalyzing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-white'}`}
                  style={{ backgroundColor: (uploadedImages.length === 0 || !fhirData || isAnalyzing) ? undefined : '#29a3ac' }}
                  onMouseEnter={(e) => { if (!(uploadedImages.length === 0 || !fhirData || isAnalyzing)) e.currentTarget.style.backgroundColor = '#238f96'; }}
                  onMouseLeave={(e) => { if (!(uploadedImages.length === 0 || !fhirData || isAnalyzing)) e.currentTarget.style.backgroundColor = '#29a3ac'; }}
                >
                  <Scan className="w-4 h-4 mr-1" /> Analizar AI
                </button>
            </div>
        </div>
        )}
      </div>
    </aside>
  );
};

export default PatientSidebar;