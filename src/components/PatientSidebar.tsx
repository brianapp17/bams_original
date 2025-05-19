// PatientSidebar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { PatientInfo } from '../types';
import { User, Mic } from 'lucide-react';
import { FileUp, Scan } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Asegúrate de importar remarkGfm

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
  const analysisResultsRef = useRef<HTMLDivElement>(null); // Referencia para scroll

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
      // Aquí iría la lógica real para enviar el audio a tu API
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
    setUploadedImages([]); // Limpiar imágenes al subir una nueva
    setAnalysisResults(null); // Limpiar resultados previos
    setAnalysisError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
      if (validFiles.length > 0) {
          setUploadedImages([validFiles[0]]); // Solo procesar el primer archivo válido si multiple=false
      } else {
          setUploadedImages([]);
          setAnalysisError("Tipo de archivo no permitido. Por favor, sube una imagen (JPEG, PNG, GIF, BMP, WEBP).");
      }
      console.log("Archivos seleccionados:", validFiles);
      event.target.value = ''; // Clear the input so the same file can be selected again
    } else {
        setUploadedImages([]);
        setAnalysisError(null); // Clear error if selection is cancelled
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
    // Usar un prompt más específico para el análisis de imagen en contexto del paciente
    const analysisPrompt = `Analiza la siguiente imagen médica en el contexto de los registros médicos del paciente proporcionados en formato FHIR. Identifica hallazgos relevantes y su posible relación con el historial del paciente. Presenta los resultados de forma clara y estructurada. Registros FHIR del paciente: ${fhirData}`;

    formData.append('prompt', analysisPrompt); // Usar el prompt combinado
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

                // Intentar mantener el formato original tanto como sea posible si es Markdown
                setAnalysisResults(contentFromApi);

            } else {
                throw new Error("Estructura de respuesta de la API inesperada o 'response' no es un string.");
            }
        } catch (jsonError: any) {
            console.error('Error al procesar la respuesta de la API (parseo exterior o estructura):', jsonError);
            // Si falla el parseo, intentar mostrar el texto crudo si no parece ser JSON
            if (resultText && !resultText.trim().startsWith('{') && !resultText.trim().startsWith('[')) {
                 console.log("La respuesta no es JSON, pero podría ser texto/Markdown. Mostrando directamente:", resultText);
                 setAnalysisResults(resultText); // Intentar mostrar como Markdown/texto
            } else {
                 setAnalysisError(`Error al procesar la respuesta del análisis: ${jsonError.message}. Intenta de nuevo.`);
            }
        }

    } catch (error: any) {
        console.error('Error al analizar la imagen con la API (fetch):', error);
        setAnalysisError(`Error al realizar el análisis: ${error.message}. Asegúrate de que la API está accesible y corriendo.`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    console.log("PatientSidebar montado.");
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
          // Reiniciar estado al cambiar de paciente
          setUploadedImages([]);
          setAnalysisResults(null);
          setAnalysisError(null);
          setIsAnalyzing(false);
          setAudioBlob(null);
          setRecordingError(null);
          setIsRecording(false);
           if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                if (mediaRecorder.current.onerror) mediaRecorder.current.onerror = null;
                try { mediaRecorder.current.stop(); } catch (e) { console.warn("Error stopping MediaRecorder during patient change cleanup:", e); }
            }
           if (audioStream.current) {
             audioStream.current.getTracks().forEach(track => track.stop());
             audioStream.current = null;
           }
           mediaRecorder.current = null;
           audioChunks.current = [];
      }
  }, [patientInfo]);

  // Scroll analysis results to top when they change
  useEffect(() => {
      if (analysisResultsRef.current && analysisResults !== null) {
          analysisResultsRef.current.scrollTop = 0;
      }
  }, [analysisResults]);


  return (
    // ROOT element: Must take full height and be a flex column container
    <aside className="bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden"> {/* Removed fixed, w-64, p-4, border-r */}
      {/* Header/Patient Info Section (Flex-shrink-0) */}
      <div className="p-4 pb-0 flex-shrink-0"> {/* Added p-4 back, pb-0 for spacing control */}
          <div className="flex items-center gap-2 text-gray-800 mb-3"> {/* mb-3 to add space below icon/title */}
            <User className="w-5 h-5" />
            <span className="font-medium">Información del Paciente</span>
          </div>
          {patientInfo && (
            <div className="space-y-2 text-sm text-gray-700 mb-4"> {/* space-y-2, mb-4 for bottom margin */}
              <div>
                <p className="text-xs text-gray-500">Nombre</p> {/* Smaller text for labels */}
                <p className="font-medium">{patientInfo.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">DUI</p>
                <p className="font-medium">{patientInfo.identifier}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fecha de Nacimiento</p>
                <p className="font-medium">{new Date(patientInfo.birthDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Género</p>
                <p className="font-medium">{patientInfo.gender === 'female' ? 'Femenino' : patientInfo.gender === 'male' ? 'Masculino' : 'Otro'}</p>
              </div>
            </div>
          )}

          <hr className="my-4 border-gray-200" /> {/* Keep separator */}
      </div>


      {/* Main Content Area (Flex-1, Scrollable) */}
      {/* This div takes up remaining space and handles scrolling for its content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6"> {/* Added flex-1, overflow-y-auto, p-4, space-y-6 */}

          {/* Categories Dropdown */}
          {patientInfo && (
            <div>
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
          )}

          {/* AI Notes Section (Generation) */}
          {patientInfo && (
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notas AI (Audio)</h3>
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
                  <p className="mt-2 text-xs text-gray-500 text-center">Audio grabado ({Math.round(audioBlob.size / 1024)} KB) - Tipo: {audioBlob.type}</p>
              )}
            </div>
          )}

          {/* Saved AI Notes Dropdown */}
          {patientInfo && (
              <div>
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

          {/* AI Exam Analysis Section */}
          {patientInfo && (
            <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Análisis de Exámenes AI</h3>
                <div
                    ref={analysisResultsRef}
                    className="mt-2 p-3 text-sm bg-gray-100 rounded-md min-h-[100px] max-h-[300px] overflow-y-auto text-gray-800"
                >
                    {isAnalyzing ? (
                        <p className="text-blue-600 italic">Analizando imagen con IA...</p>
                    ) : analysisError ? (
                        <p className="text-red-600">{analysisError}</p>
                    ) : analysisResults ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown children={analysisResults} remarkPlugins={[remarkGfm]} /> {/* Use remarkGfm */}
                        </div>
                    ) : uploadedImages.length > 0 ? (
                        <>
                          <p className="text-gray-600">{uploadedImages.length} imagen(es) seleccionada(s):</p>
                           {uploadedImages.map((file, index) => (
                               <p key={index} className="text-gray-600 text-xs">- {file.name}</p>
                           ))}
                           {!fhirData && <p className="text-orange-600 text-sm italic mt-2">Esperando datos del paciente para el análisis.</p>}
                        </>
                    ) : (
                        <p className="text-gray-600">Sube una imagen de examen para análisis AI.</p>
                    )}
                </div>

                <div className="flex space-x-2 items-center justify-end mt-4">
                  <input
                      type="file"
                      accept="image/*"
                      multiple={false} // Asegurar que solo se permite una imagen
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