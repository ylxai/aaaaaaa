import { Routes, Route } from 'react-router-dom';
import CreateEventForm from './components/CreateEventForm';
import EventPage from './pages/EventPage'; 
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute'; 
import DashboardPage from './pages/DashboardPage';
import AdminEventPage from './pages/AdminEventPage';
import { Toaster } from 'react-hot-toast';
function App() {
  return (
    <div className="App">
      <Toaster // <-- 2. Tambahkan komponen ini
        position="top-center"
        reverseOrder={false}
      />
      <Routes>
        {/* Rute untuk halaman acara publik (tidak dilindungi) */}
        <Route path="/event/:slug" element={<EventPage />} />

        {/* Rute untuk halaman login (tidak dilindungi) */}
        <Route path="/secret-admin-login" element={<LoginPage />} />

        {/* 2. Bungkus halaman admin dengan ProtectedRoute */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <CreateEventForm />
            </ProtectedRoute>
          } 
        />
        
        {/* Contoh jika nanti ada halaman dashboard */}
         <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        /> 
        <Route
    path="/admin/event/:slug"
    element={
      <ProtectedRoute>
        <AdminEventPage />
      </ProtectedRoute>
    }
  />
      </Routes>
    </div>
  );
}

export default App;