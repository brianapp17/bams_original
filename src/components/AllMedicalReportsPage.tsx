// AllMedicalReportPages.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
import { app } from '../firebase';
import { FileText, Download, Eye, XCircle, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react'; // Import Chevron icons
import { Link, useNavigate } from 'react-router-dom';

interface MedicalReport {
  id: string; // La key única de Firebase
  patientId: string;
  patientName: string;
  fileName: string;
  downloadURL: string;
  timestamp: string; // ISO string or similar, used for date sorting
  reportDate: string; // Formatted date string, good for display
}

// Define how many reports to show per page
const REPORTS_PER_PAGE = 12; // You can adjust this number

const AllMedicalReportPages: React.FC = () => {
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);

  // State for search and sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'dateDesc' | 'dateAsc' | 'nameAsc' | 'nameDesc'>('dateDesc');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  const auth = getAuth(app);
  const database = getDatabase(app);
  const navigate = useNavigate();

  // Fetch reports from Firebase
  useEffect(() => {
    let unsubscribeReports: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const doctorUid = user.uid;
        const reportsRef = ref(database, `doctors/${doctorUid}/medicalReports`);

        setIsLoading(true);
        setError(null);

        unsubscribeReports = onValue(reportsRef, (snapshot) => {
          const reportsData = snapshot.val();
          const loadedReports: MedicalReport[] = [];
          if (reportsData) {
            Object.keys(reportsData).forEach(key => {
              loadedReports.push({
                id: key,
                // Ensure timestamp exists for sorting, maybe default or handle missing
                timestamp: reportsData[key].timestamp || new Date().toISOString(),
                ...reportsData[key]
              });
            });
          }
          // We will sort and filter when rendering, keep raw data here
          setMedicalReports(loadedReports);
          setIsLoading(false);
          // Reset page to 1 when reports are freshly loaded/updated
          setCurrentPage(1);
        }, (dbError) => {
          console.error("Error fetching medical reports:", dbError);
          setError('Error al cargar los reportes médicos.');
          setIsLoading(false);
          setCurrentPage(1); // Reset page even on error? Maybe keep current page? Reset for safety.
        });
      } else {
        setMedicalReports([]);
        setIsLoading(false);
        setError('Debe iniciar sesión para ver sus reportes.');
        setCurrentPage(1); // Reset page if not logged in
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeReports) {
        unsubscribeReports();
      }
    };
  }, [auth, database]);

  // Handlers for Report Modal
  const handleViewReport = (url: string) => {
    setSelectedReportUrl(url);
  };

  const handleCloseModal = useCallback(() => {
    setSelectedReportUrl(null);
  }, []);

  // Effect to handle the Escape key press for modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseModal();
      }
    };

    if (selectedReportUrl) {
      document.addEventListener('keydown', handleEsc);
    } else {
      document.removeEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [selectedReportUrl, handleCloseModal]);

  // --- Filtering and Sorting Logic (Memoized) ---
  const filteredAndSortedReports = useMemo(() => {
    let reports = [...medicalReports]; // Create a mutable copy

    // 1. Filter based on search query
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      reports = reports.filter(report =>
        report.patientName.toLowerCase().includes(lowerCaseQuery) ||
        report.fileName.toLowerCase().includes(lowerCaseQuery) ||
        // Attempt to match date string or maybe part of timestamp
        report.reportDate.toLowerCase().includes(lowerCaseQuery) ||
        report.timestamp.toLowerCase().includes(lowerCaseQuery) // Also search in raw timestamp
      );
    }

    // 2. Sort based on selected option
    reports.sort((a, b) => {
      switch (sortOption) {
        case 'dateDesc':
          // Use timestamp for precise chronological sort
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'dateAsc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'nameAsc':
          return a.patientName.localeCompare(b.patientName);
        case 'nameDesc':
          return b.patientName.localeCompare(a.patientName);
        default:
          return 0; // Should not happen
      }
    });

    return reports;
  }, [medicalReports, searchQuery, sortOption]); // Recalculate whenever these dependencies change

  // --- Pagination Calculations (Memoized) ---
  const totalPages = useMemo(() => {
    if (filteredAndSortedReports.length === 0) return 1; // Ensure at least 1 page even if empty
    return Math.ceil(filteredAndSortedReports.length / REPORTS_PER_PAGE);
  }, [filteredAndSortedReports]);

  const reportsForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * REPORTS_PER_PAGE;
    const endIndex = startIndex + REPORTS_PER_PAGE;
    return filteredAndSortedReports.slice(startIndex, endIndex);
  }, [filteredAndSortedReports, currentPage]);

  // --- Effect to reset page when filter/sort changes ---
  useEffect(() => {
    // If the current page is greater than the new total pages, reset to the last page
    // Or simply reset to 1 for simplicity and better UX in most cases
     setCurrentPage(1);
    // Alternative: setCurrentPage(prev => Math.min(prev, totalPages));
  }, [searchQuery, sortOption]); // Dependencies are filter and sort state

    // Effect to ensure current page is valid if total pages changes (e.g. reports deleted)
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
             setCurrentPage(totalPages);
        } else if (currentPage <= 0 && totalPages > 0) {
             setCurrentPage(1);
        } else if (totalPages === 0) {
             setCurrentPage(1); // Or 0 depending on desired state for no reports
        }
    }, [currentPage, totalPages]);


  // --- Pagination Handlers ---
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600 text-lg">
        Cargando reportes médicos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  // Determine messages based on *all* reports vs. filtered reports
  const noReportsAtAll = medicalReports.length === 0;
  const noFilteredReportsFound = filteredAndSortedReports.length === 0 && medicalReports.length > 0;


  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">

        {/* Header and Controls */}
        <div className="mb-6">
           {/* Top row: Back button and Dashboard link */}
          <div className="flex items-center justify-between mb-4">
             <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
              </button>
               <Link to="/dashboard" className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
                <svg className="-ml-0.5 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Dashboard
              </Link>
          </div>

           {/* Title */}
          <h1 className="text-2xl font-bold text-teal-800 text-center mb-6">Mis Reportes Médicos</h1>


          {/* Search and Sort Controls */}
          {!noReportsAtAll && ( // Only show controls if there are reports loaded
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-grow w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, archivo o fecha..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900 text-sm"
                    />
                </div>

                {/* Sort By */}
                 <div className="flex items-center w-full sm:w-auto justify-end">
                    <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mr-2 flex-shrink-0">
                        Ordenar por:
                    </label>
                    <select
                        id="sort-by"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                        className="block w-full sm:w-auto pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    >
                        <option value="dateDesc">Fecha (Más reciente)</option>
                        <option value="dateAsc">Fecha (Más antiguo)</option>
                        <option value="nameAsc">Nombre (A-Z)</option>
                        <option value="nameDesc">Nombre (Z-A)</option>
                    </select>
                </div>
             </div>
          )}
        </div> {/* End Header and Controls */}


        {/* Reports List or Messages */}
        {noReportsAtAll ? (
          <p className="text-center text-gray-600">
            No hay reportes médicos guardados aún.
          </p>
        ) : noFilteredReportsFound ? (
             <p className="text-center text-gray-600">
               No se encontraron reportes que coincidan con "{searchQuery}".
             </p>
        ) : (
          <> {/* Use a fragment to wrap the grid and pagination */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
               {/* Map over reportsForCurrentPage */}
               {reportsForCurrentPage.map((report) => (
                 <div key={report.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between">
                   <div>
                     <div className="flex items-center text-teal-700 mb-2">
                       <FileText className="w-5 h-5 mr-2" />
                       <h3 className="font-semibold text-lg break-words">{report.patientName}</h3>
                     </div>
                     <p className="text-gray-700 text-sm break-words">
                       <span className="font-medium">ID Paciente:</span> {report.patientId}
                     </p>
                      <p className="text-gray-600 text-sm mt-1 break-words">
                       <span className="font-medium">Archivo:</span> {report.fileName}
                     </p>
                     <p className="text-gray-600 text-sm mt-1">
                       <span className="font-medium">Fecha:</span> {report.reportDate}
                     </p>
                   </div>
                   <div className="mt-4 flex flex-wrap justify-end gap-2">
                     <a
                       href={report.downloadURL}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <Download className="w-4 h-4 mr-1" /> Descargar
                     </a>
                     <button
                       onClick={() => handleViewReport(report.downloadURL)}
                       className="flex items-center px-3 py-1 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                     >
                       <Eye className="w-4 h-4 mr-1" /> Ver
                     </button>
                   </div>
                 </div>
               ))}
             </div>

             {/* Pagination Controls */}
             {filteredAndSortedReports.length > REPORTS_PER_PAGE && ( // Only show pagination if more reports than fit on one page
                <div className="mt-6 flex items-center justify-center space-x-4">
                   <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <ChevronLeft className="w-4 h-4" />
                   </button>
                   <span className="text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                   </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
             )}
          </>
        )}
      </div>

      {/* Modal para ver el PDF */}
      {selectedReportUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
             {/* Close button - styled for better visibility on dark background */}
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-white hover:text-gray-300 focus:outline-none z-10"
              aria-label="Cerrar vista previa del reporte"
              title="Cerrar vista previa"
            >
              <XCircle className="w-8 h-8" /> {/* Using XCircle icon for consistency */}
            </button>
            <iframe
              src={selectedReportUrl}
              title="Reporte Médico"
              className="w-full flex-1 rounded-b-lg"
              style={{ border: 'none' }}
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMedicalReportPages;