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
    <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
    {/* Botón izquierdo con padding izquierdo igual a px-6 */}
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
      className="flex-grow text-center flex items-center justify-center gap-2 text-teal-800 cursor-pointer"
      onClick={resetSearch}
    >
      <UserRoundCog className="w-6 h-6" />
      <span className="text-lg font-medium">Búsqueda Artificial Médica Salud</span>
    </div>
  
    {/* Botón derecho con padding derecho simétrico */}
    <div className="flex items-center justify-end">
      <Link
        to="/dashboard"
        className="inline-flex items-center h-10 px-3 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 whitespace-nowrap"
      >
        <svg
          className="-ml-1 mr-2 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Volver al Dashboard
      </Link>
    </div>
  </header>
  
  








  );
};

export default Header;