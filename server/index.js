// --- BAGIAN IMPORT ---
require('dotenv').config();
const express = require('express');
const cors =require('cors');
const { nanoid } = require('nanoid');
const db = require('./db');
const http = require('http');
const { Server } = require("socket.io");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import dari file lokal
const { upload, s3 } = require('./upload');
const authMiddleware = require('./middleware/authMiddleware');
const guestAuthMiddleware = require('./middleware/guestAuthMiddleware');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
// 4. INISIALISASI SOCKET.IO DENGAN CORS
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Sesuaikan dengan port frontend Anda
    methods: ["GET", "POST", "DELETE"] // Tambahkan DELETE
  }
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Mengizinkan akses dari frontend
app.use(express.json()); // Membaca body request dalam format JSON

// --- LISTENER UNTUK NOTIFIKASI DATABASE ---
const listenToDatabase = () => {
  let client;

  const connectAndListen = async () => {
    try {
      // 1. Ambil koneksi klien baru
      client = await db.pool.connect();
      
      // 2. Daftarkan semua channel yang ingin didengar
      await client.query('LISTEN new_photo_event');
      await client.query('LISTEN deleted_photo_event');
      await client.query('LISTEN new_message_event');

      console.log('📡 Server berhasil terhubung dan mendengarkan notifikasi database.');

      // 3. Pasang listener untuk notifikasi
      client.on('notification', (msg) => {
        // ... (Logika untuk io.emit tidak berubah)
        try {
          const payload = JSON.parse(msg.payload);
          if (msg.channel === 'new_photo_event') {
            io.to(payload.slug).emit('new_photo', payload.photo);
          } else if (msg.channel === 'deleted_photo_event') {
            io.to(payload.slug).emit('photo_deleted', { id: payload.id });
          }
          else if (msg.channel === 'new_message_event') {
            io.to(payload.slug).emit('new_message', payload.message);
          }
        } catch (error) {
          console.error('Gagal memproses notifikasi:', error);
        }
      });

      // 4. Pasang listener jika koneksi ini terputus
      client.on('end', () => {
        console.error('🔌 Koneksi listener terputus. Mencoba menghubungkan kembali dalam 5 detik...');
        setTimeout(connectAndListen, 5000); // Coba hubungkan kembali setelah 5 detik
      });

      client.on('error', (err) => {
        console.error('❌ Koneksi listener error:', err.stack);
        // Event 'end' akan dipicu setelah ini, jadi reconnect akan ditangani di sana
      });

    } catch (err) {
      console.error('❌ Gagal terhubung sebagai listener, mencoba lagi dalam 5 detik...', err);
      if (client) {
        client.release(); // Lepaskan klien jika ada sebelum mencoba lagi
      }
      setTimeout(connectAndListen, 5000);
    }
  };

  // Mulai proses mendengarkan untuk pertama kali
  connectAndListen();
};

// Panggil fungsi utama untuk memulai listener
listenToDatabase();


// --- ENDPOINTS KHUSUS ADMIN ---

// 1. Mengambil semua event untuk ditampilkan di dashboard
app.get('/api/admin/events', authMiddleware, async (req, res) => {
  try {
    const query = 'SELECT id, name, slug, event_date FROM events ORDER BY event_date DESC';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error mengambil events untuk admin:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// 2. Endpoint upload khusus admin ke "Galeri Khusus"
app.post('/api/admin/events/:slug/upload', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { slug } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan.' });
    }

    const eventQuery = 'SELECT id FROM events WHERE slug = $1';
    const eventResult = await db.query(eventQuery, [slug]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Acara tidak ditemukan.' });
    }
    const eventId = eventResult.rows[0].id;
    
    // Buat URL dan paksa kategori menjadi 'official'
    const fileUrl = `https://qokjgasiffmjacbmgbqe.supabase.co/storage/v1/object/public/${process.env.SUPABASE_BUCKET_NAME}/${req.file.key}`;
    const category = 'official'; // Kategori dipaksa menjadi 'official'

    const photoQuery = 'INSERT INTO photos (event_id, file_url, category) VALUES ($1, $2, $3) RETURNING *';
    const newPhoto = await db.query(photoQuery, [eventId, fileUrl, category]);
    
    
    
    res.status(201).json(newPhoto.rows[0]);
  } catch (error) {
    console.error('Error saat admin upload foto:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});


// ...

// --- ENDPOINT UNTUK MENGHAPUS FOTO (MODERASI ADMIN) ---
app.delete('/api/photos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Ambil info foto dari database untuk mendapatkan URL file dan slug event
    const photoQuery = 'SELECT p.file_url, e.slug FROM photos p JOIN events e ON p.event_id = e.id WHERE p.id = $1';
    const photoResult = await db.query(photoQuery, [id]);

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto tidak ditemukan.' });
    }

    const photo = photoResult.rows[0];
    const fileUrl = photo.file_url;
    const eventSlug = photo.slug;
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);

    // 2. Hapus file dari Supabase Storage (S3)
    const deleteParams = {
      Bucket: process.env.SUPABASE_BUCKET_NAME,
      Key: fileName,
    };
    await s3.send(new DeleteObjectCommand(deleteParams));

    // 3. Hapus catatan foto dari database
    await db.query('DELETE FROM photos WHERE id = $1', [id]);

    

    res.status(200).json({ message: 'Foto berhasil dihapus.' });
  } catch (error) {
    console.error('Error saat menghapus foto:', error);
    res.status(500).json({ error: 'Gagal menghapus foto.' });
  }
});

