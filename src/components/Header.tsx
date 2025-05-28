// Header.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // Necesario para el botón "Volver a Expedientes"
import { TestTube2 } from 'lucide-react';
// Ya no necesitamos jsPDF, fetchMarkdown, ni las importaciones de Firebase para el reporte aquí

interface HeaderProps {
  resetSearch: () => void;
  // Ya no se necesitan patientId, resultsData, patientName para la funcionalidad de reporte aquí
}

const Header: React.FC<HeaderProps> = ({ resetSearch }): JSX.Element => {
  // Ya no se necesita el estado para isDownloading, buttonText, ni intervalIdRef
  // Ya no se necesita la función handleDownload ni los loadingMessages

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-1 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-blue-600 cursor-pointer" onClick={resetSearch}>
        <TestTube2 className="w-6 h-6" />
        <span className="text-lg font-medium">Búsqueda Artificial Médica Salud</span>
      </div>

      {/* Botón "Volver a Expedientes" movido aquí */}
      <Link
        to="/expedientes"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
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
        Volver a Expedientes
      </Link>
    </header>
  );
};

export default Header;