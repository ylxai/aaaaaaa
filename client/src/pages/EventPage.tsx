import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { io, Socket } from "socket.io-client";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Masonry from 'react-masonry-css';
import Tilt from 'react-parallax-tilt';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/EventPage.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactTyped } from 'react-typed';// --- Interface untuk Tipe Data ---

interface Message {
  id: number;
  sender_name: string;
  message_text: string;
  created_at: string;
}

interface Photo {
  id: number;
  file_url: string;
  likes: number;
  category: string;
}

interface EventData {
  id: number;
  name: string;
  event_date: string;
  slug: string;
  cover_photo_url?: string;
}// --- Konfigurasi Kolom untuk Masonry ---
const breakpointColumnsObj = {
  default: 4,
  1300: 4,
  1024: 3,
  768: 2,
  640: 2,
  480: 1
};

// --- Komponen Utama ---
const EventPage = () => {
  // --- Deklarasi State ---
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [likedPhotos, setLikedPhotos] = useState<Set<number>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'official' | 'guest' | 'bridesmaid' | 'guestbook'>('official');
  const [index, setIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setScrollY] = useState(0);
  const [, setShowScrollIndicator] = useState(false);const tabContainerRef = useRef<HTMLDivElement>(null);
  const [showSplash, setShowSplash] = useState(true);const [, setCurrentPhotoId] = useState<number | null>(null);
  const [toastQueue, setToastQueue] = useState<Message[]>([]);
  const [currentToast, setCurrentToast] = useState<Message | null>(null);
  const [messageHistoryIndex, setMessageHistoryIndex] = useState(0);const [showMessageToast, setShowMessageToast] = useState(false);
  const messageToastTimerRef = useRef<number | null>(null);
  

  //const [orientationFilter, setOrientationFilter] = useState<'all' | 'landscape' | 'portrait' | 'square'>('all');
  // --- useEffect Hooks ---
  
  const fetchData = async () => {
    if (!slug) return;
    try {
      const eventPromise = api.get<EventData>(`/api/events/${slug}`);
      const photosPromise = api.get<Photo[]>(`/api/events/${slug}/photos`);
      const messagesPromise = api.get<Message[]>(`/api/events/${slug}/messages`);
      const [eventResponse, photosResponse, messagesResponse] = await Promise.all([eventPromise, photosPromise, messagesPromise]);
      setEvent(eventResponse.data);
      setPhotos(photosResponse.data);
      setMessages(messagesResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal memuat acara.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!slug || !apiUrl) return;

    const socket: Socket = io(apiUrl);
    socket.on('connect', () => socket.emit('join_event', slug));

    const handleNewPhoto = (newPhoto: Photo) => setPhotos(currentPhotos => [newPhoto, ...currentPhotos]);
    const handlePhotoLiked = (updatedPhoto: { id: number; likes: number }) => {
      setPhotos(currentPhotos => currentPhotos.map(p => p.id === updatedPhoto.id ? { ...p, likes: updatedPhoto.likes } : p));
    };
    const handlePhotoDeleted = ({ id }: { id: number }) => {
        setPhotos(currentPhotos => currentPhotos.filter(p => p.id !== id));
    };
    const handleNewMessage = (newMessage: Message) => {
      setMessages(currentMessages => [...currentMessages, newMessage]);
    };
    socket.on('new_photo', handleNewPhoto);
    socket.on('photo_liked', handlePhotoLiked);
    socket.on('photo_deleted', handlePhotoDeleted);
    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_photo', handleNewPhoto);
      socket.off('photo_liked', handlePhotoLiked);
      socket.off('photo_deleted', handlePhotoDeleted);
      socket.off('new_message', handleNewMessage);
      socket.disconnect();
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const storedLikes = localStorage.getItem(`likedPhotos_${slug}`);
    if (storedLikes) {
      setLikedPhotos(new Set(JSON.parse(storedLikes)));
    }
  }, [slug]);

  useEffect(() => {
    const guestToken = sessionStorage.getItem(`guestToken_${slug}`);
    if (guestToken) {
      setIsAuthorized(true);
    }
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);};
  }, []);useEffect(() => {
    const checkForScrollbar = () => {
      if (tabContainerRef.current) {
        const { scrollWidth, clientWidth } = tabContainerRef.current;
        setShowScrollIndicator(scrollWidth > clientWidth);
      }
    };

    checkForScrollbar();
    window.addEventListener('resize', checkForScrollbar);

    return () => {
      window.removeEventListener('resize', checkForScrollbar);
    };
  }, []);// Keyboard handler untuk ESC key dan focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && index >= 0) {
        e.preventDefault();
        e.stopPropagation();
        setIndex(-1);
        setCurrentPhotoId(null);
      }
    };

    if (index >= 0) {
      // Add event listener to document for global ESC handling
      document.addEventListener('keydown', handleKeyDown, true);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';
      // Focus the lightbox container for keyboard events
      setTimeout(() => {
        const lightboxContainer = document.querySelector('.yarl__container');
        if (lightboxContainer instanceof HTMLElement) {
          lightboxContainer.focus();
          lightboxContainer.setAttribute('tabindex', '-1');
        }
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = 'unset';
    };
  }, [index]);useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      setCurrentToast(toastQueue[0]);
      const nextToast = toastQueue[0];
      setCurrentToast(nextToast);
      setToastQueue(currentQueue => currentQueue.slice(1));
      const timer = window.setTimeout(() => {
        setCurrentToast(null);
      }, 5000);
      return () => window.clearTimeout(timer);
    }
  }, [toastQueue, currentToast]);// History message toast rotator - hanya untuk halaman galeri (bukan guestbook)
  useEffect(() => {
    if (activeTab === 'guestbook' || messages.length === 0) {
      // Clear timer jika sedang di guestbook atau tidak ada pesan
      if (messageToastTimerRef.current) {
        window.clearTimeout(messageToastTimerRef.current);
        messageToastTimerRef.current = null;
      }
      setShowMessageToast(false);
      return;
    }

    // Selalu ambil pesan terakhir
    const lastMessageIndex = messages.length - 1;
    setMessageHistoryIndex(lastMessageIndex);
    
    const showMessage = () => {
      if (messages.length === 0) return;
      
      setShowMessageToast(true);
      
      // Set timeout untuk hide toast setelah 8 detik
      const hideTimer = window.setTimeout(() => {
        setShowMessageToast(false);
        
        // Set timeout untuk reset ke pesan pertama (index 0) setelah 2 detik
        messageToastTimerRef.current = window.setTimeout(() => {
          setMessageHistoryIndex(0);
        }, 2000);
      }, 8000);

      return () => {
        window.clearTimeout(hideTimer);
      };
    };

    // Start showing pesan terakhir setelah delay 3 detik
    const initialTimer = window.setTimeout(showMessage, 3000);

    return () => {
      window.clearTimeout(initialTimer);
      if (messageToastTimerRef.current) {
        window.clearTimeout(messageToastTimerRef.current);
        messageToastTimerRef.current = null;
      }
    };
  }, [activeTab, messages]);// Reset message index ketika messages berubah
  useEffect(() => {
    setMessageHistoryIndex(0);
  }, [messages]);

  // Cleanup timer saat component unmount
  useEffect(() => {
    return () => {
      if (messageToastTimerRef.current) {
        clearTimeout(messageToastTimerRef.current);
      }
    };
  }, []);

  // --- Fungsi Handlers ---
  const handleUploadClick = () => {
    if (isAuthorized) {
      fileInputRef.current?.click();
    } else {
      setShowCodeModal(true);
    }
  };

  const handleVerifyCode = async () => {
    setCodeError('');
    const loadingToast = toast.loading('Memverifikasi kode...', {
      style: {
        borderRadius: '12px',
        background: '#1f2937',
        color: '#fff',
      },
    });

    try {
      const response = await api.post(`/api/events/${slug}/verify-code`, { code });
      const { guestToken } = response.data;
      sessionStorage.setItem(`guestToken_${slug}`, guestToken);
      setIsAuthorized(true);
      setShowCodeModal(false);
      
      toast.success('Kode berhasil diverifikasi! 🎉', {
        id: loadingToast,
        duration: 3000,
        style: {
          borderRadius: '12px',
          background: '#059669',
          color: '#fff',
        },
      });
      
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 500);
    } catch (err: any) {
      setCodeError(err.response?.data?.error || 'Verifikasi gagal.');
      toast.error('Kode tidak valid', {
        id: loadingToast,
        style: {
          borderRadius: '12px',
          background: '#dc2626',
          color: '#fff',
        },
      });}
  };

  const handleUpload = async (file: File) => {
    if (!file || !slug) return;
    
    // Validasi file
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar. Maksimal 10MB', {
        icon: '⚠️',
        style: {
          borderRadius: '12px',
          background: '#1f2937',
          color: '#fff',
        },
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar', {
        icon: '📷',
        style: {
          borderRadius: '12px',
          background: '#1f2937',
          color: '#fff',
        },
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('category', activeTab);
    
    const uploadToast = toast.loading('Mengunggah foto...', {
      style: {
        borderRadius: '12px',
        background: '#1f2937',
        color: '#fff',
      },
    });

    try {
      await api.post(`/api/events/${slug}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total ?? file.size;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(percentCompleted);
        }
      });
      toast.success(`Foto "${file.name}" berhasil diunggah! ✨`, {
        id: uploadToast,
        icon: '🎉',
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: '#059669',
          color: '#fff',
        },
      });
    } catch (err) {
      toast.error('Gagal mengunggah file. Silakan coba lagi.', {
        id: uploadToast,
        icon: '❌',
        style: {
          borderRadius: '12px',
          background: '#dc2626',
          color: '#fff',
        },
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }}
  };

  const handleLike = async (photoId: number) => {
    if (likedPhotos.has(photoId)) return;
    
    const newLikedPhotos = new Set(likedPhotos).add(photoId);
    setLikedPhotos(newLikedPhotos);
    localStorage.setItem(`likedPhotos_${slug}`, JSON.stringify(Array.from(newLikedPhotos)));
    setPhotos(currentPhotos => currentPhotos.map(p => p.id === photoId ? { ...p, likes: p.likes + 1 } : p));
    
    // Haptic feedback untuk mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    toast.success('Foto disukai! 💖', {
      duration: 2000,
      style: {
        borderRadius: '12px',
        background: '#ec4899',
        color: '#fff',
        fontSize: '14px',
      },
    });

    try {
      await api.post(`/api/photos/${photoId}/like`);
    } catch (err) {
      console.error("Gagal melakukan like, mengembalikan state:", err);
      const revertedLikedPhotos = new Set(likedPhotos);
      revertedLikedPhotos.delete(photoId);
      setLikedPhotos(revertedLikedPhotos);
      localStorage.setItem(`likedPhotos_${slug}`, JSON.stringify(Array.from(revertedLikedPhotos)));
      setPhotos(currentPhotos => currentPhotos.map(p => p.id === photoId ? { ...p, likes: p.likes - 1 } : p));
      
      toast.error('Gagal menyukai foto', {
        style: {
          borderRadius: '12px',
          background: '#dc2626',
          color: '#fff',
        },
      });
    }
  };

  const handleDownloadPhoto = (photoUrl: string, photoId: number) => {
    const link = document.createElement('a');
    link.href = `${photoUrl}?download=true`;
    link.download = `acara-${event?.slug}-${photoId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Foto berhasil diunduh! 📥', {
      duration: 2000,
      style: {
        borderRadius: '12px',
        background: '#059669',
        color: '#fff',},
    });
  };

  // --- Logika Penyaringan Foto ---
  const officialPhotos = photos.filter(p => p.category === 'official');
  const guestPhotos = photos.filter(p => p.category === 'guest');
  const bridesmaidPhotos = photos.filter(p => p.category === 'bridesmaid');
  
  let photosToShow = officialPhotos;
  if (activeTab === 'guest') {
    photosToShow = guestPhotos;
  }
  if (activeTab === 'bridesmaid') {
    photosToShow = bridesmaidPhotos;
  }

  // Lightbox photos sesuai dengan tab aktif
  const lightboxPhotos = photosToShow;

  const typedStrings = [
    "Terima kasih telah berbagi kebahagiaan di hari pernikahan kami."
  ];

  return (
    <>
{/* BAGIAN 1: SPLASH SCREEN */}
    <AnimatePresence>
      {showSplash && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background blur */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: event?.cover_photo_url 
                ? `url(${event.cover_photo_url})` 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              filter: 'blur(10px)',
              transform: 'scale(1.1)'
            }}
          />
          
          {/* Glassmorphism effect */}
          <div className="absolute inset-0 bg-opacity-70 backdrop-filter backdrop-blur-lg" />

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative z-10 text-center p-6 bg-opacity-10 rounded-3xl shadow-2xl backdrop-filter backdrop-blur-md border border-white border-opacity-60"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mb-8"
            >
              <svg className="w-24 h-24 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-4xl sm:text-2xl md:text-7xl font-bold text-white mb-4"
            >
              {loading ? 'Memuat...' : event?.name}
            </motion.h1>
             <motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.9, duration: 0.5 }}
  className="sm:text-2xl h-30 flex items-center justify-center px-8"
