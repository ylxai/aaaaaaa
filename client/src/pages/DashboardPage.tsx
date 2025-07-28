import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

interface Event {
  id: number;
  name: string;
  slug: string;
  event_date: string;
}

const DashboardPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
const [view, setView] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/admin/events');
        setEvents(response.data);
        setError(null);
      } catch (err) {
        setError('Gagal memuat data acara');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);
  const LoadingState = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 rounded-lg bg-white shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
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
  );

  const filteredEvents = useMemo(() => {
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
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
            
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
                  onClick={() => setView('grid')}
                  className={`p-2 rounded ${view === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              </svg>
              <span className="font-medium">Buat Acara Baru</span>
            </div>
          </Link>

          {/* Event Cards */}
          {filteredEvents.map(event => (
            <div key={event.id} 
              className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 ${
                view === 'list' ? 'flex items-center justify-between p-4' : ''
              }`}
            >
              <div className={view === 'list' ? 'flex-1' : 'p-6'}>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">{event.name}</h2>
                <p className="text-sm text-gray-500 mb-4">
                  {new Date(event.event_date).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                </p>
                <div className={`flex space-x-3 ${view === 'list' ? 'justify-end' : ''}`}>
                  <a
                    href={`/event/${event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600"
                  >
                    Lihat
                  </a>
                  <Link
                    to={`/admin/event/${event.slug}`}
                    className="flex-1 px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600"
                  >
                    Kelola
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;