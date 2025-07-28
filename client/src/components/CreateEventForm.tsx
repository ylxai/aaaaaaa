import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import QRCode from "react-qr-code";

// Interface untuk data event
interface EventData {
  id: number;
  name: string;
  event_date: string;
  slug: string;
  upload_code: string;
}

// Interface untuk state hasil
interface ResultState {
  success: boolean;
  data?: EventData;
  message?: string;
}

const CreateEventForm: React.FC = () => {
  // --- SEMUA HOOKS DAN STATE DI DEKLARASIKAN DI SINI ---
  const navigate = useNavigate();
  const [eventName, setEventName] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [result, setResult] = useState<ResultState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  // --- SEMUA FUNGSI HANDLER DI DEKLARASIKAN DI SINI ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/secret-admin-login');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await api.post<EventData>('/api/events', {
        name: eventName,
        event_date: eventDate,
      });
      setResult({ success: true, data: response.data });
      setEventName('');
      setEventDate('');
    } catch (error: any) {
      setResult({ success: false, message: error.response?.data?.error || 'Terjadi kesalahan.' });
    } finally {
      setIsLoading(false);
    }
  };
 
  // --- HANYA ADA SATU RETURN STATEMENT UNTUK KOMPONEN ---
  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md mb-4 flex justify-end">
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Buat Acara Baru</h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="text-left">
            <label htmlFor="eventName" className="block mb-2 text-sm font-medium text-gray-700">Nama Acara</label>
            <input
              type="text"
              id="eventName"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="text-left">
            <label htmlFor="eventDate" className="block mb-2 text-sm font-medium text-gray-700">Tanggal Acara</label>
            <input
              type="date"
              id="eventDate"
              value={eventDate}
              min={today}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 flex items-center justify-center disabled:opacity-75"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Membuat Acara...
              </>
            ) : (
              'Generate QR Code'
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {result.success && result.data ? (
              <div className="text-center">
                <h4 className="text-lg font-bold mb-3 text-green-600">Acara Berhasil Dibuat!</h4>
                <Link
                  to={`/event/${result.data.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-100 text-green-800 font-semibold py-2 px-4 rounded-md inline-block hover:bg-green-200 transition-colors mb-4"
                >
                  Buka Halaman Acara ↗
                </Link>
                {/* 2. TAMPILKAN KODE UPLOAD DI SINI */}
                <div>
                  <p className="text-sm text-gray-600">Bagikan kode ini ke tamu untuk upload foto:</p>
                  <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-3 rounded-md mt-2">
                    <p className="text-2xl font-bold tracking-widest text-gray-800">
                      {result.data.upload_code}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-4 border border-gray-200 rounded-md flex justify-center">
                  <QRCode
                    value={`${window.location.origin}/event/${result.data.slug}`}
                    size={128}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">Pindai kode ini atau gunakan link di atas.</p>
              </div>
            ) : (
              <p className="text-red-500 text-center">{result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEventForm;