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
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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
    <aside className="w-96 bg-white border-l border-gray-200 p-4 fixed right-0 h-full flex flex-col">
      <div className="flex items-center gap-2 text-gray-800 mb-4">
        <TestTube2 className="w-5 h-5" />
        <span className="font-medium">BAMS</span>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4"
      >
        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
  className={`max-w-[90%] rounded-lg p-4 ${
    message.role === 'user'
      ? 'text-white'
      : 'bg-gray-100 text-gray-800'
  }`}
  style={message.role === 'user' ? { backgroundColor: '#29a3ac' } : {}}
>
  {message.role === 'user' ? (
    <p className="text-sm">{message.content}</p>
  ) : (
    <div className="text-sm space-y-2">
      <ReactMarkdown children={message.content} remarkPlugins={[remarkGfm]} />
    </div>
  )}
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

      {/* Chat Input */}
      <form onSubmit={handleChatSubmit} className="flex gap-2">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Haz una pregunta sobre los registros médicos..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
       <button
  type="submit"
  disabled={isChatLoading || !selectedPatientId}
  className={`p-2 text-white rounded-lg ${isChatLoading || !selectedPatientId ? 'bg-gray-400 opacity-50 cursor-not-allowed' : ''}`}
  style={{
    backgroundColor: isChatLoading || !selectedPatientId ? undefined : '#29a3ac'
  }}
  onMouseEnter={(e) => {
    if (!isChatLoading && selectedPatientId) {
      e.currentTarget.style.backgroundColor = '#238f96'; // hover color
    }
  }}
  onMouseLeave={(e) => {
    if (!isChatLoading && selectedPatientId) {
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