const bcrypt = require('bcrypt');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

// Jumlah 'salt rounds' untuk enkripsi. 10 sudah cukup aman.
const saltRounds = 10;

console.log("--- Skrip Pembuatan Admin ---");

readline.question('Masukkan username admin Anda: ', (username) => {
  readline.question('Masukkan password admin Anda: ', async (password) => {
    try {
      console.log("\nEnkripsi password...");
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      console.log("\n✅ Berhasil! Salin dan jalankan perintah SQL berikut di Supabase SQL Editor Anda:");
      console.log("------------------------------------------------------------------");
      console.log(
        `INSERT INTO admins (username, password_hash) VALUES ('${username}', '${hashedPassword}');`
      );
      console.log("------------------------------------------------------------------");

    } catch (error) {
      console.error("Gagal membuat hash password:", error);
    } finally {
      readline.close();
    }
  });
});