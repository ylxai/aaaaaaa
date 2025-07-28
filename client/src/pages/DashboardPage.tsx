import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './DashboardPage.css';

interface Event {
  id: number;
  name: string;
  slug: string;
  event_date: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventName: string;
  isDeleting: boolean;
}

const DeleteModal = ({ isOpen, onClose, onConfirm, eventName, isDeleting }: DeleteModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Hapus Acara</h3>
        <p className="text-gray-600 mb-6">
          Apakah Anda yakin ingin menghapus acara "{eventName}"? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center justify-center"
          >
            {isDeleting ? (
              <>
                <div className="spinner rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Menghapus...
              </>
            ) : (
              'Hapus'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    eventId: number | null;
    eventName: string;
  }>({
    isOpen: false,
    eventId: null,
    eventName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/admin/events');
        setEvents(response.data);
        setError(null);
      } catch (err) {
        setError('Gagal memuat data acara');
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);// Clear success/error messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        if (successMessage) setSuccessMessage(null);
        if (error) setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleDeleteEvent = async () => {
    if (!deleteModal.eventId) return;

    try {
      setIsDeleting(true);
      await api.delete(`/api/admin/events/${deleteModal.eventId}`);
      
      // Remove event from local state
      setEvents(prev => prev.filter(event => event.id !== deleteModal.eventId));
      
      // Close modal
      setDeleteModal({ isOpen: false, eventId: null, eventName: '' });
      
      // Show success message
      setSuccessMessage('Acara berhasil dihapus');
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Gagal menghapus acara. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (eventId: number, eventName: string) => {
    setDeleteModal({
      isOpen: true,
      eventId,
      eventName,
    });
  };const closeDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, eventId: null, eventName: '' });
    }
  };
  
  // Export events to CSV
  const exportToCSV = () => {
    if (events.length === 0) {
      setError('Tidak ada data acara untuk diekspor');
      return;
    }
    
    // Create CSV headers
    const headers = ['ID', 'Nama Acara', 'Slug', 'Tanggal Acara'];
    
    // Convert events to CSV rows
    const rows = events.map(event => [
      event.id,
      `"${event.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
      event.slug,
      new Date(event.event_date).toLocaleDateString('id-ID')
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set up download attributes
    link.setAttribute('href', url);
    link.setAttribute('download', `acara-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMessage('Data acara berhasil diekspor ke CSV');
  };const LoadingState = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 rounded-lg bg-white shadow-lg">
        <div className="spinner rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-4 text-gray-600">Memuat dashboard...</p>
      </div>
    </div>
  );

  const ErrorState = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 rounded-lg bg-white shadow-lg text-center">
        <div className="text-red-500 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-800">{message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );const filteredEvents = useMemo(() => {
    if (events.length === 0) return [];
    
    return events
      .filter(event => 
        event.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
        }
        return a.name.localeCompare(b.name);
      });
  }, [events, searchTerm, sortBy]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  
  return (
    <div className="bg-gray-100 min-h-screen">{/* Status Messages */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center animate-fade-in">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
          <button 
            onClick={() => setSuccessMessage(null)}
            className="ml-3 text-white opacity-70 hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center animate-fade-in">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-3 text-white opacity-70 hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteEvent}
        eventName={deleteModal.eventName}
        isDeleting={isDeleting}
      />

      {/* Header */}<header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
              <button
                onClick={exportToCSV}
                className="ml-4 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center text-sm action-button"
                title="Ekspor data acara ke CSV"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Ekspor CSV
              </button>
            </div>
            
            {/* Search & Filter */}
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="search"
                  placeholder="Cari acara..."
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="h-5 w-5 text-gray-400 absolute right-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Sort Toggle */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Tanggal</option>
                <option value="name">Nama</option>
              </select>
              
              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                  title="List View"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded ${view === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                  title="Grid View"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Acara</p>
                <p className="text-2xl font-semibold text-gray-900">{events.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Acara Aktif</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {events.filter(event => new Date(event.event_date) >= new Date()).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Acara Selesai</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {events.filter(event => new Date(event.event_date) < new Date()).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={view === 'grid' ? 
          "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : 
          "space-y-4"
        }>
          {/* Create New Event Card */}
          <Link
            to="/create-event"
            className={`group ${view === 'grid' ? 
              'h-48 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-6 hover:border-blue-500' :
              'block bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-4 hover:border-blue-500'
            } transition-colors duration-200`}
          >
            <div className="flex flex-col items-center justify-center h-full text-gray-600 group-hover:text-blue-500">
              <svg className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg><span className="font-medium">Buat Acara Baru</span>
            </div>
          </Link>

          {/* Event Cards */}
          {filteredEvents.length === 0 && !loading ? (
            <div className="col-span-full">
              <div className="text-center py-12">
                <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada acara ditemukan</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? `Tidak ada acara yang sesuai dengan pencarian "${searchTerm}"` : 'Belum ada acara yang dibuat'}
                </p>
                <Link
                  to="/create-event"
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Buat Acara Pertama
                </Link>
              </div>
            </div>
          ) : (
            filteredEvents.map(event => {
              const isEventPast = new Date(event.event_date) < new Date();
              
              return (<div key={event.id} 
                  className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 event-card ${
                    view === 'list' ? 'flex items-center justify-between p-4' : ''
                  } ${isEventPast ? 'opacity-75' : ''}`}
                >
                  <div className={view === 'list' ? 'flex-1' : 'p-6'}>
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800 flex-1">{event.name}</h2>
                      {isEventPast && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Selesai
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      {new Date(event.event_date).toLocaleDateString('id-ID', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <div className={`flex space-x-2 ${view === 'list' ? 'justify-end' : ''}`}><a
                        href={`/event/${event.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600 transition-colors text-sm action-button"
                        title="Lihat halaman acara"
                      >
                        <svg className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Lihat
                      </a><Link
                        to={`/admin/event/${event.slug}`}
                        className="px-3 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600 transition-colors text-sm action-button"
                        title="Kelola acara"
                      >
                        <svg className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Kelola
                      </Link><button
                        onClick={() => openDeleteModal(event.id, event.name)}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm action-button"
                        title="Hapus acara"
                      >
                        <svg className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;