// ChatSidebar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { TestTube2, Send } from 'lucide-react';
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
    // ROOT element: Must take full height and be a flex column container
    <aside className="bg-white rounded-lg shadow-md h-full flex flex-col"> {/* Removed w-96, fixed, p-4, border-l, right-0 */}
      {/* Header (Flex-shrink-0) */}
      <div className="flex items-center gap-2 text-gray-800 p-4 pb-2 flex-shrink-0 border-b"> {/* Added p-4 pb-2, border-b, flex-shrink-0 */}
        <TestTube2 className="w-5 h-5" />
        <span className="font-medium">BAMS AI Chat</span> {/* Added AI Chat for clarity */}
      </div>

      {/* Chat Messages (Flex-1, Scrollable) */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 p-4" // Added p-4
      >
        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg p-3 text-sm ${ // Reduced padding slightly
                message.role === 'user'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
              style={message.role === 'user' ? { backgroundColor: '#29a3ac' } : {}}
            >
              {/* Using ReactMarkdown for both roles for consistency and potential future markdown from user */}
               <div className="prose prose-sm max-w-none"> {/* prose for markdown styles */}
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

      {/* Chat Input (Flex-shrink-0) */}
      <form onSubmit={handleChatSubmit} className="flex gap-2 p-4 border-t flex-shrink-0"> {/* Added p-4, border-t, flex-shrink-0 */}
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