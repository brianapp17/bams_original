// Header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { UserRoundCog, ArrowLeft } from 'lucide-react'; // Import ArrowLeft

interface HeaderProps {
  resetSearch: () => void;
}

const Header: React.FC<HeaderProps> = ({ resetSearch }): JSX.Element => {
  const navigate = useNavigate(); // Get navigate function

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 h-14 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
    {/* Botón izquierdo */}
    <div className="flex items-center justify-start">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center h-10 w-10 justify-center border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
        aria-label="Volver atrás"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
    </div>
  
    {/* Título central */}
    <div
      className="flex-grow text-center flex items-center justify-center gap-2 text-teal-800 cursor-pointer min-w-0"
      onClick={resetSearch}
    >
      <UserRoundCog className="w-5 h-5 md:w-6 md:h-6" />
      <span className="text-base md:text-lg font-medium truncate">
        Búsqueda Artificial Médica Salud
      </span>
    </div>
  
   
  </header>
  
  
  








  );
};

export default Header;