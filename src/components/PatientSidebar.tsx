import React, { useState, useRef, useEffect } from 'react';
import { PatientInfo } from '../types'; // Asegúrate de que esta ruta sea correcta
import { User, Mic } from 'lucide-react';
import { FileUp, Scan } from 'lucide-react'; // Importamos iconos para los botones de archivo/análisis
import ReactMarkdown from 'react-markdown';

// Asegúrate de que la interfaz PatientInfo esté definida correctamente en '../types'
// Ejemplo:
// export interface PatientInfo {
//   id?: string; // Añadido un ID potencial para el envío a la API (opcional)
//   name: string;
//   identifier: string; // DUI
//   birthDate: string; // O Date si lo manejas como objeto Date
//   gender: 'male' | 'female' | 'other';
//   // Otras propiedades si las tienes
// }

// Interfaz para las notas guardadas (placeholder por ahora)
interface SavedNote {
  id: string;
  title: string; // Un título descriptivo, como la fecha
  // Puedes añadir 'content: string;' si quieres mostrar el contenido en el futuro
}

interface PatientSidebarProps {
  patientInfo: PatientInfo | null;
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  // Prop para pasar las notas guardadas (simuladas o futuras de API)
  // savedNotes?: SavedNote[];
  // --- PROP para Datos FHIR del paciente actual ---
  fhirData: string | null;
}

