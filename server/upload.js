const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// 1. VERIFIKASI DENGAN CONSOLE.LOG
// Ini akan memastikan kita membaca nilai yang benar dari file .env
console.log("Supabase Endpoint dari .env:", process.env.SUPABASE_ENDPOINT);
console.log("Supabase Bucket dari .env:", process.env.SUPABASE_BUCKET_NAME);

// Konfigurasi S3 Client
const s3 = new S3Client({
  endpoint: process.env.SUPABASE_ENDPOINT,
  forcePathStyle: true, // <-- 2. TAMBAHKAN BARIS INI (SANGAT PENTING)
  region: 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.SUPABASE_ACCESS_KEY,
    secretAccessKey: process.env.SUPABASE_SECRET_KEY,
  },
});

// Konfigurasi multer untuk upload ke S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.SUPABASE_BUCKET_NAME,
    acl: 'public-read', 
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
      fileFilter: (req, file, cb) => {
    // Izinkan hanya file dengan tipe 'image'
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan!'), false);
    }
    }
    }
  })
});

module.exports = { upload, s3 };