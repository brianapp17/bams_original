// ChatSidebar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Atom, Send } from 'lucide-react'; // Changed from TestTube2 to Atom
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import remarkGfm from 'remark-gfm';
import { sendChatMessage } from '../api';

const thinkingPhrases = [
  "Analizando biomarcadores y antecedentes clínicos...",
  "Correlacionando síntomas con historiales previos...",
  "Modelando escenarios clínicos con redes neuronales...",
  "Simulando evolución patológica a corto y mediano plazo...",
  "Evaluando patrones sintomáticos con inteligencia artificial...",
  "Interpretando signos vitales en contexto histórico...",
  "Cotejando diagnósticos diferenciales de alta precisión...",
  "Recalculando hipótesis con nueva evidencia clínica...",
  "Ejecutando modelo de predicción multi-variable...",
  "Sintetizando conocimiento médico en tiempo real..."
];

interface ChatSidebarProps {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isChatLoading: boolean;
  setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  resultsData: string | null;
  selectedPatientId: string | null;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chatMessages,
  setChatMessages,
  isChatLoading,
  setIsChatLoading,
  resultsData,
  selectedPatientId
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentThinkingPhrase, setCurrentThinkingPhrase] = useState(thinkingPhrases[0]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      // Use a small delay to ensure DOM updates before scrolling
      setTimeout(() => {
        if (chatContainerRef.current) {
           chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [chatMessages]);

  // Ciclo de frases mientras se carga
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isChatLoading) {
      let index = 0;
      interval = setInterval(() => {
        index = (index + 1) % thinkingPhrases.length;
        setCurrentThinkingPhrase(thinkingPhrases[index]);
      }, 2000);
    } else {
      setCurrentThinkingPhrase(thinkingPhrases[0]); // Reinicia frase
    }
    return () => clearInterval(interval);
  }, [isChatLoading]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || !resultsData || !selectedPatientId) return;

    const newMessage: ChatMessage = {
      role: 'user',
      content: currentMessage
    };

    setChatMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');
    setIsChatLoading(true);

    try {
      // Asegúrate de enviar el contexto (resultsData) y la nueva pregunta (currentMessage)
      const response = await sendChatMessage(resultsData, currentMessage);

      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.response || 'Lo siento, no pude procesar tu consulta.'
        }
      ]);
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, ocurrió un error al procesar tu consulta.'
        }
      ]);
    }

    setIsChatLoading(false);
  };


  return (
    // CAMBIO CLAVE AQUÍ: Se añade 'rounded-lg' y 'shadow-md', se elimina 'border-l'
    <aside className="bg-white w-80 h-full flex flex-col rounded-lg shadow-md">

      {/* Este div es el encabezado. flex-shrink-0 evita que se encoja */}
      <div className="flex items-center gap-2 text-teal-800 p-4 pb-2 flex-shrink-0 border-b"> {/* Changed text color to teal-800 */}
        <Atom className="w-5 h-5" /> {/* Changed icon to Atom */}
        <span className="font-medium">BAMS AI</span>
      </div>

      {/* Este div es el área de mensajes. */}
      {/* flex-1 le dice que ocupe todo el espacio vertical restante entre el encabezado y el input. */}
      {/* overflow-y-auto le dice que, si los mensajes exceden su altura calculada por flex-1, aparezca una barra de scroll vertical. */}
      {/* min-h-0 es crucial en flexbox con overflow-y-auto para permitir que se encoja hasta 0 si es necesario, en lugar de la altura intrínseca del contenido, lo que ayuda a flex-1 a funcionar correctamente. */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto min-h-0 space-y-4 p-4"
      >
        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg p-3 text-sm ${
                message.role === 'user'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
              style={message.role === 'user' ? { backgroundColor: '#29a3ac' } : {}}
            >
              {/* Usamos ReactMarkdown aquí */}
               <div className="prose prose-sm max-w-none">
                <ReactMarkdown children={message.content} remarkPlugins={[remarkGfm]} />
               </div>
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
              <p className="text-sm italic">{currentThinkingPhrase}</p>
            </div>
          </div>
        )}
      </div>

      {/* Este form es el área de input. flex-shrink-0 evita que se encoja */}
      <form onSubmit={handleChatSubmit} className="flex gap-2 p-4 border-t flex-shrink-0">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Haz una pregunta sobre los registros médicos..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isChatLoading} // Disable input while loading
        />
       <button
          type="submit"
          disabled={isChatLoading || !selectedPatientId || !currentMessage.trim()} // Disable if no text
          className={`p-2 text-white rounded-lg transition-colors ${isChatLoading || !selectedPatientId || !currentMessage.trim() ? 'bg-gray-400 opacity-50 cursor-not-allowed' : ''}`}
          style={{
            backgroundColor: isChatLoading || !selectedPatientId || !currentMessage.trim() ? undefined : '#29a3ac'
          }}
          onMouseEnter={(e) => {
            if (!isChatLoading && selectedPatientId && currentMessage.trim()) {
              e.currentTarget.style.backgroundColor = '#238f96'; // hover color
            }
          }}
          onMouseLeave={(e) => {
            if (!isChatLoading && selectedPatientId && currentMessage.trim()) {
              e.currentTarget.style.backgroundColor = '#29a3ac';
            }
          }}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </aside>
  );
};

export default ChatSidebar;