const PatientSidebar: React.FC<PatientSidebarProps> = ({
  patientInfo,
  categories,
  selectedCategory,
  setSelectedCategory,
  fhirData // <-- Recibimos los datos FHIR aquí
  // savedNotes = []
}) => {
  // Estado para el estado de grabación y el audio grabado
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null); // Para manejar errores de grabación

  // Refs para MediaRecorder y los fragmentos de audio
  // Usamos useRef para mantener estos valores entre renders sin causar re-renderizaciones
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioStream = useRef<MediaStream | null>(null); // Referencia para el stream del micrófono

  // --- Placeholder Data for Saved Notes ---
  // Simulación de notas guardadas. En un caso real, esto vendría de un estado
  // padre o se cargaría aquí con useEffect al seleccionar un paciente.
  const savedNotesPlaceholder: SavedNote[] = [
    { id: 'note-1', title: 'Consulta inicial - 2023-10-26' },
    { id: 'note-2', title: 'Seguimiento - 2023-11-15' },
    { id: 'note-3', title: 'Resultados de laboratorio - 2024-01-10' },
    { id: 'note-4', title: 'Evaluación post-tratamiento - 2024-03-01' },
  ];
  // --- Fin Placeholder Data ---

  // Estado para la nota guardada seleccionada (visual solamente por ahora)
  const [selectedSavedNote, setSelectedSavedNote] = useState<string>(''); // Usar ID de la nota

  // --- Estados para la sección de Análisis de Exámenes ---
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null); // Para mostrar la respuesta del análisis
  const [analysisError, setAnalysisError] = useState<string | null>(null); // Para manejar errores en el análisis
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Para el estado de carga

  // Ref para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INICIO: Nuevo Ref para el área de resultados del análisis ---
  const analysisResultsRef = useRef<HTMLDivElement>(null);
  // --- FIN: Nuevo Ref ---


  // Función para iniciar la grabación
  const startRecording = async () => {
    setRecordingError(null); // Limpiar errores anteriores
    try {
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream; // Guardar referencia al stream

      // Crear una instancia de MediaRecorder
      const options = { mimeType: 'audio/webm; codecs=opus' };
      mediaRecorder.current = new MediaRecorder(stream, options);

      // Resetear los fragmentos de audio para una nueva grabación
      audioChunks.current = [];
      setAudioBlob(null); // Limpiar el blob anterior

      // Manejar los datos disponibles (fragmentos de audio)
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      // Manejar el evento cuando la grabación se detiene
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

      // Manejar errores del MediaRecorder
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

      // Iniciar la grabación
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

  // Función para detener la grabación
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      console.log("Deteniendo grabación...");
      mediaRecorder.current.stop();
      setRecordingError(null);
    }
  };

  // Maneja el clic en el botón del micrófono
  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setRecordingError(null);
      setAudioBlob(null);
      startRecording();
    }
  };

   // Maneja el clic en el botón "Generar notas AI"
   const handleGenerateNotes = () => {
      if (!audioBlob) {
          console.warn("No hay audio grabado para generar notas.");
          setRecordingError("Por favor, graba audio antes de generar notas.");
          return;
      }
      console.log("Generando notas AI con el audio:", audioBlob);
      setRecordingError(null);

      // --- Lógica de envío a la API (Simulada) ---
      const formData = new FormData();
      const fileExtension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
      formData.append('audio', audioBlob, `grabacion_${Date.now()}.${fileExtension}`);
      formData.append('patientId', patientInfo?.id || '');

      console.log("Simulando envío a la API para generar notas...");
      // fetch('/api/generate-notes', { method: 'POST', body: formData }).then(...)
      // --- Fin Lógica de envío a la API ---
   };


  // Maneja el cambio de selección en el desplegable de categorías
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedCategory(value === '' ? null : value);
  };

  // Maneja el cambio de selección en el nuevo desplegable de notas guardadas
  const handleSavedNoteChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const noteId = event.target.value;
    setSelectedSavedNote(noteId);
    console.log("Nota guardada seleccionada (simulado):", noteId);
  };


  // Maneja el clic en el botón de subir archivo
  const handleUploadButtonClick = () => {
    // Limpiar resultados/errores de análisis anteriores al subir nuevas imágenes
    setAnalysisResults(null);
    setAnalysisError(null);
    // Disparar el clic en el input de archivo oculto
    fileInputRef.current?.click();
  };

  // Maneja la selección de archivo(s)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));

      if (validFiles.length > 0) {
        // Si hay archivos válidos, establecerlos (solo el primero si multiple=false)
        setUploadedImages(validFiles);
        console.log("Archivos válidos (imágenes) seleccionados:", validFiles);
      } else {
        // Si no hay archivos válidos, vaciar el estado
        setUploadedImages([]);
        console.warn("No se seleccionaron archivos de imagen válidos.");
      }

      console.log("Estado actual de uploadedImages después de selección:", validFiles);
      console.log("Estado actual de fhirData al subir archivo:", fhirData); // Log el valor de fhirData al subir archivo

      // Limpiar el valor del input para permitir subir el mismo archivo de nuevo si es necesario
      event.target.value = '';

    } else {
        // Si el usuario cancela la selección, limpiar las imágenes cargadas
        setUploadedImages([]);
        console.log("Selección de archivos cancelada, uploadedImages vaciado.");
        console.log("Estado actual de fhirData al cancelar selección:", fhirData); // Log el valor de fhirData al cancelar
    }
  };

  // --- FUNCIÓN: Maneja el clic en el botón "Analizar examenes AI" ---
  const handleAnalyzeExams = async () => {
    // Validar que haya imágenes y datos FHIR
    if (uploadedImages.length === 0) {
        setAnalysisError("Por favor, sube al menos una imagen para analizar.");
        console.warn("No hay imágenes cargadas para analizar.");
        return;
    }
     if (!fhirData) {
        setAnalysisError("No hay datos FHIR disponibles para el análisis.");
        console.warn("No hay datos FHIR disponibles para el análisis.");
        return;
    }
    if (isAnalyzing) {
        console.log("Ya se está realizando un análisis.");
        return; // Evitar clics múltiples
    }

    setIsAnalyzing(true); // Indicar que el análisis está en curso
    setAnalysisResults(null); // Limpiar resultados anteriores
    setAnalysisError(null); // Limpiar errores anteriores

    const apiUrl = 'https://bamsimage-127465468754.us-central1.run.app';
    const formData = new FormData();

    // Añadir el prompt (datos FHIR) y la imagen al FormData
    // La API de ejemplo pide solo un archivo bajo 'image_file', tomamos el primero
    formData.append('prompt', fhirData);
    formData.append('image_file', uploadedImages[0]);

    console.log("Enviando datos para análisis de imagen a:", apiUrl);
    console.log("Prompt (FHIR data) para análisis:", fhirData); // Log de fhirData enviado
    console.log("Imagen para análisis:", uploadedImages[0]?.name, uploadedImages[0]?.type);


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
        console.log("Respuesta cruda de la API:", resultText); // Log para depuración

        try {
            // Attempt to parse the outer JSON structure { "response": "..." }
            const outerResult = JSON.parse(resultText);

            // Check if the expected 'response' key exists and its value is a string
            if (outerResult && typeof outerResult.response === 'string') {
                let markdownContent = outerResult.response;
                console.log("Contenido dentro de 'response' (crudo):", markdownContent); // Log para depuración

                // --- Limpieza de delimitadores ``` ---
                // Eliminar el posible prefijo de idioma del bloque de código (como 'json' o '')
                // seguido de un posible salto de línea después del primer ```
                markdownContent = markdownContent.replace(/^```(?:\w+\n)?/, '');

                // Eliminar el delimitador ``` al final del string
                markdownContent = markdownContent.replace(/```$/, '');

                console.log("Contenido después de quitar delimitadores ```:", markdownContent); // Log para depuración

                // --- FIN Limpieza de delimitadores ``` ---

                setAnalysisResults(markdownContent); // Set the cleaned markdown string
            } else {
                // Si la estructura esperada {"response": "..."} no se encuentra, reportar error.
                throw new Error("Estructura de respuesta de la API inesperada.");
            }
        } catch (jsonError: any) {
            // Handle errors during the *outer* JSON parsing or if 'response' key is missing/not string
            console.error('Error al procesar la respuesta de la API (parseo exterior o estructura):', jsonError);
            setAnalysisError(`Error al procesar la respuesta del análisis: ${jsonError.message}. Intenta de nuevo.`);
        }

    } catch (error: any) {
        // Handle errors during the fetch request itself (network issues, server down, etc.)
        console.error('Error al analizar la imagen con la API (fetch):', error);
        setAnalysisError(`Error al realizar el análisis: ${error.message}. Asegúrate de que la API está accesible.`); // Mostrar el error al usuario
    } finally {
        setIsAnalyzing(false); // Finalizar el estado de carga
    }
  };
  // --- FIN FUNCIÓN ---


  // Efecto de limpieza: asegura que el micrófono se detenga si el componente se desmonta
  useEffect(() => {
    console.log("PatientSidebar montado. Valor inicial de fhirData:", fhirData); // Log inicial de fhirData
    return () => {
      console.log("Limpiando al desmontar PatientSidebar...");
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        console.log("Deteniendo MediaRecorder en cleanup...");
        if (mediaRecorder.current.onerror) {
            mediaRecorder.current.onerror = null;
        }
        try {
           mediaRecorder.current.stop();
        } catch (e) {
           console.warn("Error stopping MediaRecorder during cleanup:", e);
        }
      }
       if (audioStream.current) {
         console.log("Deteniendo stream de audio en cleanup...");
         audioStream.current.getTracks().forEach(track => track.stop());
         audioStream.current = null;
       }
       mediaRecorder.current = null;
       audioChunks.current = [];
    };
  }, []); // El array vacío asegura que esto solo se ejecute al montar y desmontar

  // Efecto para limpiar uploadedImages y resultados si cambia el paciente
  useEffect(() => {
      if (patientInfo) {
          console.log("Paciente cambiado, limpiando uploadedImages y resultados de análisis.");
          setUploadedImages([]);
          setAnalysisResults(null);
          setAnalysisError(null);
          setIsAnalyzing(false);
      }
  }, [patientInfo]); // Depende de patientInfo

  // --- INICIO: Nuevo Efecto para hacer scroll al inicio cuando los resultados cargan ---
  useEffect(() => {
      // Este efecto se ejecuta cuando analysisResults cambia.
      // Queremos scrollear al top solo cuando hay resultados *no nulos*.
      if (analysisResultsRef.current && analysisResults !== null) {
          console.log("Resultados de análisis cargados, scrolleando al top...");
          // Usamos setTimeout con 0ms para asegurar que el DOM se ha actualizado
          // y el navegador ha calculado la altura scrollable *antes* de scrollear.
          // A veces es necesario para la fiabilidad.
          setTimeout(() => {
             if (analysisResultsRef.current) { // Comprobar de nuevo por si el componente se desmontó
                analysisResultsRef.current.scrollTop = 0;
             }
          }, 0);
      }
  }, [analysisResults]); // Dependencia: se ejecuta cuando analysisResults cambia
  // --- FIN: Nuevo Efecto ---


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
             {/* Aquí podrías añadir más campos si son relevantes en la PatientInfo */}
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
            {/* Microphone Button */}
            <button
              onClick={handleMicButtonClick}
              className={`w-16 h-16 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'} text-white shadow-lg transition-colors`}
              aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
              title={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
              disabled={recordingError !== null}
            >
              <Mic className="w-8 h-8" />
            </button>

             {/* Indicador de estado de grabación o error */}
             {isRecording && <p className="mt-2 text-sm text-red-600">Grabando...</p>}
             {recordingError && <p className="mt-2 px-3 text-sm text-red-600 text-center">{recordingError}</p>}

             {/* Botón para generar notas */}
            <button
                onClick={handleGenerateNotes}
                disabled={!audioBlob || isRecording}
                className={`mt-4 text-sm py-2 px-4 rounded-md transition-colors ${!audioBlob || isRecording ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              Generar notas AI
            </button>

             {/* Opcional: Mostrar información sobre el audio grabado */}
             {audioBlob && (
                <p className="mt-2 text-xs text-gray-500">Audio grabado ({Math.round(audioBlob.size / 1024)} KB) - Tipo: {audioBlob.type}</p>
             )}
          </div>
        )}

        {/* Saved AI Notes Dropdown (Visual Only) */}
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

              {/* Display Area for Results, Loading, or Error */}
              <div
                  ref={analysisResultsRef} // <-- Añadimos la referencia aquí
                  className="mt-2 p-3 text-sm bg-gray-100 rounded-md min-h-[100px] max-h-[200px] overflow-y-auto text-gray-800 whitespace-pre-wrap"
              >
                  {isAnalyzing ? (
                      <p className="text-blue-600 italic">Analizando imagen con IA...</p>
                  ) : analysisError ? (
                      <p className="text-red-600">{analysisError}</p>
                  ) : analysisResults ? (
                       // Mostrar el resultado del análisis
                      <ReactMarkdown>{analysisResults}</ReactMarkdown>
                  ) : uploadedImages.length > 0 ? (
                      // Mostrar info de imágenes cargadas si no hay resultado o error
                      <p className="text-gray-600">{uploadedImages.length} imagen(es) seleccionada(s). Listas para analizar.</p>
                  ) : (
                      // Mensaje por defecto
                      <p className="text-gray-600">Sube una imagen de examen para análisis AI.</p>
                  )}
              </div>

              {/* Buttons area */}
              <div className="flex space-x-2 items-center justify-end mt-4">
                 {/* Hidden file input */}
                 <input
                    type="file"
                    accept="image/*" // Aceptar solo tipos de imagen
                    multiple={false} // La API solo espera una imagen bajo 'image_file'
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                 />
                {/* Button for uploading files */}
                 <button
                    onClick={handleUploadButtonClick}
                    className={`text-sm py-2 px-3 rounded-md ${uploadedImages.length > 0 ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors flex items-center justify-center`}
                    aria-label="Subir imagen de examen"
                    title="Subir imagen de examen"
                    disabled={isAnalyzing} // No permitir subir nuevas imágenes mientras se analiza
                 >
                    <FileUp className="w-4 h-4 mr-1"/> Subir
                </button>
                {/* Button for AI analysis */}
                 <button
                    onClick={handleAnalyzeExams} // <-- Conectamos la nueva función
                    disabled={uploadedImages.length === 0 || !fhirData || isAnalyzing} // Deshabilitar si no hay imágenes, no hay datos FHIR o ya está analizando
                    className={`text-sm py-2 px-3 rounded-md transition-colors flex items-center ${uploadedImages.length === 0 || !fhirData || isAnalyzing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                 >
                    <Scan className="w-4 h-4 mr-1"/> Analizar AI
                </button>
            </div>
        </div>
        )}


      </div>
    </aside>
  );
};

export default PatientSidebar;