// --- ENDPOINT UNTUK LOGIN ADMIN ---
// Method: POST, Route: /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    // 1. Ambil username dan password dari body request
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    // 2. Cari admin di database berdasarkan username
    const query = 'SELECT * FROM admins WHERE username = $1';
    const result = await db.query(query, [username]);

    if (result.rows.length === 0) {
      // Username tidak ditemukan
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const admin = result.rows[0];

    // 3. Bandingkan password yang diberikan dengan hash di database
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      // Password salah
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    // 4. Jika password valid, buat JSON Web Token (JWT)
    const token = jwt.sign(
      { id: admin.id, username: admin.username }, // Payload token
      process.env.JWT_SECRET, // Kunci rahasia dari .env
      { expiresIn: '1d' } // Token akan kedaluwarsa dalam 1 hari
    );

    // 5. Kirim token ke klien
    res.json({ message: 'Login berhasil!', token });

  } catch (error) {
    console.error('Error saat login:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// --- ENDPOINT UNTUK MEMBUAT EVENT BARU ---
// Method: POST, Route: /api/events
app.post('/api/events', authMiddleware, async (req, res) => {
  try {
    // 1. Ambil nama dan tanggal acara dari body request
    const { name, event_date } = req.body;

    // 2. Validasi input: pastikan tidak ada yang kosong
    if (!name || !event_date) {
      return res.status(400).json({ error: 'Nama dan tanggal acara wajib diisi.' });
    }

    // 3. Buat slug unik untuk URL
    const slug = nanoid(10); // contoh: 'aB3xZ7yP9q'
    const uploadCode = Math.floor(100000 + Math.random() * 900000).toString();
    // 4. Siapkan dan jalankan query SQL untuk menyimpan ke database
    const query = `
      INSERT INTO events (name, event_date, slug, upload_code)
      VALUES ($1, $2, $3, $4)
      RETURNING *; 
    `;
    // RETURNING * akan mengembalikan data yang baru saja disimpan

    const newEvent = await db.query(query, [name, event_date, slug, uploadCode]);

    // 5. Kirim kembali data acara yang baru dibuat sebagai konfirmasi
    res.status(201).json(newEvent.rows[0]);

  } catch (error) {
    console.error('Error saat membuat event:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// --- ENDPOINT UNTUK MENGAMBIL SATU EVENT BERDASARKAN SLUG ---
// Method: GET, Route: /api/events/:slug
app.get('/api/events/:slug', async (req, res) => {
  try {
    // 1. Ambil slug dari parameter URL
    const { slug } = req.params;

    // 2. Cari event di database berdasarkan slug
    const query = 'SELECT id, name, event_date, slug, cover_photo_url FROM events WHERE slug = $1';
    const result = await db.query(query, [slug]);

    // 3. Jika tidak ditemukan, kirim error 404
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acara tidak ditemukan.' });
    }

    // 4. Jika ditemukan, kirim datanya
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error saat mengambil event:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// --- ENDPOINT UNTUK VERIFIKASI KODE UPLOAD TAMU ---
app.post('/api/events/:slug/verify-code', async (req, res) => {
  try {
    const { slug } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Kode wajib diisi.' });
    }

    const query = 'SELECT upload_code FROM events WHERE slug = $1';
    const result = await db.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acara tidak ditemukan.' });
    }

    const correctCode = result.rows[0].upload_code;

    if (code !== correctCode) {
      return res.status(401).json({ error: 'Kode salah.' });
    }

    // Jika kode benar, buat token sementara (Guest Token) yang hanya berlaku 1 hari
    const guestToken = jwt.sign(
      { slug: slug, authorized: true }, // Payload
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ message: 'Verifikasi berhasil!', guestToken });

  } catch (error) {
    console.error('Error saat verifikasi kode:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// --- 3. ENDPOINT BARU UNTUK UPLOAD FOTO ---
// Method: POST, Route: /api/events/:slug/upload
app.post('/api/events/:slug/upload', guestAuthMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { category = 'guest' } = req.body;

    // Cek apakah file berhasil di-upload
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan.' });
    }

    // Cari event_id berdasarkan slug
    const eventQuery = 'SELECT id FROM events WHERE slug = $1';
    const eventResult = await db.query(eventQuery, [slug]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Acara tidak ditemukan.' });
    }
    const eventId = eventResult.rows[0].id;

    // Ambil URL publik dari hasil upload multer-s3
    const fileUrl = `https://qokjgasiffmjacbmgbqe.supabase.co/storage/v1/object/public/${process.env.SUPABASE_BUCKET_NAME}/${req.file.key}`;
    // Simpan informasi file ke database
    // Simpan URL S3 ke database
    const photoQuery = 'INSERT INTO photos (event_id, file_url, category) VALUES ($1, $2, $3) RETURNING *';
const newPhoto = await db.query(photoQuery, [eventId, fileUrl, category]);
    
    res.status(201).json(newPhoto.rows[0]);

  } catch (error) {
    console.error('Error saat upload foto:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// --- ENDPOINT UNTUK MENGAMBIL SEMUA FOTO DARI SEBUAH EVENT ---
// Method: GET, Route: /api/events/:slug/photos
app.get('/api/events/:slug/photos', async (req, res) => {
  try {
    const { slug } = req.params;

    // 1. Dapatkan event_id dari slug
    const eventQuery = 'SELECT id FROM events WHERE slug = $1';
    const eventResult = await db.query(eventQuery, [slug]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Acara tidak ditemukan.' });
    }
    const eventId = eventResult.rows[0].id;

    // 2. Ambil semua foto yang berhubungan dengan event_id tersebut
    // Diurutkan dari yang terbaru
    const photosQuery = 'SELECT id, file_url, likes, category, uploaded_at FROM photos WHERE event_id = $1 ORDER BY uploaded_at DESC';
    const photosResult = await db.query(photosQuery, [eventId]);

    // 3. Kirim hasilnya
    res.json(photosResult.rows);

  } catch (error) {
    console.error('Error saat mengambil foto:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// Method: POST, Route: /api/photos/:id/like
app.post('/api/photos/:id/like', async (req, res) => {
  try {
    const { id } = req.params; // Mengambil ID foto dari URL
    const slugQuery = 'SELECT e.slug FROM events e JOIN photos p ON e.id = p.event_id WHERE p.id = $1';
    const slugResult = await db.query(slugQuery, [id]);
    if (slugResult.rows.length === 0) {
      return res.status(404).json({ error: 'Acara untuk foto ini tidak ditemukan.' });
    }
    const eventSlug = slugResult.rows[0].slug;
    const query = 'UPDATE photos SET likes = likes + 1 WHERE id = $1 RETURNING id, likes';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Foto tidak ditemukan.' });
    }
    console.log(`🚀 SOCKET: Mengirim 'photo_liked' ke room ${eventSlug} dengan data:`, result.rows[0]);

    io.to(eventSlug).emit('photo_liked', result.rows[0]);
    res.json(result.rows[0]);
    

  } catch (error) {
    console.error('Error saat menambah like:', error);
      res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  
}
});

// --- ENDPOINTS UNTUK BUKU TAMU ---

// Mengambil semua pesan untuk sebuah acara
app.get('/api/events/:slug/messages', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await db.query(
      `SELECT m.* FROM messages m JOIN events e ON m.event_id = e.id 
       WHERE e.slug = $1 ORDER BY m.created_at ASC`,
      [slug]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat pesan.' });
  }
});

// Mengirim pesan baru
app.post('/api/events/:slug/messages', async (req, res) => {
  try {
    const { slug } = req.params;
    const { sender_name, message_text } = req.body;

    if (!sender_name || !message_text) {
      return res.status(400).json({ error: 'Nama dan pesan tidak boleh kosong.' });
    }

    const eventResult = await db.query('SELECT id FROM events WHERE slug = $1', [slug]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Acara tidak ditemukan.' });
    }
    const eventId = eventResult.rows[0].id;

    const messageQuery = 'INSERT INTO messages (event_id, sender_name, message_text) VALUES ($1, $2, $3) RETURNING *';
    const newMessage = await db.query(messageQuery, [eventId, sender_name, message_text]);

    // Kita akan andalkan notifikasi dari database, jadi baris io.emit di sini tidak perlu
    res.status(201).json(newMessage.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengirim pesan.' });
  }
});

// --- LOGIKA KONEKSI SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('🔌 Seorang pengguna terhubung:', socket.id);

  socket.on('join_event', (slug) => {
    socket.join(slug);
    console.log(`Pengguna ${socket.id} bergabung ke room ${slug}`);
  });

  socket.on('disconnect', () => {
    console.log('🚫 Seorang pengguna terputus:', socket.id);
  });
});


// 5. UBAH app.listen MENJADI server.listen
server.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});