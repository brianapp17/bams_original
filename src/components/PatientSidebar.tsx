// PatientSidebar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { PatientInfo, NotaConsultaItem } from '../types';
// Import Chevron icons
import { User, Mic, FileUp, Scan, CheckCircle, Loader2, Maximize, X, ChevronUp, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateNoteFromAudio } from '../api';

// Interfaz para las notas formateadas para el dropdown
interface FormattedNote {
  id: string; // Será la fecha/timestamp
  title: string; // Un título legible, ej: "Nota del 21/05/2024"
  content: string; // El contenido de la nota (response)
}

interface PatientSidebarProps {
  patientInfo: PatientInfo | null;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  fhirData: string | null;
  onSaveNewNote: (noteContent: NotaConsultaItem) => Promise<boolean>;
}

// Definimos la lista fija de categorías
const STATIC_CATEGORIES = [
    'Observación',
    'Condición',
    'Encuentro',
    'Procedimiento',
    'Medicamento Administrado',
    'Alergia/Intolerancia',
    'Diagnóstico Médico',
    'Inmunización',
    'Solicitud de medicamento',
];


const PatientSidebar: React.FC<PatientSidebarProps> = ({
  patientInfo,
  selectedCategory,
  setSelectedCategory,
  fhirData,
  onSaveNewNote
}) => {
  // State for Patient Info collapse
  const [isPatientInfoOpen, setIsPatientInfoOpen] = useState(true); // State to control visibility

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioStream = useRef<MediaStream | null>(null);

  const [savedNotes, setSavedNotes] = useState<FormattedNote[]>([]);
  const [selectedSavedNoteId, setSelectedSavedNoteId] = useState<string>('');
  const [selectedNoteContent, setSelectedNoteContent] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false); // Estado para el modal de notas

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false); // Nuevo estado para el modal de análisis

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisResultsRef = useRef<HTMLDivElement>(null);

  // Estados para la generación de notas AI
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [noteGenerationStatus, setNoteGenerationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle'); // Añadido 'loading' para mayor claridad

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
  }, [patientInfo, selectedSavedNoteId]);

  // Nuevo useEffect para manejar el estado temporal de 'success' o 'error' en la generación de notas
  useEffect(() => {
    if (noteGenerationStatus === 'success' || noteGenerationStatus === 'error') {
      const timer = setTimeout(() => {
        setNoteGenerationStatus('idle');
      }, 4000); // Mostrar el estado por 4 segundos

      // Función de limpieza: cancela el timeout si el componente se desmonta
      // o si el estado cambia antes de que el timeout termine
      return () => clearTimeout(timer);
    }

    // Si el estado es 'idle' o 'loading', no necesitamos un timeout
    return () => {}; // Función de limpieza vacía
  }, [noteGenerationStatus]); // Este efecto se ejecuta cada vez que noteGenerationStatus cambia


  const startRecording = async () => {
    setRecordingError(null);
    setNoteGenerationStatus('idle'); // Resetear estado de notas al iniciar grabación
    setAudioBlob(null); // Limpiar audio anterior al iniciar una nueva grabación

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      const mimeTypes = [
        'audio/webm; codecs=opus',
        'audio/ogg; codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/wav',
        'audio/mp4',
      ];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

      if (!supportedMimeType) {
        throw new Error("Ningún formato de audio soportado por MediaRecorder fue encontrado.");
      }
      console.log("Usando MIME type para grabación:", supportedMimeType);

      const options = { mimeType: supportedMimeType };
      mediaRecorder.current = new MediaRecorder(stream, options);
      audioChunks.current = [];


      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        if (audioChunks.current.length === 0) {
            console.warn("Grabación detenida pero no se generaron datos de audio.");
            setRecordingError("No se generaron datos de audio durante la grabación.");
            // No cambiar isRecording a false aquí si hubo un error, startRecording ya lo maneja.
            // El cleanup de la stream y recorder se hará en el finally o effect de cleanup.
        } else {
            const recordedAudioBlob = new Blob(audioChunks.current, { type: mediaRecorder.current?.mimeType || supportedMimeType });
            setAudioBlob(recordedAudioBlob);
        }
        // El cleanup de la stream y recorder se hará en el finally o effect de cleanup.
         setIsRecording(false); // Esto sí lo podemos poner aquí, porque la grabación *se detuvo*.
         console.log("Grabación detenida. Blob creado si hay datos.");
      };

      mediaRecorder.current.onerror = (event: Event) => {
          const error = (event as any).error as DOMException | undefined;
          console.error('MediaRecorder error:', error);
          setRecordingError(`Error de grabación: ${error?.name || 'Desconocido'} - ${error?.message || 'Sin mensaje'}`);
          // El cleanup de la stream y recorder se hará en el finally o effect de cleanup.
          setIsRecording(false); // Esto sí lo podemos poner aquí.
          console.log("MediaRecorderOnError ejecutado.");
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingError(null); // Limpiar cualquier error previo al iniciar con éxito
      console.log("Grabación iniciada...");

    } catch (error: any) {
      console.error('Error starting recording:', error);
      setRecordingError(`No se pudo iniciar la grabación: ${error.message || 'Error desconocido'}. Asegúrate de dar permiso al micrófono.`);
      setIsRecording(false);
      // Cleanup inmediata si falla al iniciar
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
      // No modificar estados aquí, onstop se encargará de setAudioBlob, setIsRecording.
      // onerror se encargará de setRecordingError, setIsRecording.
      mediaRecorder.current.stop();
    }
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Resetear estados relevantes antes de empezar
      setRecordingError(null);
      setAudioBlob(null);
      setNoteGenerationStatus('idle');
      startRecording();
    }
  };

  const handleGenerateNotes = async () => {
      if (!audioBlob) {
          console.warn("No hay audio grabado para generar notas.");
          setRecordingError("Por favor, graba audio antes de generar notas.");
          setNoteGenerationStatus('error'); // Establecer estado de error temporal
          return;
      }
      if (!patientInfo?.id) {
          console.warn("ID de paciente no disponible.");
          setRecordingError("No se puede generar nota sin ID de paciente.");
          setNoteGenerationStatus('error'); // Establecer estado de error temporal
          return;
      }

      console.log("Iniciando generación de notas AI con el audio:", audioBlob);
      setRecordingError(null); // Limpiar errores previos
      setIsGeneratingNote(true);
      setNoteGenerationStatus('loading'); // Estado 'loading' mientras genera

      try {
        const noteData = await generateNoteFromAudio(audioBlob, patientInfo.id);

        if (noteData && typeof noteData.response === 'string') {
          const newNote: NotaConsultaItem = { response: noteData.response };
          const successfullySaved = await onSaveNewNote(newNote);

          if (successfullySaved) {
            console.log("Nota generada y guardada exitosamente.");
            setNoteGenerationStatus('success'); // Estado final de éxito
            setAudioBlob(null); // Limpiar el audio blob después de éxito
          } else {
            console.error("La nota fue generada pero falló al guardarse en Firebase.");
            setRecordingError("Error al guardar la nota generada en la base de datos."); // Usamos recordingError para mostrar el mensaje
            setNoteGenerationStatus('error'); // Estado final de error
          }
        } else {
          throw new Error("Formato de respuesta inesperado del servicio de generación de notas.");
        }

      } catch (error) {
        console.error("Error generando o guardando la nota:", error);
        // Usamos recordingError para mostrar mensajes de error de generación también
        setRecordingError(error instanceof Error ? error.message : "Error desconocido al generar la nota.");
        setNoteGenerationStatus('error'); // Estado final de error
      } finally {
        setIsGeneratingNote(false); // Termina el estado de carga
        // El estado 'success' o 'error' será resetado a 'idle' por el useEffect
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
    // Cerrar el modal de análisis si estaba abierto al subir una nueva imagen
    setIsAnalysisModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
      if (validFiles.length > 0) {
          setUploadedImages([validFiles[0]]);
          setAnalysisResults(null); // Clear previous analysis results when new file is selected
          setAnalysisError(null); // Limpiar error si se sube un archivo válido
      } else {
          setUploadedImages([]);
          setAnalysisResults(null); // Clear previous analysis results if invalid file
          setAnalysisError("Tipo de archivo no permitido. Por favor, sube una imagen (JPEG, PNG, GIF, BMP, WEBP).");
      }
      console.log("Archivos seleccionados:", validFiles);
      if (event.target) event.target.value = ''; // Limpiar el input
    } else {
        setUploadedImages([]);
        setAnalysisResults(null); // Clear previous analysis results if selection is cancelled
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
    setAnalysisResults(null); // Clear previous results before starting new analysis
    setAnalysisError(null);
    // Close modal if it was open from a previous analysis
    setIsAnalysisModalOpen(false);


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
                // Limpiar posibles bloques de código markdown al principio/final
                contentFromApi = contentFromApi.replace(/^```(?:json|markdown|text)?\n?/, '').replace(/```$/, '');
                setAnalysisResults(contentFromApi);
            } else {
                 // Si no tiene la estructura esperada, intentar mostrar el texto plano si no parece JSON
                 if (resultText && typeof resultText === 'string' && !resultText.trim().startsWith('{') && !resultText.trim().startsWith('[')) {
                     setAnalysisResults(resultText);
                 } else {
                    throw new Error("Estructura de respuesta de la API inesperada o 'response' no es un string.");
                 }
            }
        } catch (jsonError: any) {
            console.error('Error al procesar la respuesta de la API (parseo exterior o estructura):', jsonError);
             // If JSON parsing fails, but the original response is a string, try to show it
             if (resultText && typeof resultText === 'string') {
                 setAnalysisResults(resultText); // Show the raw text received even if not expected format
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

  // Cleanup MediaRecorder and stream on component unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        // Ensure onerror handler is nullified before stopping to avoid calling state updates on unmounted component
        // This casting to any is sometimes necessary due to TS type definitions not perfectly matching runtime capabilities or scenarios
        if ((mediaRecorder.current as any).onerror) (mediaRecorder.current as any).onerror = null;
        try { mediaRecorder.current.stop(); } catch (e) { console.warn("Error stopping MediaRecorder during cleanup:", e); }
      }
       if (audioStream.current) {
         audioStream.current.getTracks().forEach(track => track.stop());
         audioStream.current = null;
       }
       mediaRecorder.current = null; // Explicitly nullify
       audioChunks.current = []; // Clear chunks
    };
  }, []); // Empty dependency array ensures this runs only on unmount

  // Reset states when patient changes, including cleaning up recording if active
  useEffect(() => {
      if (patientInfo) {
          // Reset patient info section state
          setIsPatientInfoOpen(true);

          setUploadedImages([]);
          setAnalysisResults(null);
          setAnalysisError(null);
          setIsAnalyzing(false);
          setIsAnalysisModalOpen(false); // Close analysis modal on patient change
          setAudioBlob(null);
          setRecordingError(null);
          setIsRecording(false);
          setNoteGenerationStatus('idle'); // Resetear estado de notas al cambiar de paciente
          setSelectedSavedNoteId(''); // Resetear selección de nota guardada al cambiar de paciente
          setSelectedNoteContent(null); // Resetear contenido de nota guardada
          setIsNoteModalOpen(false); // Cerrar el modal de notas al cambiar de paciente

          // Cleanup recording resources if active when patient changes
           if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                if ((mediaRecorder.current as any).onerror) (mediaRecorder.current as any).onerror = null;
                try { mediaRecorder.current.stop(); } catch (e) { console.warn("Error stopping MediaRecorder during patient change cleanup:", e); }
            }
           if (audioStream.current) {
             audioStream.current.getTracks().forEach(track => track.stop());
             audioStream.current = null;
           }
           mediaRecorder.current = null;
           audioChunks.current = [];
      }
  }, [patientInfo]); // Dependency on patientInfo

  // Scroll analysis results to top when new results appear
  useEffect(() => {
      if (analysisResultsRef.current && analysisResults !== null) {
          analysisResultsRef.current.scrollTop = 0;
      }
  }, [analysisResults]);


  // Mostrar mensajes de estado de generación de nota (loading, success, error)
  const renderNoteGenerationStatus = () => {
      switch (noteGenerationStatus) {
          case 'loading':
              return (
                <div className="mt-2 flex items-center text-sm text-blue-600">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Generando nota...
                </div>
              );
          case 'success':
              return (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Nota generada y guardada.
                </div>
              );
          case 'error':
               // Si hay un error, lo mostramos usando recordingError
               return null; // El mensaje de error se muestra aparte si recordingError no es null
          case 'idle':
          default:
              return null;
      }
  };

  // Handlers for Note Modal
  const handleMaximizeNote = () => {
    setIsNoteModalOpen(true);
  };

  const handleCloseNoteModal = () => {
    setIsNoteModalOpen(false);
  };

   // Handlers for Analysis Modal
   const handleMaximizeAnalysis = () => {
    setIsAnalysisModalOpen(true);
  };

  const handleCloseAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
  };

  // Handler for Patient Info collapse
  const togglePatientInfo = () => {
    setIsPatientInfoOpen(!isPatientInfoOpen);
  };


  return (
    <aside className="bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden">
      <div className="p-4 pb-0 flex-shrink-0">
           {/* Clickable Header for Patient Info */}
          <div
            className="flex items-center gap-2 text-gray-800 mb-3 cursor-pointer" // Added cursor-pointer
            onClick={togglePatientInfo} // Added onClick handler
          >
            {/* Conditional Chevron Icon based on collapse state */}
            {isPatientInfoOpen ? (
               <ChevronDown className="w-5 h-5" />
             ) : (
               <ChevronUp className="w-5 h-5" />
             )}
             <span className="font-medium">Información del Paciente</span>
          </div>
           {/* Patient Info Content - Conditionally Rendered */}
          {patientInfo && isPatientInfoOpen && ( // Added isPatientInfoOpen condition
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
          {/* Horizontal Rule - Conditionally Rendered */}
          {isPatientInfoOpen && <hr className="my-4 border-gray-200" />} {/* Added isPatientInfoOpen condition */}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-6">
          {patientInfo && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Categorías del expediente</h3>
              <select
                value={selectedCategory || ''}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
              >
                <option value="">Todas las Categorías</option>
                {STATIC_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          {patientInfo && (
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notas IA (Audio)</h3>
              <button
                onClick={handleMicButtonClick}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors
                  ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}
                  ${isGeneratingNote || noteGenerationStatus === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`} // Deshabilitar si está generando/cargando
                aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
                title={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
                disabled={isGeneratingNote || noteGenerationStatus === 'loading' || (isRecording && isGeneratingNote) /* Evitar click si está grabando Y generando */}
                style={{ backgroundColor: !isRecording && !isGeneratingNote && noteGenerationStatus !== 'loading' ? '#29a3ac' : undefined }}
                onMouseEnter={(e) => { if (!isRecording && !isGeneratingNote && noteGenerationStatus !== 'loading') (e.target as HTMLButtonElement).style.backgroundColor = '#238f96'; }}
                onMouseLeave={(e) => { if (!isRecording && !isGeneratingNote && noteGenerationStatus !== 'loading') (e.target as HTMLButtonElement).style.backgroundColor = '#29a3ac'; }}
              >
                <Mic className="w-8 h-8" />
              </button>
              {isRecording && !isGeneratingNote && <p className="mt-2 text-sm text-red-600">Grabando...</p>}

              {/* Renderizar el estado de generación */}
              {renderNoteGenerationStatus()}

              {/* Mostrar error de grabación si existe y no hay otro estado activo (grabando, generando) */}
              {!isRecording && !isGeneratingNote && recordingError && (
                 <p className="mt-2 px-3 text-sm text-red-600 text-center">{recordingError}</p>
              )}

              <button
                  onClick={handleGenerateNotes}
                  disabled={!audioBlob || isRecording || isGeneratingNote || noteGenerationStatus === 'loading' || recordingError !== null} // Deshabilitar si no hay audio, grabando, generando, cargando, o hay error de grabación
                  className={`mt-4 text-sm py-2 px-4 rounded-md transition-colors flex items-center justify-center
                    ${!audioBlob || isRecording || isGeneratingNote || noteGenerationStatus === 'loading' || recordingError !== null
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                {isGeneratingNote || noteGenerationStatus === 'loading' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Generar nota AI
              </button>
              {/* Mostrar info del audio solo si hay audio y no estamos en un estado de generación final */}
              {audioBlob && noteGenerationStatus !== 'success' && noteGenerationStatus !== 'error' && (
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
                    <div className="mt-2 p-3 text-sm bg-gray-100 rounded-md max-h-[200px] overflow-y-auto text-gray-800 relative">
                      <div className="absolute top-2 right-2 z-10"> {/* Added z-10 to ensure button is clickable */}
                        <button
                            onClick={handleMaximizeNote}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                            aria-label="Maximizar nota"
                            title="Maximizar nota"
                        >
                            <Maximize className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      {/* Add padding to the right of the content div to prevent text overlap */}
                      <div className="prose prose-sm max-w-none pr-6">
                        <ReactMarkdown children={selectedNoteContent} remarkPlugins={[remarkGfm]} />
                      </div>
                    </div>
                  )}
              </div>
          )}

          {patientInfo && (
            <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Análisis de Exámenes IA</h3>
                {/* Container for analysis results and maximize button */}
                <div className="mt-2 relative"> {/* Made parent relative */}
                     {/* Maximize button - visible only when results are present and not analyzing */}
                    {analysisResults && !isAnalyzing && (
                       <div className="absolute top-2 right-2 z-10"> {/* Position absolute, added z-10 */}
                           <button
                               onClick={handleMaximizeAnalysis}
                               className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                               aria-label="Maximizar análisis"
                               title="Maximizar análisis"
                           >
                               <Maximize className="w-4 h-4 text-gray-600" />
                           </button>
                       </div>
                    )}
                    {/* Analysis Results Display */}
                    <div
                        ref={analysisResultsRef}
                        className={`p-3 text-sm bg-gray-100 rounded-md min-h-[100px] max-h-[300px] overflow-y-auto text-gray-800 ${analysisResults ? 'pr-6' : ''}`} 
                    >
                        {isAnalyzing ? (
                            <p className="text-blue-600 italic">Analizando imagen con IA...</p>
                        ) : analysisError ? (
                            <p className="text-red-600">{analysisError}</p>
                        ) : analysisResults ? (
                            <div className="prose prose-sm max-w-none"> {/* Ensure prose is inside */}
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
                            <p className="text-gray-600">Sube una imagen de exámen para análisis IA.</p>
                        )}
                    </div>
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
                    onMouseEnter={(e) => { if (!(uploadedImages.length === 0 || !fhirData || isAnalyzing)) (e.target as HTMLButtonElement).style.backgroundColor = '#238f96'; }}
                    onMouseLeave={(e) => { if (!(uploadedImages.length === 0 || !fhirData || isAnalyzing)) (e.target as HTMLButtonElement).style.backgroundColor = '#29a3ac'; }}
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Scan className="w-4 h-4 mr-1" />} Analizar IA
                  </button>
              </div>
          </div>
          )}
      </div>

        {/* Modal para la nota ampliada */}
        {isNoteModalOpen && selectedNoteContent && (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"> {/* Added p-4 for small screen safety */}
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[90vh]"> {/* Added flex-col and max-h */}
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                         <h2 className="text-lg font-semibold text-gray-800">Nota de Consulta</h2>
                         <button
                            onClick={handleCloseNoteModal}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                            aria-label="Cerrar"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    <div className="prose prose-sm max-w-none overflow-y-auto flex-grow pb-4"> {/* Added flex-grow and pb-4 */}
                        <ReactMarkdown children={selectedNoteContent} remarkPlugins={[remarkGfm]} />
                    </div>
                </div>
            </div>
        )}

         {/* Modal para el análisis de exámenes ampliado */}
        {isAnalysisModalOpen && analysisResults && (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"> {/* Added p-4 */}
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[90vh]"> {/* Added flex-col and max-h */}
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                         <h2 className="text-lg font-semibold text-gray-800">Análisis de Exámenes IA</h2>
                         <button
                            onClick={handleCloseAnalysisModal}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                            aria-label="Cerrar"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    <div className="prose prose-sm max-w-none overflow-y-auto flex-grow pb-4"> {/* Added flex-grow and pb-4 */}
                        <ReactMarkdown children={analysisResults} remarkPlugins={[remarkGfm]} />
                    </div>
                </div>
            </div>
        )}
    </aside>
  );
};

export default PatientSidebar;