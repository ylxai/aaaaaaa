import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Masonry from 'react-masonry-css';
import toast from 'react-hot-toast';

// --- Interface untuk Tipe Data ---
interface Photo {
  id: number;
  file_url: string;
  likes: number;
  category: string;
}
interface EventData {
  id: number;
  name: string;
  slug: string;
}

// --- Konfigurasi Kolom untuk Masonry ---
const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
};

// --- Komponen Utama ---
const AdminEventPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'official' | 'guest' | 'bridesmaid'>('official');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fungsi untuk mengambil semua data
  const fetchData = async () => {
    if (!slug) return;
    try {
      const [eventRes, photosRes] = await Promise.all([
        api.get<EventData>(`/api/events/${slug}`),
        api.get<Photo[]>(`/api/events/${slug}/photos`)
      ]);
      setEvent(eventRes.data);
      setPhotos(photosRes.data);
    } catch (err) {
      setError('Gagal memuat data acara.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  // Fungsi untuk upload khusus admin ke galeri 'official'
  const handleAdminUpload = async (file: File) => {
    if (!file || !slug) return;
    const formData = new FormData();
    formData.append('photo', file);
    try {
      await api.post(`/api/admin/events/${slug}/upload`, formData);
      toast.success('Foto berhasil diunggah ke Galeri Khusus!');
      fetchData(); // Muat ulang data galeri
    } catch (err) {
      toast.error('Gagal mengunggah foto.');
    } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  // Fungsi untuk menghapus foto (moderasi)
  const handleDeletePhoto = async () => {
    if (photoToDelete === null) return; 

    const deleteToast = toast.loading('Menghapus foto...');
    try {
      await api.delete(`/api/photos/${photoToDelete}`);
      setPhotos(currentPhotos => currentPhotos.filter(p => p.id !== photoToDelete));
      toast.success('Foto berhasil dihapus.', { id: deleteToast });
    } catch (err) {
      toast.error('Gagal menghapus foto.', { id: deleteToast });
    } finally {
      // Tutup modal setelah selesai
      setShowDeleteModal(false);
      setPhotoToDelete(null);
    }
  };


  const openDeleteConfirmation = (photoId: number) => {
    setPhotoToDelete(photoId);
    setShowDeleteModal(true);
  };
  // Logika penyaringan foto
  const officialPhotos = photos.filter(p => p.category === 'official');
  const guestPhotos = photos.filter(p => p.category === 'guest');
  const bridesmaidPhotos = photos.filter(p => p.category === 'bridesmaid');
  
  let photosToShow = officialPhotos;
  if (activeTab === 'guest') photosToShow = guestPhotos;
  if (activeTab === 'bridesmaid') photosToShow = bridesmaidPhotos;

  if (loading) return <div className="p-8 text-center">Memuat...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
  <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to="/dashboard" className="text-blue-600 hover:underline">
          &larr; Kembali ke Dashboard
        </Link>
      </div>

      <header className="bg-white p-6 rounded-lg shadow-md mb-8">
        <p className="text-sm text-gray-500">Kelola Foto Acara</p>
        <h1 className="text-4xl font-bold text-gray-800">{event?.name}</h1>
      </header>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Unggah ke Galeri Khusus (Official)</h2>
        <input 
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleAdminUpload(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('official')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'official' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Galeri Khusus ({officialPhotos.length})</button>
          <button onClick={() => setActiveTab('guest')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'guest' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Galeri Tamu ({guestPhotos.length})</button>
          <button onClick={() => setActiveTab('bridesmaid')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'bridesmaid' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Galeri Bridesmaid ({bridesmaidPhotos.length})</button>
        </nav>
      </div>

      <div>
        <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
          {photosToShow.map(photo => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden border">
              <img src={photo.file_url} alt="Uploaded" className="w-full h-auto object-cover block" />
              <div className="absolute top-2 right-2 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <button 
                  onClick={() => openDeleteConfirmation(photo.id)}
                  className="bg-red-600 text-white rounded-full p-2 shadow-lg hover:bg-red-700"
                  title="Hapus Foto"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                </button>
              </div>
            </div>
          ))}
        </Masonry>
        {photosToShow.length === 0 && <p className="text-center text-gray-500 mt-8">Tidak ada foto di galeri ini.</p>}
      </div>
    </div>
    
    {showDeleteModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Backdrop with blur */}
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
      onClick={() => setShowDeleteModal(false)} 
    />
    
    {/* Modal Content - Fixed width and height */}
    <div className="relative bg-white rounded-2xl shadow-xl w-[320px] max-h-[90vh] overflow-y-auto p-5">
      {/* Close button */}
      <button 
        onClick={() => setShowDeleteModal(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Modal Header */}
      <div className="text-center mb-4">
        <svg 
          className="mx-auto h-10 w-10 text-red-500 mb-3" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
        <h2 className="text-lg font-bold text-gray-900">Konfirmasi Hapus</h2>
      </div>

      {/* Modal Body */}
      <p className="text-sm text-gray-500 text-center mb-4">
        Apakah Anda yakin ingin menghapus foto ini secara permanen?
      </p>

      {/* Modal Footer - Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleDeletePhoto}
          className="w-full px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium text-sm"
        >
          Hapus Foto
        </button>
        <button
          onClick={() => setShowDeleteModal(false)}
          className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm"
        >
          Batal
        </button>
      </div>
    </div>
  </div>
)}    
  </div>
  );
};

export default AdminEventPage;