>
  <ReactTyped
    strings={typedStrings}
    typeSpeed={40}
    startDelay={1000}
    showCursor={false}
    cursorChar="|"
    //onComplete={() => setShowCursor(false)}
    //loop={false}
    //backDelay={Infinity}
    //backSpeed={0}
    className="text-white text-center"
  />
</motion.div>
            <motion.button 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              onClick={() => setShowSplash(false)}
              className="bg-white bg-opacity-20 text-black font-bold py-3 px-6 rounded-full text-lg transition-transform transform hover:scale-105 hover:shadow-lg disabled:opacity-50 backdrop-filter backdrop-blur-sm"
              disabled={loading}
            >
              Masuk ke Galeri
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
      {/* BAGIAN 2: KONTEN UTAMA HALAMAN */}
      <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={`${showSplash ? 'hidden' : ''}`}
    >
      <div className={`transition-opacity duration-500 ${showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {loading ? (
          <div className="relative min-h-screen font-sans bg-slate-900">
            <div className="relative z-10 container mx-auto p-4 md:p-8">
              <header className="text-center mb-16 pt-12 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-1/4 mx-auto mb-4"></div>
                <div className="h-12 bg-slate-700 rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-5 bg-slate-700 rounded w-1/3 mx-auto"></div>
              </header>
              <main>
                <h2 className="text-3xl font-bold mb-8 text-center text-white">Galeri Foto</h2>
                <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="bg-slate-800 rounded-lg animate-pulse" style={{ height: `${200 + Math.random() * 150}px` }}></div>
                  ))}
                </Masonry>
              </main>
            </div>
          </div>) : error ? (
          <div className="text-center text-red-500 p-8">Error: {error}</div>
        ) : (
          <div className="relative min-h-screen font-sans bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Background dengan parallax effect */}
            {event?.cover_photo_url ? (
              <div className="fixed inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${event.cover_photo_url})` }} />
            ) : null}
            
            {/* Animated gradient overlay */}
            <div className="fixed inset-0 bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-blue-900/50 animate-pulse" style={{ animationDuration: '4s' }} />
            
            {/* Floating particles effect */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-white/10 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 container mx-auto p-4 md:p-8">
              {/* Header section dengan glassmorphism */}
              <motion.header 
                className="text-center mb-12 pt-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl">
                  <motion.h1 
                    className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 pb-2"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {event?.name}
                  </motion.h1>
                  <motion.p 
                    className="text-gray-300 text-lg font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {new Date(event?.event_date || '').toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </motion.p>
                </div></motion.header>{/* Tabs section dengan design modern */}
      <motion.div 
        className="sticky top-4 z-20 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="max-w-full mx-auto backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-2 shadow-2xl overflow-x-auto">
          <div className="flex justify-between items-center min-w-max px-2" ref={tabContainerRef}>
            <button 
              onClick={() => setActiveTab('official')} 
              className={`
                relative py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-300 rounded-xl flex-1 min-w-max
                ${activeTab === 'official' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'}
              `}
            >
              <span className="relative z-10">Khusus</span>
              <span className="ml-1 sm:ml-2 text-xs bg-white/20 px-1 sm:px-2 py-1 rounded-full">{officialPhotos.length}</span>
              {activeTab === 'official' && <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-50" />}
            </button>
            <button 
              onClick={() => setActiveTab('guest')} 
              className={`
                relative py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-300 rounded-xl flex-1 mx-1 min-w-max
                ${activeTab === 'guest' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'}
              `}
            >
              <span className="relative z-10">Tamu</span>
              <span className="ml-1 sm:ml-2 text-xs bg-white/20 px-1 sm:px-2 py-1 rounded-full">{guestPhotos.length}</span>
              {activeTab === 'guest' && <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-50" />}
            </button>
            <button 
              onClick={() => setActiveTab('bridesmaid')} 
              className={`
                relative py-2 px-2 sm:py-3 sm:px-3 text-xs sm:text-sm font-semibold transition-all duration-300 rounded-xl flex-1 min-w-max
                ${activeTab === 'bridesmaid' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'}
              `}
            >
              <span className="relative z-10">Bridesmaid</span>
              <span className="ml-1 sm:ml-2 text-xs bg-white/20 px-1 sm:px-2 py-1 rounded-full">{bridesmaidPhotos.length}</span>
              {activeTab === 'bridesmaid' && <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-50" />}
            </button>
            <button 
              onClick={() => setActiveTab('guestbook')} 
              className={`
                relative py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-300 rounded-xl flex-1 ml-1 min-w-max
                ${activeTab === 'guestbook' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'}
              `}
            >
              <span className="relative z-10">Buku Tamu</span>
              <span className="ml-1 sm:ml-2 text-xs bg-white/20 px-1 sm:px-2 py-1 rounded-full">{messages.length}</span>
              {activeTab === 'guestbook' && <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-50" />}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="text-center">
        {['guest', 'bridesmaid'].includes(activeTab) && (
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button 
              onClick={handleUploadClick} 
              className={`
                relative overflow-hidden group
                bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 
                hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 
                text-white font-bold 
                py-2 px-4 sm:py-4 sm:px-8
                text-base
                rounded-2xl 
                transition-all duration-500 
                shadow-xl hover:shadow-2xl 
                transform hover:-translate-y-1 hover:scale-105
                disabled:opacity-50 disabled:transform-none disabled:shadow-md
                backdrop-blur-sm border border-white/20
                ${uploading ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={uploading}
              whileTap={{ scale: 0.95 }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -top-10 -left-10 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-12 w-6 h-full opacity-0 group-hover:opacity-100 group-hover:left-full transition-all duration-1000" />
              
              <div className="relative z-10 flex items-center justify-center space-x-3">
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">📷</span>
                    <span>Upload To {activeTab === 'guest' ? 'Tamu' : 'Bridesmaid'}</span>
                  </>
                )}
              </div>
            </motion.button>
            
            {uploading && (
              <motion.div 
                className="w-full max-w-sm mx-auto mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="relative">
                  <div className="w-full bg-gray-700/50 rounded-full h-3 backdrop-blur-sm border border-white/10">
                    <motion.div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                      style={{ width: `${uploadProgress}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">Mengunggah...</span>
                    <span className="text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-1 rounded-full">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
              </motion.div>)}
          </motion.div>
        )}{/* Photo Gallery - hanya tampil jika bukan guestbook */}
        {activeTab !== 'guestbook' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="px-2 sm:px-0"
          >
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className="my-masonry-grid"
              columnClassName="my-masonry-grid_column"
            >
              {photosToShow.map((photo, i) => {
                return (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                  >
                    <Tilt 
                      perspective={1000} 
                      glareEnable={true} 
                      glareMaxOpacity={0.2} 
                      scale={1.03}
                      gyroscope={true}
                    >
                      <div 
                        className="group relative rounded-2xl shadow-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:shadow-3xl border border-white/10 backdrop-blur-sm mb-4"
                        onClick={() => {
                          const photoIndex = photosToShow.findIndex(p => p.id === photo.id);
                          setIndex(photoIndex);
                          setCurrentPhotoId(photo.id);
                        }}
                      >
                        {/* Image dengan loading state */}
                        <div className="relative">
                          <img 
                            src={photo.file_url} 
                            alt="Foto acara" 
                            className="w-full h-auto object-cover block transition-transform duration-500 group-hover:scale-105" 
                            loading="lazy"
                            onLoad={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                            style={{ opacity: 0, transition: 'opacity 0.3s' }}
                          />
                          
                          {/* Gradient overlay untuk mobile */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        
                        {/* Simple like counter overlay */}
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                          <div className="flex items-center space-x-1 px-2 py-1 rounded-full backdrop-blur-md bg-black/30 border border-white/20">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
                            </svg>
                            <span className="text-white text-xs sm:text-sm font-medium">{photo.likes}</span>
                          </div>
                        </div>
                        
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </div>
                      </div>
                    </Tilt>
                  </motion.div>
                );
              })}
            </Masonry>
          </motion.div>
        )}

        {/* Empty state dengan design modern */}{/* Render Buku Tamu */}
        {activeTab === 'guestbook' && (
          <motion.div 
            className="max-w-2xl mx-auto px-4 pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Header untuk guestbook */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-4xl mb-3">📝</div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Buku Tamu Digital</h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  Tinggalkan pesan dan ucapan terbaik Anda untuk momen spesial ini
                </p>
              </div>
            </motion.div>

            {/* Daftar Pesan di atas */}
            <motion.div 
              className="space-y-4 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {messages.length === 0 ? (
                <div className="text-center py-12 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl">
                  <div className="text-6xl mb-4">💌</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Belum Ada Pesan</h3>
                  <p className="text-gray-400 text-sm sm:text-base">
                    Jadilah yang pertama memberi ucapan untuk momen spesial ini!
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <p className="text-gray-400 text-sm">
                      {messages.length} pesan dari tamu yang hadir
                    </p>
                  </div>
                  {messages.slice().reverse().map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + (index * 0.1) }}
                      className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <span className="text-white font-bold text-sm sm:text-base">
                            {msg.sender_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                            <h4 className="text-white font-bold text-base sm:text-lg">{msg.sender_name}</h4>
                            <p className="text-gray-400 text-xs sm:text-sm flex-shrink-0">
                              {new Date(msg.created_at).toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <p className="text-gray-200 text-sm sm:text-base leading-relaxed break-words">
                            {msg.message_text}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>

            {/* Form Kirim Pesan di bawah - Fixed Position */}
            <motion.div 
              className="fixed bottom-0 left-0 right-0 z-30 p-4 backdrop-blur-xl bg-slate-900/80 border-t border-white/10"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <div className="max-w-2xl mx-auto">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const senderName = formData.get('sender_name') as string;
                  const messageText = formData.get('message_text') as string;

                  if (!senderName || !messageText) {
                    toast.error('Nama dan pesan tidak boleh kosong', {
                      style: {
                        borderRadius: '12px',
                        background: '#dc2626',
                        color: '#fff',
                      },
                    });
                    return;
                  }

                  try {
                    const response = await api.post(`/api/events/${slug}/messages`, {
                      sender_name: senderName,
                      message_text: messageText
                    });
                    setMessages(prev => [...prev, response.data]);
                    toast.success('Pesan berhasil dikirim! 🎉', {
                      style: {
                        borderRadius: '12px',
                        background: '#059669',
                        color: '#fff',
                      },
                    });
                    (e.target as HTMLFormElement).reset();
                  } catch (error) {
                    toast.error('Gagal mengirim pesan', {
                      style: {
                        borderRadius: '12px',
                        background: '#dc2626',
                        color: '#fff',
                      },
                    });
                  }
                }} 
                className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4 shadow-2xl"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        name="sender_name"
                        placeholder="Nama Anda"
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-2">
                      <textarea
                        name="message_text"
                        placeholder="Tulis pesan atau ucapan..."
                        rows={1}
                        className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-4 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 text-sm flex items-center justify-center min-w-[60px]"
                      >
                        <span className="text-lg">💌</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Empty state dengan design modern - hanya untuk photo tabs */}
        {activeTab !== 'guestbook' && photosToShow.length === 0 && !loading && (
          <motion.div 
            className="text-center mt-16 mb-8 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 max-w-md mx-auto">
              <div className="text-4xl sm:text-6xl mb-4">
                {activeTab === 'official' && "🎨"}
                {activeTab === 'guest' && "📸"}
                {activeTab === 'bridesmaid' && "👗"}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                {activeTab === 'official' && "Koleksi Khusus"}
                {activeTab === 'guest' && "Foto Tamu"}
                {activeTab === 'bridesmaid' && "Foto Bridesmaid"}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {activeTab === 'official' && "Foto-foto pilihan akan segera ditampilkan."}
                {activeTab === 'guest' && "Belum ada foto dari tamu. Jadilah yang pertama berbagi momen indah!"}
                {activeTab === 'bridesmaid' && "Belum ada foto dari bridesmaid. Jadilah yang pertama berbagi momen indah!"}
              </p>
            </div>
          </motion.div>
        )}
              </div></div>
          </div>
        )}
      </div>

      {/* Modal kode akses dengan design modern */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-8 rounded-3xl shadow-2xl text-white w-full max-w-md backdrop-blur-xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Masukkan Kode Akses
                </h3>
                <p className="text-gray-400 text-sm">
                  Untuk mengunggah foto, silakan masukkan kode yang diberikan oleh penyelenggara acara.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                    className="w-full p-4 rounded-2xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-white placeholder-gray-400 transition-all duration-300" 
                    placeholder="Masukkan kode akses"
                    autoFocus
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none" />
                </div>
                
                {codeError && (
                  <motion.p 
                    className="text-red-400 text-sm flex items-center space-x-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span>❌</span>
                    <span>{codeError}</span>
                  </motion.p>
                )}
              </div>
              
              <div className="mt-8 flex gap-3">
                <motion.button 
                  onClick={handleVerifyCode} 
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  whileTap={{ scale: 0.95 }}
                  disabled={!code.trim()}
                >
                  Verifikasi
                </motion.button>
                <motion.button 
                  onClick={() => {
                    setShowCodeModal(false);
                    setCode('');
                    setCodeError('');
                  }} 
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 font-bold py-4 px-6 rounded-2xl transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                >
                  Batal
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}</AnimatePresence>

{/* Lightbox sederhana tanpa navigasi slide */}
      
    <Lightbox 
        open={index >= 0} 
        close={() => {
          setIndex(-1);
          setCurrentPhotoId(null);
        }}
        slides={lightboxPhotos.map(photo => ({ 
          src: photo.file_url,
          alt: `Foto acara ${event?.name}`
        }))} 
        index={index}
        on={{
          view: ({ index: currentIndex }) => {
            const currentPhoto = lightboxPhotos[currentIndex];
            setCurrentPhotoId(currentPhoto?.id || null);
          }
        }}
        styles={{
          container: { 
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            backdropFilter: "blur(10px)"
          }
        }}
        render={{
          slide: ({ slide }) => {
            const currentPhoto = lightboxPhotos.find(p => p.file_url === slide.src);
            const isLiked = currentPhoto ? likedPhotos.has(currentPhoto.id) : false;
            
            return (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={slide.src} 
                  alt={slide.alt} 
                  className="max-w-full max-h-full object-contain"













































                />{/* Custom overlay controls */}
                <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-4">
                  <div className="flex items-center space-x-2 sm:space-x-4 backdrop-blur-xl bg-black/30 border border-white/20 rounded-2xl px-3 sm:px-6 py-2 sm:py-3">
                    {/* Like button */}
                    <motion.button
                      onClick={() => currentPhoto && handleLike(currentPhoto.id)}
                      disabled={isLiked}
                      className={`
                        flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300
                        ${isLiked 
                          ? 'bg-pink-500/30 cursor-default' 
                          : 'bg-white/10 hover:bg-white/20 active:scale-95 transform hover:scale-105'
                        }
                      `}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.svg 
                        className={`w-4 h-4 sm:w-6 sm:h-6 ${isLiked ? 'text-pink-400' : 'text-white'}`}
                        fill={isLiked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
                      </motion.svg>
                      <span className="text-white font-semibold text-sm sm:text-base">
                        {currentPhoto?.likes || 0}
                      </span>
                    </motion.button>

                    {/* Download button */}
                    <motion.button
                      onClick={() => currentPhoto && handleDownloadPhoto(currentPhoto.file_url, currentPhoto.id)}
                      className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      <span className="text-white font-semibold text-sm sm:text-base hidden sm:inline">Download</span>
                    </motion.button>
                  </div>
                </div>

                {/* Photo info overlay */}
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-50">
                  <div className="backdrop-blur-xl bg-black/30 border border-white/20 rounded-2xl px-3 sm:px-4 py-1 sm:py-2">
                    <p className="text-white text-xs sm:text-sm font-medium">
                      {lightboxPhotos.findIndex(p => p.id === currentPhoto?.id) + 1} / {lightboxPhotos.length}
                    </p>
                  </div>
                </div>









              </div>
            );
          }
        }}
      />

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])} 
        style={{ display: 'none' }} 
        accept="image/*"
        capture="environment"
      />{/* Message History Toast - hanya tampil di halaman galeri */}
      <AnimatePresence>
        {showMessageToast && activeTab !== 'guestbook' && messages.length > 0 && messages[messageHistoryIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 350,
              opacity: { duration: 0.3 }
            }}
            className="fixed bottom-4 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none max-w-xs sm:max-w-sm w-[90%]"
          >
            <div className="backdrop-blur-md bg-gradient-to-r from-purple-900/70 via-pink-900/70 to-purple-900/70 border border-white/10 rounded-2xl p-2 sm:p-3 shadow-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-500/90 to-pink-500/90 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xs">
                    {messages[messageHistoryIndex].sender_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h4 className="text-white font-semibold text-xs truncate">
                      {messages[messageHistoryIndex].sender_name}
                    </h4>
                    <div className="flex items-center gap-1 ml-1">
                      <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-gray-200 text-xs leading-relaxed line-clamp-2">
                    {messages[messageHistoryIndex].message_text}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-purple-300 text-xs opacity-75">
                      {new Date(messages[messageHistoryIndex].created_at).toLocaleDateString('id-ID', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <div className="w-12 h-1 bg-purple-900/30 rounded-full overflow-hidden">
                      <motion.div 
                        key={messageHistoryIndex}
                        className="h-full bg-gradient-to-r from-purple-400/80 to-pink-400/80 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 8, ease: "linear" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Container */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
      </motion.div>
    </> 
  );
};


export default EventPage;