import React from 'react';
import { TestTube2 } from 'lucide-react';

interface HeaderProps {
  resetSearch: () => void;
}

const Header: React.FC<HeaderProps> = ({ resetSearch }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div 
        className="flex items-center gap-2 text-blue-600 cursor-pointer"
        onClick={resetSearch}
      >
        <TestTube2 className="w-6 h-6" />
        <span className="text-lg font-medium">Búsqueda Médica SIS</span>
      </div>
    </header>
  );
};

export default Header;