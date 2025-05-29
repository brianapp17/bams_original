// PatientSidebar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { PatientInfo, NotaConsultaItem } from '../types'; // NotaConsultaItem se usa en la prop onSaveNewNote
import { User, Mic, FileUp, Scan, CheckCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateNoteFromAudio } from '../api'; // Asumiendo que has movido la función a api.ts

// Interfaz para las notas formateadas para el dropdown
interface FormattedNote {
  id: string; // Será la fecha/timestamp
  title: string; // Un título legible, ej: "Nota del 21/05/2024"
  content: string; // El contenido de la nota (response)
}

interface PatientSidebarProps {
  patientInfo: PatientInfo | null;
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  fhirData: string | null;
  onSaveNewNote: (noteContent: NotaConsultaItem) => Promise<boolean>; // Nueva prop
}

const PatientSidebar: React.FC<PatientSidebarProps> = ({
  patientInfo,
  categories,
  selectedCategory,
  setSelectedCategory,
  fhirData,
  onSaveNewNote // Recibimos la prop
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioStream = useRef<MediaStream | null>(null);

  const [savedNotes, setSavedNotes] = useState<FormattedNote[]>([]);
  const [selectedSavedNoteId, setSelectedSavedNoteId] = useState<string>('');
  const [selectedNoteContent, setSelectedNoteContent] = useState<string | null>(null);

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisResultsRef = useRef<HTMLDivElement>(null);

  // Nuevos estados para la generación de notas AI
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [noteGenerationStatus, setNoteGenerationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (patientInfo && patientInfo.NotasConsulta) {
      const notasDelPaciente = patientInfo.NotasConsulta;
      const formatted: FormattedNote[] = Object.entries(notasDelPaciente)
        .map(([dateKey, noteData]) => {
          let displayDate = dateKey;
          try {
            displayDate = new Date(dateKey).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
          } catch (e) {
            console.warn("No se pudo parsear la fecha de la nota:", dateKey);
          }
          return {
            id: dateKey,
            title: `Nota - ${displayDate}`,
            content: noteData.response,
          };
        })
        .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime()); 
      
      setSavedNotes(formatted);
      // No resetear si ya hay una nota seleccionada, para una mejor UX al añadir nuevas notas.
      // Si no hay nota seleccionada O la nota seleccionada ya no existe, entonces resetear.
      if (!selectedSavedNoteId || !formatted.find(note => note.id === selectedSavedNoteId)) {
        setSelectedSavedNoteId('');
        setSelectedNoteContent(null);
      }
    } else {
      setSavedNotes([]);
      setSelectedSavedNoteId('');
      setSelectedNoteContent(null);
    }
  }, [patientInfo, selectedSavedNoteId]); // Añadir selectedSavedNoteId a las dependencias

  const startRecording = async () => {
    setRecordingError(null);
    setNoteGenerationStatus('idle'); // Resetear estado de notas
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      // Intentar con codecs más comunes si opus no está disponible universalmente en todos los navegadores/SO
      const mimeTypes = [
        'audio/webm; codecs=opus',
        'audio/ogg; codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/wav', // Considerar si el tamaño es un problema
        'audio/mp4', // A veces es audio/aac dentro de mp4
      ];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (!supportedMimeType) {
        throw new Error("Ningún formato de audio soportado por MediaRecorder fue encontrado.");
      }
      console.log("Usando MIME type para grabación:", supportedMimeType);

      const options = { mimeType: supportedMimeType };
      mediaRecorder.current = new MediaRecorder(stream, options);
      audioChunks.current = [];
      setAudioBlob(null);

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        if (audioChunks.current.length === 0) {
            console.warn("Grabación detenida pero no se generaron datos de audio.");
            setRecordingError("No se generaron datos de audio durante la grabación.");
            setIsRecording(false);
            if (audioStream.current) {
                audioStream.current.getTracks().forEach(track => track.stop());
                audioStream.current = null;
            }
            return;
        }
        const recordedAudioBlob = new Blob(audioChunks.current, { type: mediaRecorder.current?.mimeType || supportedMimeType });
        setAudioBlob(recordedAudioBlob);
        if (audioStream.current) {
           audioStream.current.getTracks().forEach(track => track.stop());
           audioStream.current = null;
        }
        setIsRecording(false);
        console.log("Grabación detenida y blob creado:", recordedAudioBlob);
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
      mediaRecorder.current.stop(); // onstop se encargará del resto
      // setRecordingError(null); // No es necesario aquí, onstop lo maneja si no hay error
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

  const handleGenerateNotes = async () => {
      if (!audioBlob) {
          console.warn("No hay audio grabado para generar notas.");
          setRecordingError("Por favor, graba audio antes de generar notas.");
          setNoteGenerationStatus('error');
          setTimeout(() => setNoteGenerationStatus('idle'), 3000);
          return;
      }
      if (!patientInfo?.id) {
          console.warn("ID de paciente no disponible.");
          setRecordingError("No se puede generar nota sin ID de paciente.");
          setNoteGenerationStatus('error');
          setTimeout(() => setNoteGenerationStatus('idle'), 3000);
          return;
      }

      console.log("Iniciando generación de notas AI con el audio:", audioBlob);
      setRecordingError(null); // Limpiar errores previos de grabación
      setIsGeneratingNote(true);
      setNoteGenerationStatus('idle'); // Podría ser 'loading' si tienes un estado para eso

      try {
        // Usar patientInfo.id si es necesario para la API generateNoteFromAudio
        const noteData = await generateNoteFromAudio(audioBlob, patientInfo.id); 
        
        if (noteData && typeof noteData.response === 'string') {
          const newNote: NotaConsultaItem = { response: noteData.response };
          const successfullySaved = await onSaveNewNote(newNote); 
          
          if (successfullySaved) {
            console.log("Nota generada y guardada exitosamente.");
            setNoteGenerationStatus('success');
            setAudioBlob(null); // Limpiar el audio blob después de éxito
          } else {
            console.error("La nota fue generada pero falló al guardarse en Firebase.");
            setRecordingError("Error al guardar la nota generada en la base de datos.");
            setNoteGenerationStatus('error');
          }
        } else {
          throw new Error("Formato de respuesta inesperado del servicio de generación de notas.");
        }

      } catch (error) {
        console.error("Error generando o guardando la nota:", error);
        setRecordingError(error instanceof Error ? error.message : "Error desconocido al generar la nota.");
        setNoteGenerationStatus('error');
      } finally {
        setIsGeneratingNote(false);
        setTimeout(() => {
          // Solo resetear si no fue un éxito, para que el mensaje de éxito dure un poco
          if (noteGenerationStatus !== 'success') {
            setNoteGenerationStatus('idle');
          }
        }, 4000); // Mantener el mensaje de error/éxito por 4 segundos
      }
   };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedCategory(value === '' ? null : value);
  };

  const handleSavedNoteChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const noteId = event.target.value; 
    setSelectedSavedNoteId(noteId);
    if (noteId) {
        const note = savedNotes.find(n => n.id === noteId);
        setSelectedNoteContent(note ? note.content : null);
    } else {
        setSelectedNoteContent(null);
    }
    console.log("Nota guardada seleccionada:", noteId);
  };

  const handleUploadButtonClick = () => {
    setUploadedImages([]);
    setAnalysisResults(null);
    setAnalysisError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
      if (validFiles.length > 0) {
          setUploadedImages([validFiles[0]]);
      } else {
          setUploadedImages([]);
          setAnalysisError("Tipo de archivo no permitido. Por favor, sube una imagen (JPEG, PNG, GIF, BMP, WEBP).");
      }
      console.log("Archivos seleccionados:", validFiles);
      if (event.target) event.target.value = ''; // Limpiar el input
    } else {
        setUploadedImages([]);
        setAnalysisError(null);
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

    const apiUrl = 'https://bams-127465468754.us-central1.run.app/bamsexams';
    const formData = new FormData();
    const analysisPrompt = `Analiza la siguiente imagen médica en el contexto de los registros médicos del paciente proporcionados en formato FHIR. Identifica hallazgos relevantes y su posible relación con el historial del paciente. Presenta los resultados de forma clara y estructurada. Registros FHIR del paciente: ${fhirData}`;

    formData.append('prompt', analysisPrompt);
    formData.append('image_file', uploadedImages[0]);

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
        try {
            const outerResult = JSON.parse(resultText);
            if (outerResult && typeof outerResult.response === 'string') {
                let contentFromApi = outerResult.response;
                contentFromApi = contentFromApi.replace(/^```(?:\w*\n)?/, '').replace(/```$/, '');
                setAnalysisResults(contentFromApi);
            } else {
                throw new Error("Estructura de respuesta de la API inesperada o 'response' no es un string.");
            }
        } catch (jsonError: any) {
            console.error('Error al procesar la respuesta de la API (parseo exterior o estructura):', jsonError);
            if (resultText && !resultText.trim().startsWith('{') && !resultText.trim().startsWith('[')) {
                 setAnalysisResults(resultText);
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
    return () => {
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
          setAudioBlob(null);
          setRecordingError(null);
          setIsRecording(false);
          setNoteGenerationStatus('idle'); // Resetear estado de notas al cambiar de paciente
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

  useEffect(() => {
      if (analysisResultsRef.current && analysisResults !== null) {
          analysisResultsRef.current.scrollTop = 0;
      }
  }, [analysisResults]);

  return (
    <aside className="bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden">
      <div className="p-4 pb-0 flex-shrink-0">
          <div className="flex items-center gap-2 text-gray-800 mb-3">
            <User className="w-5 h-5" />
            <span className="font-medium">Información del Paciente</span>
          </div>
          {patientInfo && (
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <div>
                <p className="text-xs text-gray-500">Nombre</p>
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
          <hr className="my-4 border-gray-200" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-6">
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

          {patientInfo && (
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notas AI (Audio)</h3>
              <button
                onClick={handleMicButtonClick}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors 
                  ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}
                  ${isGeneratingNote ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
                title={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
                disabled={recordingError !== null || isGeneratingNote || (isRecording && isGeneratingNote) /* Evitar click si está grabando Y generando */}
                style={{ backgroundColor: !isRecording && !isGeneratingNote ? '#29a3ac' : undefined }}
                onMouseEnter={(e) => { if (!isRecording && !isGeneratingNote) e.currentTarget.style.backgroundColor = '#238f96'; }}
                onMouseLeave={(e) => { if (!isRecording && !isGeneratingNote) e.currentTarget.style.backgroundColor = '#29a3ac'; }}
              >
                <Mic className="w-8 h-8" />
              </button>
              {isRecording && !isGeneratingNote && <p className="mt-2 text-sm text-red-600">Grabando...</p>}
              
              {isGeneratingNote && (
                <div className="mt-2 flex items-center text-sm text-blue-600">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Generando nota...
                </div>
              )}
              {!isGeneratingNote && noteGenerationStatus === 'success' && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Nota generada y guardada.
                </div>
              )}
              {/* Mostrar error de generación o de grabación si no se está grabando ni generando, y hay un error */}
              {!isRecording && !isGeneratingNote && recordingError && (
                 <p className="mt-2 px-3 text-sm text-red-600 text-center">{recordingError}</p>
              )}


              <button
                  onClick={handleGenerateNotes}
                  disabled={!audioBlob || isRecording || isGeneratingNote}
                  className={`mt-4 text-sm py-2 px-4 rounded-md transition-colors flex items-center justify-center
                    ${!audioBlob || isRecording || isGeneratingNote 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                {isGeneratingNote ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Generar nota AI
              </button>
              {audioBlob && !isGeneratingNote && noteGenerationStatus !== 'success' && (
                  <p className="mt-2 text-xs text-gray-500 text-center">Audio grabado ({Math.round(audioBlob.size / 1024)} KB) - Tipo: {audioBlob.type}</p>
              )}
            </div>
          )}

          {patientInfo && (
              <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Notas de Consulta Guardadas</h3>
                  <select
                    value={selectedSavedNoteId}
                    onChange={handleSavedNoteChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                  >
                      <option value="" disabled={savedNotes.length > 0}>
                        {savedNotes.length > 0 ? "Seleccionar nota guardada" : "No hay notas guardadas"}
                      </option>
                      {savedNotes.map((note) => (
                          <option key={note.id} value={note.id}>
                              {note.title}
                          </option>
                      ))}
                  </select>
                  {selectedNoteContent && (
                    <div 
                        className="mt-2 p-3 text-sm bg-gray-100 rounded-md max-h-[200px] overflow-y-auto text-gray-800 prose prose-sm max-w-none"
                    >
                        <ReactMarkdown children={selectedNoteContent} remarkPlugins={[remarkGfm]} />
                    </div>
                  )}
              </div>
          )}
          
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
                          <ReactMarkdown children={analysisResults} remarkPlugins={[remarkGfm]} />
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